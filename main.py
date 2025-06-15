import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

# Import the FastAPI app from backend/main.py
from backend.main import app

# This file re-exports the FastAPI app from backend/main.py
# to make it accessible at the root level for deployment 