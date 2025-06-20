from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
import os
from pathlib import Path
import sys
import traceback
import logging
from datetime import datetime

# Add the backend directory to the Python path
backend_dir = str(Path(__file__).parent)
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from db.models import get_engine, init_db, Base
from db.dynamic_models import DynamicTableManager
from llm.query_generator import QueryGenerator
from processors.data_processor import DataProcessor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Debug: Print environment variables
print("Environment Variables:")
print(f"GROQ_API_KEY exists: {'GROQ_API_KEY' in os.environ}")
print(f"GROQ_API_KEY length: {len(os.getenv('GROQ_API_KEY', ''))}")

app = FastAPI(title="AI Data Analytics Chatbot")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and managers
engine = init_db(os.getenv("DATABASE_URL", "sqlite:///./data.db"))
table_manager = DynamicTableManager(os.getenv("DATABASE_URL", "sqlite:///./data.db"))
query_generator = QueryGenerator()
data_processor = DataProcessor()

logger = logging.getLogger(__name__)

class ChatMessage(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None

class ChatResponse(BaseModel):
    query: str
    explanation: str
    summary: Optional[str] = ""
    data: List[Dict[str, Any]]
    type: Optional[str] = None

class DatasetInfo(BaseModel):
    columns: List[Dict[str, str]]
    row_count: int
    created_at: datetime

@app.on_event("startup")
async def startup_event():
    try:
        # Initialize database
        Base.metadata.create_all(engine)
        # Create initial tables if they don't exist
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS current_dataset (
                    id INTEGER PRIMARY KEY AUTOINCREMENT
                )
            """))
            conn.commit()
        logger.info("Database initialized on startup")
    except Exception as e:
        logger.error(f"Error initializing database on startup: {str(e)}")
        raise

@app.get("/")
@app.get("/api")
async def root():
    return {
        "status": "healthy",
        "message": "Quant - Query API is running",
        "version": "1.0.0"
    }

@app.post("/upload", response_model=DatasetInfo)
async def upload_dataset_direct(
    file: UploadFile = File(...)
):
    return await upload_dataset(file)

@app.post("/api/upload", response_model=DatasetInfo)
async def upload_dataset(
    file: UploadFile = File(...)
):
    try:
        # Read file based on extension
        if file.filename.endswith('.csv'):
            try:
                df = pd.read_csv(file.file)
            except UnicodeDecodeError:
                file.file.seek(0)
                df = pd.read_csv(file.file, encoding='latin1')
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file.file)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel files.")

        # Clean column names
        df.columns = [str(col).strip().lower().replace(' ', '_').replace('-', '_') for col in df.columns]
        
        # Reset database and insert new data
        try:
            table_manager.reset_database()
            table_manager.insert_dataframe(df, "current_dataset")  # Use a fixed table name
        except Exception as db_error:
            error_detail = f"Database error: {str(db_error)}\nTraceback:\n{traceback.format_exc()}"
            logger.error(error_detail)
            raise HTTPException(status_code=500, detail="Failed to initialize database with new dataset")
        
        # Get table schema
        schema = table_manager.get_table_schema("current_dataset")
        
        return DatasetInfo(
            columns=schema['columns'],
            row_count=len(df),
            created_at=datetime.utcnow()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        error_detail = f"Error uploading file: {str(e)}\nTraceback:\n{traceback.format_exc()}"
        logger.error(error_detail)
        raise HTTPException(status_code=500, detail=error_detail)
    finally:
        file.file.close()

@app.get("/api/dataset", response_model=DatasetInfo)
async def get_current_dataset():
    try:
        tables = table_manager.list_tables()
        if not tables or "current_dataset" not in tables:
            raise HTTPException(status_code=404, detail="No dataset available. Please upload a dataset first.")
            
        schema = table_manager.get_table_schema("current_dataset")
        sample_data = table_manager.get_table_data("current_dataset", limit=1)
        row_count = len(sample_data) if sample_data else 0
        
        return DatasetInfo(
            columns=schema['columns'],
            row_count=row_count,
            created_at=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        error_detail = f"Error getting dataset info: {str(e)}"
        logger.error(error_detail)
        raise HTTPException(status_code=500, detail=error_detail)

@app.post("/api/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    try:
        # Check for greetings and special cases first
        if message.message.lower() in ['hi', 'hello', 'hey', 'greetings']:
            return ChatResponse(
                query="SELECT 'greeting' as type",
                explanation="Hello! I'm Quant - Query - Intelligent Analytics Assistant. I can help you analyze your data.",
                summary="Greeting message",
                data=[],
                type="greeting"
            )

        # Check if dataset exists for data analysis questions
        if not table_manager.list_tables() or "current_dataset" not in table_manager.list_tables():
            return ChatResponse(
                query="SELECT 'no_dataset' as type",
                explanation="I don't see any dataset available. Please upload a dataset first, and then I'll be happy to help you analyze it!",
                summary="No dataset available",
                data=[],
                type="no_dataset"
            )
            
        # Get table schema
        table_schema = table_manager.get_table_schema("current_dataset")
        logger.info(f"Table schema passed to LLM: {json.dumps(table_schema, indent=2)}")
        
        # Generate SQL query from natural language, passing history
        sql_query = query_generator.generate_query(
            message.message,
            table_name="current_dataset",
            table_schema=table_schema,
            history=message.history
        )
        logger.info(f"LLM raw response: {sql_query}")
        logger.info(f"Generated SQL Query: {sql_query.query}")
        
        # Handle special response types without executing SQL
        special_types = [
            ("SELECT 'greeting'", "greeting"),
            ("SELECT 'help'", "help"),
            ("SELECT 'out_of_scope'", "out_of_scope"),
            ("SELECT 'knowledge_base'", "knowledge_base"),
            ("SELECT 'general_knowledge'", "general_knowledge"),
            ("SELECT 'operation'", "operation"),
            ("SELECT 'dataset_summary'", "dataset_summary")
        ]
        for prefix, resp_type in special_types:
            if sql_query.query.startswith(prefix):
                if resp_type == "dataset_summary":
                    # Load the entire dataset
                    with Session(engine) as session:
                        result = session.execute(text('SELECT * FROM "current_dataset"'))
                        data = list(result.mappings())
                    df = pd.DataFrame(data)
                    
                    # Generate insights
                    insights = data_processor.generate_insights(df)
                    
                    return ChatResponse(
                        query=sql_query.query,
                        explanation=insights,
                        summary="Here is a summary of the dataset:",
                        data=[],
                        type="dataset_summary"
                    )
                
                return ChatResponse(
                    query=sql_query.query,
                    explanation=sql_query.explanation,
                    summary=sql_query.summary,
                    data=[],
                    type=resp_type
                )
        # Additional check: If query is empty or not a SELECT, treat as special response
        if not sql_query.query or not sql_query.query.strip().lower().startswith('select'):
            return ChatResponse(
                query=sql_query.query,
                explanation=sql_query.explanation or "I'm sorry, I couldn't generate a valid SQL query for your request.",
                summary=sql_query.summary or "",
                data=[],
                type="invalid_query"
            )
        
        # Execute query for regular data analysis questions
        with Session(engine) as session:
            try:
                result = session.execute(text(sql_query.query))
                data = list(result.mappings())
            except Exception as e:
                if "no such column: summary" in str(e):
                    # Fallback to dataset summary
                    df = pd.DataFrame(table_manager.get_table_data("current_dataset"))
                    insights = data_processor.generate_insights(df)
                    return ChatResponse(
                        query=sql_query.query,
                        explanation=insights,
                        summary="Here is a summary of the dataset:",
                        data=[],
                        type="dataset_summary"
                    )
                else:
                    raise
        
        # Convert to pandas for easier data manipulation
        df = pd.DataFrame(data)
        logger.info(f"DataFrame columns: {df.columns.tolist()}")
        
        return ChatResponse(
            query=sql_query.query,
            explanation=sql_query.explanation,
            summary=sql_query.summary,
            data=json.loads(df.to_json(orient="records")),
            type="data_analysis"
        )
    except Exception as e:
        error_detail = f"Error: {str(e)}\nTraceback:\n{traceback.format_exc()}"
        logger.error(error_detail)
        raise HTTPException(status_code=500, detail=error_detail)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/reset")
async def reset_database():
    try:
        table_manager.reset_database()
        return {"status": "success", "message": "Database reset successfully"}
    except Exception as e:
        error_detail = f"Error resetting database: {str(e)}"
        logger.error(error_detail)
        raise HTTPException(status_code=500, detail=error_detail)

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Get port from environment variable or default to 8000
    port = int(os.getenv("PORT", 8000))
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        reload_dirs=["backend"],  # Only watch the backend directory
        reload_excludes=["**/node_modules/**"]  # Exclude node_modules
    ) 