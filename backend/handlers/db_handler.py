from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from sqlalchemy import create_engine, Engine
from sqlalchemy.engine import URL
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

class DBHandler(ABC):
    """Abstract base class for database handlers"""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.engine: Optional[Engine] = None
    
    @abstractmethod
    def connect(self) -> Engine:
        """Create and return a database connection"""
        pass
    
    @abstractmethod
    def validate_connection(self) -> bool:
        """Validate if the connection is working"""
        pass
    
    def execute_query(self, query: str) -> pd.DataFrame:
        """Execute a SQL query and return results as DataFrame"""
        if not self.engine:
            self.engine = self.connect()
        return pd.read_sql(query, self.engine)
    
    def close(self):
        """Close the database connection"""
        if self.engine:
            self.engine.dispose()

class SQLiteHandler(DBHandler):
    def connect(self) -> Engine:
        self.engine = create_engine(f"sqlite:///{self.connection_string}")
        return self.engine
    
    def validate_connection(self) -> bool:
        try:
            engine = self.connect()
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            return True
        except Exception as e:
            print(f"SQLite connection error: {e}")
            return False

class PostgreSQLHandler(DBHandler):
    def connect(self) -> Engine:
        url = URL.create(
            drivername="postgresql",
            username=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            database=self.connection_string
        )
        self.engine = create_engine(url)
        return self.engine
    
    def validate_connection(self) -> bool:
        try:
            engine = self.connect()
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            return True
        except Exception as e:
            print(f"PostgreSQL connection error: {e}")
            return False

class MySQLHandler(DBHandler):
    def connect(self) -> Engine:
        url = URL.create(
            drivername="mysql+pymysql",
            username=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            database=self.connection_string
        )
        self.engine = create_engine(url)
        return self.engine
    
    def validate_connection(self) -> bool:
        try:
            engine = self.connect()
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            return True
        except Exception as e:
            print(f"MySQL connection error: {e}")
            return False

class DBHandlerFactory:
    """Factory class for creating appropriate database handlers"""
    
    _handlers = {
        'sqlite': SQLiteHandler,
        'postgresql': PostgreSQLHandler,
        'mysql': MySQLHandler
    }
    
    @classmethod
    def get_handler(cls, db_type: str, connection_string: str) -> DBHandler:
        """Get the appropriate handler for the database type"""
        handler_class = cls._handlers.get(db_type.lower())
        
        if not handler_class:
            raise ValueError(f"Unsupported database type: {db_type}")
        
        return handler_class(connection_string)
    
    @classmethod
    def create_connection(cls, db_type: str, connection_string: str) -> DBHandler:
        """Create and validate a database connection"""
        handler = cls.get_handler(db_type, connection_string)
        
        if not handler.validate_connection():
            raise ConnectionError(f"Failed to connect to {db_type} database")
            
        return handler 