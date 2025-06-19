from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
import time
from groq import InternalServerError, RateLimitError, BadRequestError
import logging
import json
import re
from .visualization_generator import VisualizationGenerator
import rapidfuzz

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SQLQuery(BaseModel):
    query: str = Field(description="The generated SQL query")
    explanation: str = Field(description="Explanation of what the query does")
    summary: Optional[str] = Field(default="", description="Formal response for the frontend")

class QueryGenerator:
    def __init__(self, max_retries=3, retry_delay=1):
        self.llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model_name="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=1024
        )
        self.parser = PydanticOutputParser(pydantic_object=SQLQuery)
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.viz_generator = VisualizationGenerator()
        
        # Define data analysis keywords that indicate valid questions
        self.data_analysis_keywords = {
            # Query-related
            'show', 'what', 'how', 'calculate', 'find', 'list', 'get', 'display',
            'count', 'sum', 'average', 'min', 'max', 'total', 'group', 'sort',
            'filter', 'where', 'top', 'bottom', 'trend', 'compare', 'analyze',
            'distribution', 'correlation', 'percentage', 'ratio', 'which', 'highest',
            'most', 'best', 'lowest', 'least', 'worst', 'city', 'state', 'region',
            'location', 'category', 'product', 'customer', 'sales', 'revenue',
            'amount', 'value', 'price', 'cost', 'quantity', 'volume', 'count',
            'number', 'units', 'date', 'time', 'period', 'month', 'year', 'day',
            # SQL-specific
            'select', 'from', 'where', 'group by', 'order by', 'join', 'having',
            'distinct', 'limit', 'offset', 'case', 'when', 'then', 'else', 'end',
            # Data analysis
            'data', 'dataset', 'table', 'column', 'row', 'record', 'value',
            'statistics', 'stats', 'metric', 'measure', 'dimension', 'aggregate',
            'query', 'report', 'analysis', 'insight', 'pattern', 'trend',
            # Additional variations for top/bottom queries
            'first', 'last', 'beginning', 'end', 'start', 'begin', 'initial'
        }

        # Define common greetings and their responses
        self.greetings = {
            'hello': 'Hi there! I\'m here to help you understand your data. What would you like to know?',
            'hi': 'Hi there! I\'m here to help you understand your data. What would you like to know?',
            'hey': 'Hi there! I\'m here to help you understand your data. What would you like to know?',
            'good morning': 'Hi there! I\'m here to help you understand your data. What would you like to know?',
            'good afternoon': 'Hi there! I\'m here to help you understand your data. What would you like to know?',
            'good evening': 'Hi there! I\'m here to help you understand your data. What would you like to know?',
            'good night': 'Hi there! I\'m here to help you understand your data. What would you like to know?',
        }

        # Define operation-related keywords and their responses
        self.operation_keywords = {
            'operation', 'operations', 'can do', 'capabilities', 'features', 'functions',
            'what can you', 'how can you', 'abilities', 'perform', 'support', 'available',
            'possible', 'types of', 'kinds of', 'examples of', 'show me what'
        }

        # Define help-related keywords and their responses
        self.help_responses = {
            'help': """I can help you analyze any dataset in many ways! Here are some examples of what you can ask me:

1. Basic Analysis:
   - "Show me the first 10 rows of the data"
   - "What are the unique values in column X?"
   - "Calculate the average of column Y"

2. Aggregations:
   - "What's the total sum of column Z?"
   - "Show me the count of records by category"
   - "Calculate the minimum and maximum values"

3. Filtering and Sorting:
   - "Show me records where column A > 100"
   - "List the top 5 records by column B"
   - "Filter data for specific conditions"

4. Time-based Analysis (if date columns exist):
   - "Show me trends over time"
   - "Calculate monthly averages"
   - "Compare data across different periods"

5. Statistical Analysis:
   - "Calculate the correlation between columns"
   - "Show me the distribution of values"
   - "Find outliers in the data"

Would you like to explore any of these areas? Just ask me a question!""",
            'what can you do': """I'm your AI Data Analytics Assistant, and I can help you understand any dataset through various analyses:

• Basic Data Exploration: View data, unique values, and basic statistics
• Aggregations: Calculate sums, averages, counts, and other aggregations
• Filtering and Sorting: Find specific records and sort data
• Time Analysis: Analyze trends and patterns over time (if date columns exist)
• Statistical Analysis: Calculate correlations, distributions, and find outliers
• Custom Reports: Create specific analyses based on your needs

What aspect of your data would you like to explore?""",
            'how to use': """To use me effectively, simply ask questions about your data in natural language. For example:

1. For basic analysis:
   - "Show me the first 10 rows"
   - "What are the unique values in column X?"
   - "Calculate the average of column Y"

2. For aggregations:
   - "What's the total sum of column Z?"
   - "Show me the count by category"
   - "Find the minimum and maximum values"

3. For filtering:
   - "Show records where column A > 100"
   - "List the top 5 by column B"
   - "Filter for specific conditions"

You can also ask for help at any time by typing "help" or "what can you do"!"""
        }

        # List of common greeting/small talk phrases for fuzzy matching
        self.greeting_phrases = [
            'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'good night',
            "what's up", 'whats up', 'sup', 'yo', 'how are you', 'how is it going', 'how are things',
            'howdy', 'greetings', 'hiya', 'hey there', 'hello there', 'how are you doing',
            'how goes it', 'how you doing', 'how are ya', 'how is everything', 'how is life',
            'how is your day', 'how is your day going', 'how is your day today', 'how is your evening',
            'how is your morning', 'how is your afternoon', 'how is your night', 'how is your week',
            'how is your weekend', 'how is your day been', 'how is your week been', 'how is your weekend been',
            'how is your day going so far', 'how is your week going', 'how is your weekend going',
            'how is your day so far', 'how is your week so far', 'how is your weekend so far',
            'how is your day today', 'how is your week today', 'how is your weekend today',
            'how is your day going today', 'how is your week going today', 'how is your weekend going today',
            'how is your day been today', 'how is your week been today', 'how is your weekend been today',
            'how is your day going so far today', 'how is your week going so far today', 'how is your weekend going so far today',
            'how is your day so far today', 'how is your week so far today', 'how is your weekend so far today',
            'how is your day today', 'how is your week today', 'how is your weekend today',
            'how is your day going today', 'how is your week going today', 'how is your weekend going today',
            'how is your day been today', 'how is your week been today', 'how is your weekend been today',
            'how is your day going so far today', 'how is your week going so far today', 'how is your weekend going so far today',
            'how is your day so far today', 'how is your week so far today', 'how is your weekend so far today',
            'yo', 'sup', 'wassup', 'what up', 'what is up', 'whats good', 'what is good', 'how goes it',
            'how are things', 'how is it going', 'how are you doing', 'how are you', 'how you doing',
            'how are ya', 'how is everything', 'how is life', 'how is your day', 'how is your day going',
            'how is your evening', 'how is your morning', 'how is your afternoon', 'how is your night',
            'how is your week', 'how is your weekend', 'how is your day been', 'how is your week been',
            'how is your weekend been', 'how is your day going so far', 'how is your week going',
            'how is your weekend going', 'how is your day so far', 'how is your week so far',
            'how is your weekend so far', 'howdy', 'hiya', 'greetings', 'hey there', 'hello there'
        ]

        # Define knowledge base for common questions
        self.knowledge_base = {
            "what is python": """Python is a high-level, interpreted programming language known for its simplicity and readability. It was created by Guido van Rossum and first released in 1991. Python is widely used for:
• Web Development
• Data Science and Machine Learning
• Artificial Intelligence
• Scientific Computing
• Automation and Scripting
• Software Development

Key features of Python include:
• Easy to learn and use
• Extensive standard library
• Cross-platform compatibility
• Strong community support
• Rich ecosystem of packages and frameworks""",

            "what is data": """Data refers to raw facts, figures, or information that can be processed, analyzed, and used to make decisions. In computing, data can be:
• Structured (databases, spreadsheets)
• Unstructured (text, images, videos)
• Semi-structured (XML, JSON)

Types of data include:
• Numerical data (integers, decimals)
• Categorical data (labels, categories)
• Textual data (words, sentences)
• Temporal data (dates, times)
• Spatial data (locations, coordinates)""",

            "what is data science": """Data Science is an interdisciplinary field that combines:
• Statistics
• Computer Science
• Domain Knowledge
• Machine Learning
• Data Analysis

Key aspects of Data Science:
• Data Collection and Cleaning
• Exploratory Data Analysis
• Statistical Analysis
• Machine Learning
• Data Visualization
• Predictive Modeling
• Business Intelligence

Common tools and technologies:
• Python (pandas, numpy, scikit-learn)
• R
• SQL
• Tableau
• Power BI
• TensorFlow/PyTorch""",

            "what is machine learning": """Machine Learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. Key concepts include:

• Supervised Learning
  - Classification
  - Regression
• Unsupervised Learning
  - Clustering
  - Dimensionality Reduction
• Reinforcement Learning

Common applications:
• Image Recognition
• Natural Language Processing
• Recommendation Systems
• Fraud Detection
• Autonomous Vehicles""",

            "what is artificial intelligence": """Artificial Intelligence (AI) is the simulation of human intelligence by machines. It encompasses:

• Machine Learning
• Deep Learning
• Natural Language Processing
• Computer Vision
• Robotics
• Expert Systems

Types of AI:
• Narrow/Weak AI (focused on specific tasks)
• General AI (human-like intelligence)
• Super AI (beyond human capabilities)

Applications:
• Virtual Assistants
• Autonomous Systems
• Healthcare Diagnosis
• Financial Analysis
• Smart Home Devices""",

            "what is big data": """Big Data refers to extremely large and complex datasets that traditional data processing methods cannot handle effectively. Characteristics:

• Volume (large amounts of data)
• Velocity (high-speed data generation)
• Variety (different types of data)
• Veracity (data quality)
• Value (useful insights)

Technologies:
• Hadoop
• Spark
• NoSQL databases
• Data Lakes
• Stream Processing

Applications:
• Business Analytics
• Scientific Research
• Healthcare
• Social Media Analysis
• IoT Data Processing"""
        }

        # Define patterns for knowledge base questions
        self.knowledge_base_phrases = [
            "what is python",
            "what is data",
            "what is data science",
            "what is machine learning",
            "what is artificial intelligence",
            "what is big data",
            "explain python",
            "explain data",
            "explain data science",
            "explain machine learning",
            "explain artificial intelligence",
            "explain big data",
            "tell me about python",
            "tell me about data",
            "tell me about data science",
            "tell me about machine learning",
            "tell me about artificial intelligence",
            "tell me about big data"
        ]

        # Define common patterns for top/bottom queries
        self.top_bottom_patterns = [
            r'show\s+(?:the\s+)?(?:top|first|beginning|start|initial)\s+(\d+)',
            r'show\s+(?:the\s+)?(?:bottom|last|end)\s+(\d+)',
            r'(?:top|first|beginning|start|initial)\s+(\d+)',
            r'(?:bottom|last|end)\s+(\d+)'
        ]

    def _get_system_prompt(self, table_name: Optional[str] = None, table_schema: Optional[Dict[str, Any]] = None) -> str:
        """Generate system prompt based on table schema."""
        base_prompt = """You are a professional AI Data Analytics Assistant that helps users analyze their data through natural language queries.

Guidelines:
1. Generate only valid SQLite SQL queries
2. Use appropriate SQL functions for the data types
3. Provide a clear, professional explanation of what the query does
4. Focus on retrieving the exact data requested by the user
5. Use appropriate sorting and limiting when needed
6. Handle NULL values appropriately
7. Use proper date/time functions for time-based queries if date columns exist
8. For aggregations:
   - Use appropriate aggregate functions (SUM, AVG, COUNT, etc.)
   - Include relevant grouping columns
   - Sort results when appropriate
9. For filtering:
   - Use appropriate comparison operators
   - Handle string matching with LIKE when needed
   - Consider NULL values in conditions

If the user's question is not related to data analysis, politely explain that you're focused on data analytics and suggest relevant queries they might be interested in.

{format_instructions}
"""

        if table_name and table_schema:
            schema_description = f"\nTable Schema for '{table_name}':\n"
            for col in table_schema['columns']:
                schema_description += f"- {col['name']} ({col['type']})\n"
            base_prompt = base_prompt.replace("Guidelines:", f"{schema_description}\nGuidelines:")

        return base_prompt

    def _handle_groq_error(self, error, attempt):
        """Handle different types of Groq API errors."""
        if isinstance(error, InternalServerError):
            logger.warning(f"Groq service unavailable (attempt {attempt}/{self.max_retries}). Retrying...")
            return True  # Retry
        elif isinstance(error, RateLimitError):
            logger.warning(f"Rate limit exceeded (attempt {attempt}/{self.max_retries}). Retrying...")
            time.sleep(self.retry_delay * 2)  # Double the delay for rate limits
            return True  # Retry
        elif isinstance(error, BadRequestError):
            logger.error(f"Bad request to Groq API: {str(error)}")
            return False  # Don't retry
        else:
            logger.error(f"Unexpected error from Groq API: {str(error)}")
            return False  # Don't retry
        
    def is_greeting(self, message: str) -> bool:
        """Check if the message is a greeting or small talk using fuzzy matching."""
        message_lower = message.lower().strip()
        # First, check exact match with the original greetings
        for greeting in self.greetings.keys():
            pattern = r'^' + re.escape(greeting) + r'(\b|$)'
            if re.match(pattern, message_lower):
                return True
        # Fuzzy match with greeting phrases
        for phrase in self.greeting_phrases:
            score = rapidfuzz.fuzz.ratio(message_lower, phrase)
            if score >= 80:
                return True
        return False

    def is_help_request(self, message: str) -> bool:
        """Check if the message is a help request."""
        message_lower = message.lower().strip()
        return any(help_keyword in message_lower for help_keyword in self.help_responses.keys())

    def is_operation_question(self, message: str) -> bool:
        """Check if the message is asking about operations or capabilities."""
        message_lower = message.lower().strip()
        return any(keyword in message_lower for keyword in self.operation_keywords)

    def is_data_analysis_question(self, question: str) -> bool:
        """Check if the question is related to data analysis."""
        question_lower = question.lower()
        
        # First check if it's a general knowledge question
        if self.is_knowledge_base_question(question_lower):
            return False
            
        # Check for common general knowledge question patterns
        general_knowledge_patterns = [
            r'^what is\s+',
            r'^tell me about\s+',
            r'^explain\s+',
            r'^define\s+',
            r'^describe\s+',
            r'^how does\s+',
            r'^what are\s+',
            r'^what do you know about\s+',
            r'^can you explain\s+',
            r'^what does\s+'
        ]
        
        for pattern in general_knowledge_patterns:
            if re.match(pattern, question_lower):
                return False
        
        # Check for data analysis specific patterns
        data_analysis_patterns = [
            r'show me',
            r'display',
            r'list',
            r'find',
            r'calculate',
            r'compute',
            r'analyze',
            r'compare',
            r'what is the',
            r'how many',
            r'what are the',
            r'what is the average',
            r'what is the total',
            r'what is the sum',
            r'what is the count',
            r'what is the maximum',
            r'what is the minimum',
            r'group by',
            r'filter',
            r'sort',
            r'order by'
        ]
        
        # Check for data analysis keywords
        words = question_lower.split()
        data_analysis_keywords = {
            'average', 'sum', 'count', 'total', 'maximum', 'minimum',
            'group', 'filter', 'sort', 'order', 'compare', 'analyze',
            'show', 'display', 'list', 'find', 'calculate', 'compute',
            'top', 'bottom', 'highest', 'lowest', 'most', 'least'
        }
        
        # Check for data analysis patterns
        for pattern in data_analysis_patterns:
            if pattern in question_lower:
                return True
                
        # Check for data analysis keywords
        if any(word in data_analysis_keywords for word in words):
            return True
            
        # Check for top/bottom patterns
        for pattern in self.top_bottom_patterns:
            if re.search(pattern, question_lower):
                return True
                
        return False

    def get_greeting_response(self, message: str) -> str:
        """Get appropriate greeting response (always the same for any greeting/small talk)."""
        return "Hi there! I'm SEE-Q - Intelligent Analytics Assistant. I can help you understand your data. What would you like to know?"

    def get_help_response(self, message: str) -> str:
        """Get appropriate help response."""
        message_lower = message.lower().strip()
        for help_keyword, response in self.help_responses.items():
            if help_keyword in message_lower:
                return response
        return self.help_responses['help']

    def get_operation_response(self) -> str:
        """Get response for operation-related questions."""
        return """I can perform various data analysis operations on your dataset:

1. Data Exploration:
   • View and browse data
   • Get column statistics
   • Find unique values
   • Check data types and formats

2. Aggregations:
   • Calculate sums, averages, counts
   • Find minimum and maximum values
   • Group data by categories
   • Calculate percentages and ratios

3. Filtering and Sorting:
   • Filter data by conditions
   • Sort data by any column
   • Find top/bottom records
   • Apply multiple filters

4. Time Analysis (if date columns exist):
   • Analyze trends over time
   • Calculate period-over-period changes
   • Group data by time periods
   • Compare time-based metrics

5. Statistical Analysis:
   • Calculate correlations
   • Analyze distributions
   • Find outliers
   • Generate summary statistics

To use any of these operations, simply ask a question about your data. For example:
• "Show me the first 10 rows"
• "What's the average of column X?"
• "List the top 5 records by column Y"
• "Show me trends over time"

Type 'help' to see more examples!"""

    def is_knowledge_base_question(self, message: str) -> str:
        """Check if the message is a knowledge base question using token-based fuzzy matching. Returns the best matched key or None."""
        message_lower = message.lower().strip()
        
        # First try exact match with knowledge base phrases
        for phrase in self.knowledge_base_phrases:
            if message_lower == phrase:
                return phrase
        
        # Then try fuzzy matching with knowledge base phrases
        best_score = 0
        best_phrase = None
        
        for phrase in self.knowledge_base_phrases:
            # Use token_sort_ratio for better matching regardless of word order
            score = rapidfuzz.fuzz.token_sort_ratio(message_lower, phrase)
            if score > best_score:
                best_score = score
                best_phrase = phrase
        
        # If we have a good match (80% or higher similarity)
        if best_score >= 80:
            return best_phrase
            
        # If no good match found, try to match against knowledge base keys
        for key in self.knowledge_base.keys():
            score = rapidfuzz.fuzz.token_sort_ratio(message_lower, key)
            if score > best_score:
                best_score = score
                best_phrase = key
        
        # Return the best match if it's good enough
        if best_score >= 80:
            return best_phrase
            
        return None

    def get_knowledge_base_response(self, key: str) -> str:
        """Return the knowledge base answer for the matched key."""
        # Try exact match first
        if key in self.knowledge_base:
            return self.knowledge_base[key]
            
        # Try fuzzy matching if exact match fails
        best_score = 0
        best_key = None
        for kb_key in self.knowledge_base.keys():
            score = rapidfuzz.fuzz.token_sort_ratio(key, kb_key)
            if score > best_score:
                best_score = score
                best_key = kb_key
                
        if best_score >= 80 and best_key:
            return self.knowledge_base[best_key]
            
        return "I'm sorry, I don't have information on that topic yet. I can help you with questions about Python, data, data science, machine learning, artificial intelligence, and big data."

    def generate_query(self, question: str, table_name: Optional[str] = None, table_schema: Optional[Dict[str, Any]] = None, history: Optional[list] = None) -> SQLQuery:
        """Generate SQL query from natural language question, using conversation history if provided."""
        try:
            # First check if it's a knowledge base question
            kb_key = self.is_knowledge_base_question(question)
            if kb_key:
                return SQLQuery(
                    query="SELECT 'knowledge_base' as response",
                    explanation=self.get_knowledge_base_response(kb_key)
                )

            # Check for greetings
            if self.is_greeting(question):
                return SQLQuery(
                    query="SELECT 'greeting' as response",
                    explanation=self.get_greeting_response(question)
                )

            # Check for help requests
            if self.is_help_request(question):
                return SQLQuery(
                    query="SELECT 'help' as response",
                    explanation=self.get_help_response(question)
                )

            # Check for operation questions
            if self.is_operation_question(question):
                return SQLQuery(
                    query="SELECT 'operation' as response",
                    explanation=self.get_operation_response()
                )

            question_lower = question.lower().strip()
            
            # Keywords for summary and data view requests
            summary_keywords = ['summary', 'summarize', 'explain', 'describe']
            view_keywords = ['show', 'display', 'view']
            data_keywords = ['data', 'dataset']

            # Check for summary request (now triggers on any of these words)
            is_summary_request = any(keyword in question_lower for keyword in summary_keywords)

            # Check for data view request (and not a summary request)
            is_data_view_request = (
                any(keyword in question_lower for keyword in view_keywords) and
                any(keyword in question_lower for keyword in data_keywords) and
                not is_summary_request
            )

            if is_summary_request:
                if not table_name:
                    return SQLQuery(
                        query="SELECT 'no_dataset' as type",
                        explanation="I don't see any dataset available. Please upload a dataset first, and then I'll be happy to help you analyze it!",
                        summary="No dataset available",
                    )
                return SQLQuery(
                    query="SELECT 'dataset_summary' as type",
                    explanation="Generating a summary of the dataset...",
                    summary="Here is a summary of your dataset."
                )

            if is_data_view_request:
                if not table_name:
                    return SQLQuery(
                        query="SELECT 'no_dataset' as type",
                        explanation="I don't see any dataset available. Please upload a dataset first, and then I'll be happy to help you analyze it!",
                        summary="No dataset available",
                    )
                return SQLQuery(
                    query=f'SELECT * FROM "{table_name}" LIMIT 10',
                    explanation="Here are the first 10 rows of your dataset. This gives you a quick overview of the data's structure and content.",
                    summary="Showing the first 10 rows of the dataset."
                )

            # If it's not a data analysis question, use LLM for general knowledge
            if not self.is_data_analysis_question(question):
                try:
                    # Build conversation history string
                    history_str = ""
                    if history:
                        for turn in history[-5:]:
                            if turn.get('user'):
                                history_str += f"User: {turn['user']}\n"
                            if turn.get('assistant'):
                                history_str += f"Assistant: {turn['assistant']}\n"
                    prompt = ChatPromptTemplate.from_messages([
                        ("system", """You are a helpful AI assistant with expertise in technology, programming, and data science.\nUse the conversation history to resolve pronouns and follow-up questions.\nProvide clear, accurate, and concise answers to questions.\nIf you're not sure about something, say so.\nFormat your response with bullet points for better readability.\nFocus on providing factual information and avoid making assumptions."""),
                        ("human", f"""Conversation History:\n{history_str}\nCurrent Question: {{question}}""")
                    ])
                    prompt_msg = prompt.format_messages(question=question)
                    response = self.llm.invoke(prompt_msg)
                    answer = response.content.strip()
                    return SQLQuery(
                        query="SELECT 'general_knowledge' as response",
                        explanation=answer
                    )
                except Exception as e:
                    logger.error(f"Error generating general knowledge response: {str(e)}")
                    return SQLQuery(
                        query="SELECT 'error' as response",
                        explanation="I apologize, but I'm having trouble processing your question. Could you please rephrase it or try asking about data analysis instead."
                    )

            # Check if table_name is provided for data analysis questions
            if not table_name:
                return SQLQuery(
                    query="SELECT * FROM current_dataset LIMIT 5",
                    explanation="Here are the top 5 rows from your dataset.",
                    summary="Showing top 5 rows"
                )

            # Create prompt with table schema if available
            system_prompt = self._get_system_prompt(table_name, table_schema)
            prompt_template = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("human", "{question}")
            ])

            # Handle regular data analysis queries
            prompt = prompt_template.format_messages(
                question=question,
                format_instructions=self.parser.get_format_instructions()
            )
            
            logger.info(f"Processing question: {question}")
            if table_name:
                logger.info(f"Using table: {table_name}")
                logger.info(f"Table schema: {json.dumps(table_schema, indent=2)}")

            for attempt in range(1, self.max_retries + 1):
                try:
                    response = self.llm.invoke(prompt)
                    sql_query = self.parser.parse(response.content)
                    logger.info(f"Generated SQL Query: {sql_query.query}")
                    
                    # Format the explanation with proper spacing and structure
                    formatted_explanation = sql_query.explanation.strip()
                    if formatted_explanation:
                        # Add line breaks between sections
                        formatted_explanation = formatted_explanation.replace('. ', '.\n\n')
                        # Add a newline before 'Please ask me' for better separation
                        formatted_explanation = re.sub(r'(trends)( Please ask me)', r'\1.\n\2', formatted_explanation)
                        # Ensure every bullet starts on a new line
                        formatted_explanation = formatted_explanation.replace('•', '\n•')
                        # Ensure every numbered list item starts on a new line
                        formatted_explanation = re.sub(r'(?<!\n)(\d+\.)', r'\n\1', formatted_explanation)
                        # Remove any double line breaks
                        formatted_explanation = re.sub(r'\n{3,}', '\n\n', formatted_explanation)
                    
                    # Create a formal response for the frontend
                    formal_response = "Here are the results of your analysis."
                    if 'limit 5' in sql_query.query.lower():
                        formal_response = "Here are the top 5 records from your analysis."
                    elif 'limit 10' in sql_query.query.lower():
                        formal_response = "Here are the top 10 records from your analysis."
                    elif 'count' in sql_query.query.lower():
                        formal_response = "Here is the count from your analysis."
                    elif 'sum' in sql_query.query.lower():
                        formal_response = "Here is the sum from your analysis."
                    elif 'avg' in sql_query.query.lower():
                        formal_response = "Here is the average from your analysis."
                    
                    return SQLQuery(
                        query=sql_query.query,
                        explanation=formatted_explanation,  # This will be used for the info section
                        summary=formal_response  # This will be used for the main response
                    )
                    
                except (InternalServerError, RateLimitError, BadRequestError) as e:
                    if not self._handle_groq_error(e, attempt):
                        raise
                    if attempt == self.max_retries:
                        raise
                    time.sleep(self.retry_delay * attempt)
                except Exception as e:
                    logger.error(f"Unexpected error during query generation: {str(e)}")
                    # For out-of-scope questions, return a helpful response
                    if "cannot generate SQL" in str(e).lower():
                        return SQLQuery(
                            query="SELECT 'out_of_scope' as type",
                            explanation="""I'm having trouble understanding how to analyze your data with that question.

I can help you with:
• Basic data exploration (viewing data, unique values, basic stats)
• Aggregations (sums, averages, counts)
• Filtering and sorting
• Time-based analysis (if date columns exist)
• Statistical analysis (correlations, distributions)

Try rephrasing your question to focus on analyzing the data, or type 'help' to see examples!"""
                        )
                    raise
        except Exception as e:
            logger.error(f"Error in query generation: {str(e)}")
            return SQLQuery(
                query="SELECT 'error' as type",
                explanation="I apologize, but I encountered an error while processing your request. Please try again or rephrase your question."
            )

    def get_visualization_type(self, query: str, result_data: List[dict]) -> str:
        """Determine the best visualization type based on query and data."""
        if not result_data:
            return "table"
            
        # Check for aggregation queries
        if "COUNT" in query.upper() or "GROUP BY" in query.upper():
            if len(result_data) <= 5:
                return "pie"
            return "bar"
            
        # Check for time series data
        if "DATE" in query.upper() or "MONTH" in query.upper() or "YEAR" in query.upper():
            return "line"
            
        # Check for correlation/scatter plot potential
        if len(result_data[0].keys()) >= 2 and all(isinstance(v, (int, float)) for v in result_data[0].values()):
            return "scatter"
            
        # Default to table view
        return "table"

    def generate_visualization(self, 
                             result_data: List[dict], 
                             viz_type: Optional[str] = None,
                             title: Optional[str] = None) -> Dict[str, Any]:
        """Generate visualization for the query results."""
        if not result_data:
            return {
                'error': 'No data available for visualization'
            }

        # If visualization type is not specified, determine the best type
        if not viz_type:
            viz_type = self.get_visualization_type("", result_data)

        # Generate the visualization
        return self.viz_generator.generate_visualization(
            data=result_data,
            viz_type=viz_type,
            title=title
        )

    def get_supported_visualizations(self) -> List[str]:
        """Return list of supported visualization types."""
        return self.viz_generator.get_supported_visualizations() 