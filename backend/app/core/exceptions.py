import logging
from typing import Any, Dict, Optional
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from pydantic import ValidationError
import traceback

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Custom authentication error."""
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class AuthorizationError(Exception):
    """Custom authorization error."""
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class ValidationError(Exception):
    """Custom validation error."""
    def __init__(self, message: str, errors: list = None):
        self.message = message
        self.errors = errors or []
        super().__init__(self.message)


class BusinessLogicError(Exception):
    """Custom business logic error."""
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class RateLimitError(Exception):
    """Custom rate limit error."""
    def __init__(self, message: str, retry_after: int = None):
        self.message = message
        self.retry_after = retry_after
        super().__init__(self.message)


def create_error_response(
    status_code: int,
    message: str,
    error_code: str = None,
    details: Dict[str, Any] = None,
    retry_after: int = None
) -> JSONResponse:
    """Create standardized error response."""
    content = {
        "error": True,
        "message": message,
        "status_code": status_code
    }
    
    if error_code:
        content["error_code"] = error_code
    
    if details:
        content["details"] = details
    
    headers = {}
    if retry_after:
        headers["Retry-After"] = str(retry_after)
        content["retry_after"] = retry_after
    
    return JSONResponse(
        status_code=status_code,
        content=content,
        headers=headers
    )


def setup_exception_handlers(app: FastAPI):
    """Setup global exception handlers for the application."""
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Handle HTTP exceptions."""
        logger.warning(
            f"HTTP Exception: {exc.status_code} - {exc.detail} "
            f"Path: {request.url.path} "
            f"Method: {request.method}"
        )
        
        return create_error_response(
            status_code=exc.status_code,
            message=exc.detail
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle request validation errors."""
        errors = []
        for error in exc.errors():
            field = " -> ".join(str(loc) for loc in error["loc"])
            errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"]
            })
        
        logger.warning(
            f"Validation Error: {errors} "
            f"Path: {request.url.path} "
            f"Method: {request.method}"
        )
        
        return create_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Validation failed",
            error_code="VALIDATION_ERROR",
            details={"errors": errors}
        )
    
    @app.exception_handler(AuthenticationError)
    async def authentication_exception_handler(request: Request, exc: AuthenticationError):
        """Handle authentication errors."""
        logger.warning(
            f"Authentication Error: {exc.message} "
            f"Path: {request.url.path} "
            f"Method: {request.method}"
        )
        
        return create_error_response(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=exc.message,
            error_code=exc.error_code or "AUTHENTICATION_ERROR"
        )
    
    @app.exception_handler(AuthorizationError)
    async def authorization_exception_handler(request: Request, exc: AuthorizationError):
        """Handle authorization errors."""
        logger.warning(
            f"Authorization Error: {exc.message} "
            f"Path: {request.url.path} "
            f"Method: {request.method}"
        )
        
        return create_error_response(
            status_code=status.HTTP_403_FORBIDDEN,
            message=exc.message,
            error_code=exc.error_code or "AUTHORIZATION_ERROR"
        )
    
    @app.exception_handler(RateLimitError)
    async def rate_limit_exception_handler(request: Request, exc: RateLimitError):
        """Handle rate limit errors."""
        logger.warning(
            f"Rate Limit Error: {exc.message} "
            f"Path: {request.url.path} "
            f"Method: {request.method}"
        )
        
        return create_error_response(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            message=exc.message,
            error_code="RATE_LIMIT_EXCEEDED",
            retry_after=exc.retry_after
        )
    
    @app.exception_handler(BusinessLogicError)
    async def business_logic_exception_handler(request: Request, exc: BusinessLogicError):
        """Handle business logic errors."""
        logger.warning(
            f"Business Logic Error: {exc.message} "
            f"Path: {request.url.path} "
            f"Method: {request.method}"
        )
        
        return create_error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=exc.message,
            error_code=exc.error_code or "BUSINESS_LOGIC_ERROR"
        )
    
    @app.exception_handler(IntegrityError)
    async def integrity_exception_handler(request: Request, exc: IntegrityError):
        """Handle database integrity errors."""
        logger.error(
            f"Database Integrity Error: {str(exc)} "
            f"Path: {request.url.path} "
            f"Method: {request.method}"
        )
        
        # Parse common integrity errors
        error_message = "Database constraint violation"
        if "duplicate key" in str(exc).lower():
            error_message = "Duplicate value detected"
        elif "foreign key" in str(exc).lower():
            error_message = "Related record not found"
        elif "check constraint" in str(exc).lower():
            error_message = "Invalid data format"
        
        return create_error_response(
            status_code=status.HTTP_409_CONFLICT,
            message=error_message,
            error_code="INTEGRITY_ERROR"
        )
    
    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
        """Handle SQLAlchemy errors."""
        logger.error(
            f"Database Error: {str(exc)} "
            f"Path: {request.url.path} "
            f"Method: {request.method}"
        )
        
        return create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Database operation failed",
            error_code="DATABASE_ERROR"
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle all other exceptions."""
        logger.error(
            f"Unhandled Exception: {str(exc)} "
            f"Path: {request.url.path} "
            f"Method: {request.method} "
            f"Traceback: {traceback.format_exc()}"
        )
        
        return create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="An unexpected error occurred",
            error_code="INTERNAL_ERROR"
        )
    
    logger.info("Exception handlers configured successfully")


# Error code constants
class ErrorCodes:
    """Standard error codes for the application."""
    
    # Authentication errors
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    EXPIRED_TOKEN = "EXPIRED_TOKEN"
    INVALID_TOKEN = "INVALID_TOKEN"
    EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED"
    ACCOUNT_SUSPENDED = "ACCOUNT_SUSPENDED"
    ACCOUNT_INACTIVE = "ACCOUNT_INACTIVE"
    
    # Authorization errors
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    ROLE_REQUIRED = "ROLE_REQUIRED"
    ACCOUNT_TYPE_MISMATCH = "ACCOUNT_TYPE_MISMATCH"
    
    # Validation errors
    INVALID_EMAIL_FORMAT = "INVALID_EMAIL_FORMAT"
    WEAK_PASSWORD = "WEAK_PASSWORD"
    INVALID_NIP_FORMAT = "INVALID_NIP_FORMAT"
    REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING"
    
    # Business logic errors
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"
    NIP_ALREADY_EXISTS = "NIP_ALREADY_EXISTS"
    EMAIL_ALREADY_VERIFIED = "EMAIL_ALREADY_VERIFIED"
    INVALID_VERIFICATION_TOKEN = "INVALID_VERIFICATION_TOKEN"
    EXPIRED_VERIFICATION_TOKEN = "EXPIRED_VERIFICATION_TOKEN"
    INVALID_RESET_TOKEN = "INVALID_RESET_TOKEN"
    EXPIRED_RESET_TOKEN = "EXPIRED_RESET_TOKEN"
    INCORRECT_PASSWORD = "INCORRECT_PASSWORD"
    
    # Rate limiting errors
    TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS"
    TOO_MANY_LOGIN_ATTEMPTS = "TOO_MANY_LOGIN_ATTEMPTS"
    TOO_MANY_VERIFICATION_REQUESTS = "TOO_MANY_VERIFICATION_REQUESTS"
    TOO_MANY_RESET_REQUESTS = "TOO_MANY_RESET_REQUESTS"
    
    # GDPR errors
    GDPR_CONSENT_REQUIRED = "GDPR_CONSENT_REQUIRED"
    DATA_EXPORT_IN_PROGRESS = "DATA_EXPORT_IN_PROGRESS"
    DATA_DELETION_IN_PROGRESS = "DATA_DELETION_IN_PROGRESS"
    
    # System errors
    DATABASE_ERROR = "DATABASE_ERROR"
    EMAIL_SERVICE_ERROR = "EMAIL_SERVICE_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class ErrorMessages:
    """Standard error messages for the application."""
    
    # Authentication messages
    INVALID_CREDENTIALS = "Invalid email or password"
    EXPIRED_TOKEN = "Token has expired"
    INVALID_TOKEN = "Invalid token"
    EMAIL_NOT_VERIFIED = "Email address not verified"
    ACCOUNT_SUSPENDED = "Account has been suspended"
    ACCOUNT_INACTIVE = "Account is inactive"
    
    # Authorization messages
    INSUFFICIENT_PERMISSIONS = "Insufficient permissions"
    ROLE_REQUIRED = "Required role not found"
    
    # Validation messages
    INVALID_EMAIL_FORMAT = "Invalid email format"
    WEAK_PASSWORD = "Password does not meet security requirements"
    INVALID_NIP_FORMAT = "Invalid NIP format"
    
    # Business logic messages
    EMAIL_ALREADY_EXISTS = "Email address already registered"
    NIP_ALREADY_EXISTS = "NIP already registered"
    EMAIL_ALREADY_VERIFIED = "Email already verified"
    INVALID_VERIFICATION_TOKEN = "Invalid verification token"
    EXPIRED_VERIFICATION_TOKEN = "Verification token has expired"
    INVALID_RESET_TOKEN = "Invalid reset token"
    EXPIRED_RESET_TOKEN = "Reset token has expired"
    INCORRECT_PASSWORD = "Current password is incorrect"
    
    # Rate limiting messages
    TOO_MANY_REQUESTS = "Too many requests. Please try again later"
    TOO_MANY_LOGIN_ATTEMPTS = "Too many login attempts. Please try again later"
    TOO_MANY_VERIFICATION_REQUESTS = "Too many verification requests. Please wait before trying again"
    TOO_MANY_RESET_REQUESTS = "Too many reset requests. Please wait before trying again"
    
    # System messages
    DATABASE_ERROR = "Database operation failed"
    EMAIL_SERVICE_ERROR = "Email service unavailable"
    INTERNAL_ERROR = "An unexpected error occurred" 