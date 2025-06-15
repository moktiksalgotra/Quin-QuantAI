from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from typing import Dict, Any, Optional
import os
from pathlib import Path
import json

from handlers.file_handler import FileHandlerFactory
from handlers.db_handler import DBHandlerFactory
from handlers.query_handler import QueryHandler
from processors.data_processor import DataProcessor

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Create visualizations directory if it doesn't exist
VISUALIZATIONS_DIR = Path("visualizations")
VISUALIZATIONS_DIR.mkdir(exist_ok=True)

# Initialize handlers and processors
data_processor = DataProcessor()
query_handler = QueryHandler()

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Handle file upload and process it"""
    try:
        # Save the uploaded file
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Process the file using appropriate handler
        df = FileHandlerFactory.process_file(str(file_path))
        
        # Generate initial summary
        summary = data_processor.get_summary(df)
        
        return {
            "status": "success",
            "message": "File processed successfully",
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        # Clean up the uploaded file
        if file_path.exists():
            os.remove(file_path)

@app.post("/connect-db")
async def connect_database(
    db_type: str,
    connection_string: str
) -> Dict[str, Any]:
    """Connect to a database"""
    try:
        db_handler = DBHandlerFactory.create_connection(db_type, connection_string)
        return {
            "status": "success",
            "message": f"Successfully connected to {db_type} database"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/query")
async def execute_query(
    db_type: str,
    connection_string: str,
    query: str
) -> Dict[str, Any]:
    """Execute a database query"""
    try:
        db_handler = DBHandlerFactory.create_connection(db_type, connection_string)
        df = db_handler.execute_query(query)
        
        # Generate summary and insights
        summary = data_processor.get_summary(df)
        insights = data_processor.generate_insights(df)
        
        return {
            "status": "success",
            "data": df.to_dict(orient="records"),
            "summary": summary,
            "insights": insights
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/visualize")
async def create_visualization(
    data: Dict[str, Any],
    viz_type: str,
    x: Optional[str] = None,
    y: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create a visualization"""
    try:
        df = pd.DataFrame(data)
        fig = data_processor.create_visualization(df, viz_type, x, y, **kwargs)
        
        # Save the visualization
        filename = f"visualizations/{viz_type}_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}"
        data_processor.save_visualization(fig, filename)
        
        return {
            "status": "success",
            "message": "Visualization created successfully",
            "filename": f"{filename}.png"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/process")
async def process_data(
    data: Dict[str, Any],
    operations: Dict[str, Any]
) -> Dict[str, Any]:
    """Process data with specified operations"""
    try:
        df = pd.DataFrame(data)
        result_df = data_processor.process_data(df, operations)
        
        # Generate new summary and insights
        summary = data_processor.get_summary(result_df)
        insights = data_processor.generate_insights(result_df)
        
        return {
            "status": "success",
            "data": result_df.to_dict(orient="records"),
            "summary": summary,
            "insights": insights
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/ask")
async def ask_question(
    question: str,
    db_type: str = "sqlite",
    connection_string: str = "sales.db"
) -> Dict[str, Any]:
    """Process a natural language question about the data"""
    try:
        # Connect to database
        db_handler = DBHandlerFactory.create_connection(db_type, connection_string)
        
        # Process the question
        result = query_handler.process_question(question, db_handler)
        
        # Generate insights if needed
        if isinstance(result["result"], list):
            df = pd.DataFrame(result["raw_data"])
            insights = data_processor.generate_insights(df, question)
            result["insights"] = insights
        
        return {
            "status": "success",
            "question": question,
            "sql_query": result["sql_query"],
            "result": result["result"],
            "insights": result.get("insights")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 