import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, Any, List, Union, Optional
from langchain.chat_models import ChatGroq
from langchain.prompts import ChatPromptTemplate
import os
from dotenv import load_dotenv

load_dotenv()

class DataProcessor:
    """Class for processing and analyzing data"""
    
    def __init__(self):
        self.llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model_name="mixtral-8x7b-32768"
        )
    
    def get_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate a summary of the DataFrame"""
        summary = {
            "shape": df.shape,
            "columns": df.columns.tolist(),
            "dtypes": df.dtypes.to_dict(),
            "missing_values": df.isnull().sum().to_dict(),
            "numeric_summary": df.describe().to_dict() if not df.empty else {},
            "categorical_summary": {
                col: df[col].value_counts().to_dict()
                for col in df.select_dtypes(include=['object', 'category']).columns
            } if not df.empty else {}
        }
        return summary
    
    def generate_insights(self, df: pd.DataFrame, query: Optional[str] = None) -> str:
        """Generate insights using LLM"""
        summary = self.get_summary(df)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a data analyst. Analyze the following data summary and provide key insights."),
            ("user", """
            Data Summary:
            {summary}
            
            User Query (if any):
            {query}
            
            Please provide key insights and observations about this data.
            """)
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({
            "summary": str(summary),
            "query": query or "No specific query provided"
        })
        
        return response.content
    
    def create_visualization(
        self,
        df: pd.DataFrame,
        viz_type: str,
        x: Optional[str] = None,
        y: Optional[str] = None,
        **kwargs
    ) -> Union[go.Figure, plt.Figure]:
        """Create various types of visualizations"""
        
        if viz_type == "scatter":
            fig = px.scatter(df, x=x, y=y, **kwargs)
        elif viz_type == "line":
            fig = px.line(df, x=x, y=y, **kwargs)
        elif viz_type == "bar":
            fig = px.bar(df, x=x, y=y, **kwargs)
        elif viz_type == "histogram":
            fig = px.histogram(df, x=x, **kwargs)
        elif viz_type == "box":
            fig = px.box(df, x=x, y=y, **kwargs)
        elif viz_type == "heatmap":
            plt.figure(figsize=(10, 8))
            fig = sns.heatmap(df.corr(), annot=True, cmap='coolwarm')
        else:
            raise ValueError(f"Unsupported visualization type: {viz_type}")
        
        return fig
    
    def save_visualization(
        self,
        fig: Union[go.Figure, plt.Figure],
        filename: str,
        format: str = "png"
    ):
        """Save visualization to file"""
        if isinstance(fig, go.Figure):
            fig.write_image(f"{filename}.{format}")
        else:
            fig.figure.savefig(f"{filename}.{format}")
            plt.close(fig)
    
    def process_data(
        self,
        df: pd.DataFrame,
        operations: List[Dict[str, Any]]
    ) -> pd.DataFrame:
        """Apply a series of data processing operations"""
        result_df = df.copy()
        
        for op in operations:
            op_type = op.get("type")
            params = op.get("params", {})
            
            if op_type == "filter":
                result_df = result_df.query(params.get("query"))
            elif op_type == "groupby":
                result_df = result_df.groupby(params.get("by")).agg(params.get("agg"))
            elif op_type == "sort":
                result_df = result_df.sort_values(
                    by=params.get("by"),
                    ascending=params.get("ascending", True)
                )
            elif op_type == "drop_duplicates":
                result_df = result_df.drop_duplicates(**params)
            elif op_type == "fillna":
                result_df = result_df.fillna(params.get("value"))
            else:
                raise ValueError(f"Unsupported operation type: {op_type}")
        
        return result_df 