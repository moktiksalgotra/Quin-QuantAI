from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from langchain.chat_models.groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
import os
from dotenv import load_dotenv
import re
import logging

load_dotenv()
logger = logging.getLogger(__name__)

class NaturalLanguageProcessor:
    """Process natural language queries about any dataset"""
    
    def __init__(self):
        self.llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model_name="mixtral-8x7b-32768"
        )
        
        # Common patterns for identifying query types
        self.query_patterns = {
            'category_analysis': [
                r'which.*(?:category|city|state|region|location).*(?:highest|most|top|best)',
                r'what.*(?:category|city|state|region|location).*(?:highest|most|top|best)',
                r'(?:highest|most|top|best).*(?:category|city|state|region|location)',
                r'(?:category|city|state|region|location).*(?:performance|sales|revenue)',
                r'show.*top.*(?:category|city|state|region|location)',
                r'list.*top.*(?:category|city|state|region|location)'
            ],
            'product_analysis': [
                r'which.*product.*highest',
                r'what.*product.*most',
                r'best.*product',
                r'top.*product',
                r'product.*performance',
                r'product.*volume'
            ],
            'customer_analysis': [
                r'which.*customer.*most',
                r'what.*customer.*highest',
                r'best.*customer',
                r'top.*customer',
                r'customer.*purchase',
                r'customer.*frequent'
            ],
            'time_analysis': [
                r'trend',
                r'over time',
                r'by month',
                r'by year',
                r'by date',
                r'period'
            ]
        }
        
        # Common column patterns to identify relevant columns
        self.column_patterns = {
            'category': [
                r'category',
                r'type',
                r'group',
                r'class',
                r'segment',
                r'city',
                r'state',
                r'region',
                r'location'
            ],
            'product': [
                r'product',
                r'item',
                r'sku',
                r'goods',
                r'merchandise'
            ],
            'customer': [
                r'customer',
                r'client',
                r'buyer',
                r'user',
                r'account'
            ],
            'sales': [
                r'sales',
                r'revenue',
                r'amount',
                r'value',
                r'price',
                r'cost'
            ],
            'quantity': [
                r'quantity',
                r'qty',
                r'volume',
                r'count',
                r'number',
                r'units'
            ],
            'date': [
                r'date',
                r'time',
                r'period',
                r'month',
                r'year',
                r'day'
            ]
        }
    
    def identify_query_type(self, question: str) -> str:
        """Identify the type of analysis needed based on the question"""
        question_lower = question.lower()
        
        for query_type, patterns in self.query_patterns.items():
            for pattern in patterns:
                if re.search(pattern, question_lower):
                    return query_type
        
        return 'general_analysis'
    
    def identify_relevant_columns(self, df: pd.DataFrame, query_type: str) -> Dict[str, str]:
        """Identify relevant columns based on query type and column patterns"""
        columns = df.columns.tolist()
        relevant_columns = {}
        
        # Map columns to their roles based on patterns
        for col in columns:
            col_lower = col.lower()
            
            # Check each column pattern category
            for category, patterns in self.column_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, col_lower):
                        if category not in relevant_columns:
                            relevant_columns[category] = col
                            break
        
        # For specific query types, ensure we have the right columns
        if query_type == 'category_analysis':
            if 'category' not in relevant_columns and 'sales' not in relevant_columns:
                # Try to infer category column from data
                for col in columns:
                    if df[col].nunique() < len(df) * 0.5:  # If column has relatively few unique values
                        relevant_columns['category'] = col
                        break
        
        elif query_type == 'product_analysis':
            if 'product' not in relevant_columns and 'quantity' not in relevant_columns:
                # Try to infer product column
                for col in columns:
                    if df[col].dtype == 'object' and df[col].nunique() > 1:
                        relevant_columns['product'] = col
                        break
        
        elif query_type == 'customer_analysis':
            if 'customer' not in relevant_columns:
                # Try to infer customer column
                for col in columns:
                    if df[col].dtype == 'object' and df[col].nunique() > 1:
                        relevant_columns['customer'] = col
                        break
        
        return relevant_columns
    
    def generate_analysis(self, df: pd.DataFrame, question: str) -> Dict[str, Any]:
        """Generate analysis based on the question and data"""
        query_type = self.identify_query_type(question)
        relevant_columns = self.identify_relevant_columns(df, query_type)
        
        result = {
            'query_type': query_type,
            'relevant_columns': relevant_columns,
            'analysis': None,
            'visualization_type': None
        }
        
        try:
            if query_type == 'category_analysis':
                if 'category' in relevant_columns and 'sales' in relevant_columns:
                    category_col = relevant_columns['category']
                    sales_col = relevant_columns['sales']
                    
                    # Calculate category performance
                    category_analysis = df.groupby(category_col)[sales_col].agg([
                        ('total_sales', 'sum'),
                        ('average_sales', 'mean'),
                        ('transaction_count', 'count')
                    ]).sort_values('total_sales', ascending=False)
                    
                    result['analysis'] = category_analysis.to_dict('records')
                    result['visualization_type'] = 'bar'
                    
            elif query_type == 'product_analysis':
                if 'product' in relevant_columns:
                    product_col = relevant_columns['product']
                    quantity_col = relevant_columns.get('quantity')
                    sales_col = relevant_columns.get('sales')
                    
                    # Calculate product performance
                    agg_dict = {'transaction_count': 'count'}
                    if quantity_col:
                        agg_dict['total_quantity'] = 'sum'
                    if sales_col:
                        agg_dict['total_sales'] = 'sum'
                    
                    product_analysis = df.groupby(product_col).agg(agg_dict)
                    if sales_col:
                        product_analysis = product_analysis.sort_values('total_sales', ascending=False)
                    elif quantity_col:
                        product_analysis = product_analysis.sort_values('total_quantity', ascending=False)
                    else:
                        product_analysis = product_analysis.sort_values('transaction_count', ascending=False)
                    
                    result['analysis'] = product_analysis.to_dict('records')
                    result['visualization_type'] = 'bar'
                    
            elif query_type == 'customer_analysis':
                if 'customer' in relevant_columns:
                    customer_col = relevant_columns['customer']
                    sales_col = relevant_columns.get('sales')
                    
                    # Calculate customer performance
                    agg_dict = {'transaction_count': 'count'}
                    if sales_col:
                        agg_dict['total_sales'] = 'sum'
                        agg_dict['average_sales'] = 'mean'
                    
                    customer_analysis = df.groupby(customer_col).agg(agg_dict)
                    if sales_col:
                        customer_analysis = customer_analysis.sort_values('total_sales', ascending=False)
                    else:
                        customer_analysis = customer_analysis.sort_values('transaction_count', ascending=False)
                    
                    result['analysis'] = customer_analysis.to_dict('records')
                    result['visualization_type'] = 'bar'
                    
            elif query_type == 'time_analysis':
                if 'date' in relevant_columns:
                    date_col = relevant_columns['date']
                    sales_col = relevant_columns.get('sales')
                    
                    # Ensure date column is datetime
                    df[date_col] = pd.to_datetime(df[date_col])
                    
                    # Calculate time-based analysis
                    time_analysis = df.set_index(date_col)
                    if sales_col:
                        time_analysis = time_analysis[sales_col].resample('M').sum()
                    else:
                        time_analysis = time_analysis.resample('M').size()
                    
                    result['analysis'] = time_analysis.to_dict()
                    result['visualization_type'] = 'line'
            
            # Generate insights using LLM
            if result['analysis']:
                result['insights'] = self._generate_insights(question, result)
            
        except Exception as e:
            logger.error(f"Error in analysis generation: {str(e)}")
            result['error'] = str(e)
        
        return result
    
    def _generate_insights(self, question: str, analysis_result: Dict[str, Any]) -> str:
        """Generate insights about the analysis using LLM"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a data analyst. Analyze the following data and provide key insights.
            Focus on answering the user's question and highlight the most important findings.
            Be concise but informative."""),
            ("user", """
            Question: {question}
            
            Analysis Type: {query_type}
            Relevant Columns: {columns}
            Analysis Results: {results}
            
            Please provide key insights about this data.
            """)
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({
            "question": question,
            "query_type": analysis_result['query_type'],
            "columns": str(analysis_result['relevant_columns']),
            "results": str(analysis_result['analysis'])
        })
        
        return response.content.strip() 