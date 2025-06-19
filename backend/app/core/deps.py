"""
Dependency injection utilities for FastAPI endpoints.

This module provides commonly used dependencies for FastAPI endpoints,
including database sessions and user authentication.
"""

# Simply re-export the functions from their original locations
from app.core.database import get_db
from app.core.security import get_current_user

# For backwards compatibility, also export the original functions
__all__ = ["get_db", "get_current_user"] 