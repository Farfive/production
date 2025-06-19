"""
Base schema classes for the manufacturing platform.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """
    Base schema class for all API schemas.
    
    Provides common configuration and functionality for all schema classes.
    """
    
    model_config = ConfigDict(
        # Allow extra fields to be ignored instead of raising validation errors
        extra='ignore',
        # Allow population by field name (for API compatibility)
        populate_by_name=True,
        # Use enum values instead of enum instances in serialization
        use_enum_values=True,
        # Validate assignments after model creation
        validate_assignment=True,
        # Allow arbitrary types for complex fields
        arbitrary_types_allowed=True,
        # Enable JSON schema generation
        json_schema_serialization_defaults_required=True
    )


class TimestampMixin(BaseModel):
    """Mixin for schemas that include timestamp fields."""
    
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PaginationSchema(BaseSchema):
    """Schema for pagination parameters."""
    
    page: int = 1
    size: int = 20
    total: Optional[int] = None
    pages: Optional[int] = None


class ResponseSchema(BaseSchema):
    """Generic response schema wrapper."""
    
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None
    errors: Optional[Dict[str, Any]] = None


class ErrorSchema(BaseSchema):
    """Schema for error responses."""
    
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None 