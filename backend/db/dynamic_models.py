from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Float, DateTime, Boolean, JSON, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import pandas as pd
from datetime import datetime
import json
import os
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

Base = declarative_base()

class DynamicTableManager:
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        self.metadata = MetaData()
        self.Session = sessionmaker(bind=self.engine)
        
    def reset_database(self) -> None:
        """Reset the database by dropping all existing tables."""
        with self.engine.connect() as conn:
            # Get list of all tables
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in result]
            
            # Drop each table
            for table in tables:
                if table != 'sqlite_sequence':  # Skip SQLite's internal sequence table
                    conn.execute(text(f'DROP TABLE IF EXISTS "{table}"'))
            conn.commit()
            
            # Reset SQLite sequence if it exists
            if 'sqlite_sequence' in tables:
                conn.execute(text("DELETE FROM sqlite_sequence"))
                conn.commit()
        
        # Refresh metadata
        self.metadata.clear()
        self.metadata.reflect(bind=self.engine)

    def _infer_column_type(self, dtype: str, sample_value: Any) -> str:
        """Infer SQLite column type from pandas dtype and sample value."""
        if pd.api.types.is_integer_dtype(dtype):
            return 'INTEGER'
        elif pd.api.types.is_float_dtype(dtype):
            return 'REAL'
        elif pd.api.types.is_datetime64_dtype(dtype):
            return 'DATETIME'
        elif pd.api.types.is_bool_dtype(dtype):
            return 'BOOLEAN'
        elif pd.api.types.is_object_dtype(dtype):
            # Check if it's a JSON string
            if isinstance(sample_value, (dict, list)):
                return 'JSON'
            return 'TEXT'
        else:
            return 'TEXT'  # Default to TEXT for unknown types

    def create_table_from_dataframe(self, df: pd.DataFrame, table_name: str) -> Table:
        """Create a new table based on DataFrame structure."""
        # Clean table name (remove special characters, spaces, etc.)
        table_name = ''.join(c if c.isalnum() else '_' for c in table_name.lower())
        
        # Drop existing table if it exists
        with self.engine.connect() as conn:
            conn.execute(text(f'DROP TABLE IF EXISTS "{table_name}"'))
            conn.commit()
        
        # Create table using raw SQL
        columns = []
        for col_name, dtype in df.dtypes.items():
            sample_value = df[col_name].iloc[0] if not df[col_name].empty else None
            column_type = self._infer_column_type(dtype, sample_value)
            # Clean column name
            clean_col_name = ''.join(c if c.isalnum() else '_' for c in col_name.lower())
            columns.append(f'"{clean_col_name}" {column_type}')
        
        # Add id column as primary key
        create_table_sql = f"""
        CREATE TABLE "{table_name}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            {', '.join(columns)}
        )
        """
        
        with self.engine.connect() as conn:
            conn.execute(text(create_table_sql))
            conn.commit()
        
        # Return the table object
        return Table(table_name, self.metadata, autoload_with=self.engine)

    def insert_dataframe(self, df: pd.DataFrame, table_name: str) -> None:
        """Insert DataFrame data into the specified table."""
        # Reset the database before creating new table
        self.reset_database()
        
        # Clean column names
        df.columns = [''.join(c if c.isalnum() else '_' for c in col.lower()) for col in df.columns]
        
        # Create table
        table = self.create_table_from_dataframe(df, table_name)
        
        # Convert DataFrame to list of dictionaries
        records = df.to_dict(orient='records')
        
        # Insert data using raw SQL for better performance
        if records:
            columns = list(records[0].keys())
            placeholders = ', '.join([':{}'.format(i) for i in range(len(columns))])
            insert_sql = f"""
            INSERT INTO "{table_name}" ({', '.join(f'"{col}"' for col in columns)})
            VALUES ({placeholders})
            """
            
            with self.engine.connect() as conn:
                for record in records:
                    # Convert values to a dictionary with named parameters
                    params = {str(i): record[col] for i, col in enumerate(columns)}
                    conn.execute(text(insert_sql), params)
                conn.commit()

    def get_table_schema(self, table_name: str) -> Dict[str, Any]:
        """Get the schema of a table."""
        table = Table(table_name, self.metadata, autoload_with=self.engine)
        return {
            'columns': [{'name': col.name, 'type': str(col.type)} for col in table.columns],
            'primary_key': [col.name for col in table.primary_key.columns]
        }

    def list_tables(self) -> List[str]:
        """List all tables in the database."""
        with self.engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            return [row[0] for row in result]

    def get_table_data(self, table_name: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get sample data from a table."""
        with self.engine.connect() as conn:
            result = conn.execute(text(f'SELECT * FROM "{table_name}" LIMIT {limit}'))
            columns = result.keys()
            return [dict(zip(columns, row)) for row in result] 