import mysql.connector
from mysql.connector import Error
from typing import Dict, List, Any, Optional
import json

class DatabaseConnection:
    def __init__(self):
        self.connection = None
        self.cursor = None

    def connect(self, host: str, user: str, password: str, database: str) -> bool:
        try:
            self.connection = mysql.connector.connect(
                host=host,
                user=user,
                password=password,
                database=database
            )
            self.cursor = self.connection.cursor(dictionary=True)
            return True
        except Error as e:
            print(f"Error connecting to MySQL: {e}")
            return False

    def disconnect(self):
        if self.connection and self.connection.is_connected():
            self.cursor.close()
            self.connection.close()

    def get_tables(self) -> List[str]:
        try:
            if not self.connection or not self.connection.is_connected():
                raise Error("Database connection is not established")
            if not self.cursor:
                self.cursor = self.connection.cursor(dictionary=True)
            self.cursor.execute("SHOW TABLES")
            tables = self.cursor.fetchall()
            return [list(table.values())[0] for table in tables]
        except Error as e:
            print(f"Error getting tables: {e}")
            return []

    def get_table_schema(self, table_name: str) -> List[Dict[str, Any]]:
        try:
            self.cursor.execute(f"DESCRIBE {table_name}")
            return self.cursor.fetchall()
        except Error as e:
            print(f"Error getting table schema: {e}")
            return []

    def execute_query(self, query: str) -> Dict[str, Any]:
        try:
            self.cursor.execute(query)
            if query.strip().upper().startswith(('SELECT', 'SHOW', 'DESCRIBE')):
                results = self.cursor.fetchall()
                return {
                    "success": True,
                    "data": results,
                    "columns": [desc[0] for desc in self.cursor.description] if self.cursor.description else []
                }
            else:
                self.connection.commit()
                return {
                    "success": True,
                    "message": f"Query executed successfully. Rows affected: {self.cursor.rowcount}"
                }
        except Error as e:
            return {
                "success": False,
                "error": str(e)
            }

    def get_table_preview(self, table_name: str, limit: int = 5) -> Dict[str, Any]:
        try:
            self.cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit}")
            results = self.cursor.fetchall()
            return {
                "success": True,
                "data": results,
                "columns": [desc[0] for desc in self.cursor.description] if self.cursor.description else []
            }
        except Error as e:
            return {
                "success": False,
                "error": str(e)
            } 