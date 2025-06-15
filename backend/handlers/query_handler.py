from typing import Dict, Any, Optional
from langchain.chat_models import ChatGroq
from langchain.prompts import ChatPromptTemplate
import os
from dotenv import load_dotenv
import json

load_dotenv()

class QueryHandler:
    """Handler for converting natural language to SQL queries"""
    
    def __init__(self):
        self.llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model_name="mixtral-8x7b-32768"
        )
        
        # Schema information for the sales database
        self.schema_info = """
        Database Schema:
        - sales table:
            - customer_id (INTEGER): Unique identifier for customers
            - transaction_date (DATE): Date of the transaction
            - amount (DECIMAL): Transaction amount
            - state (TEXT): State where the transaction occurred
            - product_id (INTEGER): Product identifier
            - quantity (INTEGER): Quantity purchased
        """
        
        # Common analysis patterns and suggestions
        self.common_analyses = {
            "customer_analysis": [
                "Which customers have the highest total purchase amount?",
                "What is the average purchase amount per customer?",
                "How many unique customers made purchases in each month?",
                "Which customers have the most frequent purchases?",
                "What is the customer retention rate over time?"
            ],
            "sales_analysis": [
                "What is the total sales amount by month?",
                "Which products have the highest sales volume?",
                "What is the average transaction amount?",
                "How do sales vary by state?",
                "What is the sales trend over time?"
            ],
            "product_analysis": [
                "Which products are most frequently purchased together?",
                "What is the average quantity sold per product?",
                "Which products have the highest revenue?",
                "What is the product sales distribution by state?",
                "How does product performance vary by season?"
            ]
        }
    
    def convert_to_sql(self, question: str) -> str:
        """Convert natural language question to SQL query"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a SQL expert. Convert the given question into a SQL query.
            Use the following schema information:
            {schema_info}
            
            Rules:
            1. Always use proper SQL syntax
            2. Use appropriate aggregations (SUM, COUNT, etc.)
            3. Include ORDER BY and LIMIT when needed
            4. Return only the SQL query without any explanation
            """),
            ("user", "Question: {question}\n\nSQL Query:")
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({
            "schema_info": self.schema_info,
            "question": question
        })
        
        # Extract just the SQL query from the response
        sql_query = response.content.strip()
        if sql_query.startswith("```sql"):
            sql_query = sql_query[6:]
        if sql_query.endswith("```"):
            sql_query = sql_query[:-3]
        
        return sql_query.strip()
    
    def generate_suggestions(self, question: str) -> Dict[str, Any]:
        """Generate relevant suggestions based on the question and schema"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert data analyst. Given a question and available schema, 
            determine which category of analysis it belongs to and suggest relevant questions.
            Categories: customer_analysis, sales_analysis, product_analysis
            Return a JSON with:
            1. category: the most relevant category
            2. explanation: why the question might be out of scope
            3. suggestions: list of 3 most relevant questions from that category
            """),
            ("user", """Question: {question}
            Schema: {schema_info}
            Common Analyses: {common_analyses}
            """)
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({
            "question": question,
            "schema_info": self.schema_info,
            "common_analyses": json.dumps(self.common_analyses)
        })
        
        try:
            return json.loads(response.content)
        except:
            # Fallback to default suggestions if parsing fails
            return {
                "category": "customer_analysis",
                "explanation": "The question might be too specific or unclear. Here are some alternative questions you might be interested in:",
                "suggestions": self.common_analyses["customer_analysis"][:3]
            }

    def process_question(
        self,
        question: str,
        db_handler: Any
    ) -> Dict[str, Any]:
        """Process a natural language question and return results"""
        
        try:
            # Convert question to SQL
            sql_query = self.convert_to_sql(question)
            
            # Execute query
            df = db_handler.execute_query(sql_query)
            
            # Format the results
            if len(df) == 1 and len(df.columns) == 1:
                # Single value result
                result = df.iloc[0, 0]
                return {
                    "question": question,
                    "sql_query": sql_query,
                    "result": result,
                    "raw_data": df.to_dict(orient="records")
                }
            else:
                # Multiple rows or columns
                return {
                    "question": question,
                    "sql_query": sql_query,
                    "result": df.to_dict(orient="records"),
                    "raw_data": df.to_dict(orient="records")
                }
                
        except Exception as e:
            # Generate suggestions for out-of-scope questions
            suggestions = self.generate_suggestions(question)
            return {
                "status": "out_of_scope",
                "question": question,
                "explanation": suggestions["explanation"],
                "category": suggestions["category"],
                "suggestions": suggestions["suggestions"]
            } 