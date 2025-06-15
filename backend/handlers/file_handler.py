from abc import ABC, abstractmethod
import pandas as pd
from typing import Union, Dict, Any
import json
import csv
import os
from pathlib import Path

class FileHandler(ABC):
    """Abstract base class for file handlers"""
    
    @abstractmethod
    def validate_file(self, file_path: str) -> bool:
        """Validate if the file is of correct type and format"""
        pass
    
    @abstractmethod
    def read_file(self, file_path: str) -> Union[pd.DataFrame, Dict[str, Any]]:
        """Read and parse the file into a pandas DataFrame or dictionary"""
        pass

class CSVHandler(FileHandler):
    def validate_file(self, file_path: str) -> bool:
        return file_path.lower().endswith('.csv')
    
    def read_file(self, file_path: str) -> pd.DataFrame:
        return pd.read_csv(file_path)

class ExcelHandler(FileHandler):
    def validate_file(self, file_path: str) -> bool:
        return file_path.lower().endswith(('.xlsx', '.xls'))
    
    def read_file(self, file_path: str) -> pd.DataFrame:
        return pd.read_excel(file_path)

class JSONHandler(FileHandler):
    def validate_file(self, file_path: str) -> bool:
        return file_path.lower().endswith('.json')
    
    def read_file(self, file_path: str) -> Union[pd.DataFrame, Dict[str, Any]]:
        with open(file_path, 'r') as f:
            data = json.load(f)
        # Try to convert to DataFrame if possible
        try:
            return pd.DataFrame(data)
        except:
            return data

class FileHandlerFactory:
    """Factory class for creating appropriate file handlers"""
    
    _handlers = {
        '.csv': CSVHandler,
        '.xlsx': ExcelHandler,
        '.xls': ExcelHandler,
        '.json': JSONHandler
    }
    
    @classmethod
    def get_handler(cls, file_path: str) -> FileHandler:
        """Get the appropriate handler for the file type"""
        ext = os.path.splitext(file_path)[1].lower()
        handler_class = cls._handlers.get(ext)
        
        if not handler_class:
            raise ValueError(f"Unsupported file type: {ext}")
        
        return handler_class()
    
    @classmethod
    def process_file(cls, file_path: str) -> Union[pd.DataFrame, Dict[str, Any]]:
        """Process a file using the appropriate handler"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        handler = cls.get_handler(file_path)
        if not handler.validate_file(file_path):
            raise ValueError(f"Invalid file format: {file_path}")
            
        return handler.read_file(file_path) 