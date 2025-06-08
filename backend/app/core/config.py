import os
from typing import List, Optional, Union
from pydantic_settings import BaseSettings
from pydantic import validator, EmailStr
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with comprehensive configuration."""
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    TESTING: bool = False
    
    # Application
    PROJECT_NAME: str = "Manufacturing Platform API"
    VERSION: str = "1.0.0"
    DOMAIN: str = "manufacturing-platform.com"
    API_V1_STR: str = "/api/v1"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/manufacturing_platform"
    DATABASE_URL_ASYNC: Optional[str] = None
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_POOL_RECYCLE: int = 3600
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production-min-32-chars"
    JWT_SECRET_KEY: str = "your-jwt-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # 15 minutes for security
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # 7 days
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24  # 24 hours
    PASSWORD_RESET_EXPIRE_HOURS: int = 1       # 1 hour
    
    # Password requirements
    MIN_PASSWORD_LENGTH: int = 8
    REQUIRE_UPPERCASE: bool = True
    REQUIRE_LOWERCASE: bool = True
    REQUIRE_DIGITS: bool = True
    REQUIRE_SPECIAL_CHARS: bool = True
    
    # Rate Limiting
    RATE_LIMIT_AUTH_REQUESTS: int = 5      # requests per minute for auth
    RATE_LIMIT_API_REQUESTS: int = 100     # requests per minute for API
    RATE_LIMIT_PUBLIC_REQUESTS: int = 1000 # requests per hour for public
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080"
    ]
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Email Configuration (SendGrid)
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: EmailStr = "noreply@manufacturing-platform.com"
    FROM_NAME: str = "Manufacturing Platform"
    
    # Alternative SMTP Configuration
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    
    # Email Templates
    EMAIL_VERIFICATION_TEMPLATE: str = "email_verification.html"
    PASSWORD_RESET_TEMPLATE: str = "password_reset.html"
    WELCOME_TEMPLATE: str = "welcome.html"
    
    # Comprehensive Stripe Payment Configuration
    # US Stripe Account
    STRIPE_US_SECRET_KEY: str = ""
    STRIPE_US_PUBLISHABLE_KEY: str = ""
    STRIPE_US_WEBHOOK_SECRET: str = ""
    STRIPE_US_CONNECT_CLIENT_ID: str = ""
    
    # EU Stripe Account
    STRIPE_EU_SECRET_KEY: str = ""
    STRIPE_EU_PUBLISHABLE_KEY: str = ""
    STRIPE_EU_WEBHOOK_SECRET: str = ""
    STRIPE_EU_CONNECT_CLIENT_ID: str = ""
    
    # UK Stripe Account
    STRIPE_UK_SECRET_KEY: str = ""
    STRIPE_UK_PUBLISHABLE_KEY: str = ""
    STRIPE_UK_WEBHOOK_SECRET: str = ""
    STRIPE_UK_CONNECT_CLIENT_ID: str = ""
    
    # Legacy fields for backward compatibility
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_CONNECT_CLIENT_ID: str = ""
    
    # Platform Configuration
    PLATFORM_COMMISSION_RATE: float = 10.0  # Base commission rate (%)
    PLATFORM_BASE_CURRENCY: str = "USD"
    
    # Payment Features
    ENABLE_ESCROW: bool = True
    ENABLE_MARKETPLACE_PAYMENTS: bool = True
    ENABLE_SUBSCRIPTIONS: bool = True
    ENABLE_INVOICING: bool = True
    ENABLE_CLIMATE_CONTRIBUTION: bool = False
    
    # Fraud Protection
    ENABLE_RADAR: bool = True
    FRAUD_SCORE_THRESHOLD: int = 75
    
    # 3D Secure Configuration
    ENFORCE_3D_SECURE: bool = False
    ENFORCE_3D_SECURE_AMOUNT_THRESHOLD: float = 500.0  # Enforce for amounts above this
    
    # Multi-currency Settings
    SUPPORTED_CURRENCIES: List[str] = ["USD", "EUR", "GBP", "PLN", "CAD", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK"]
    DEFAULT_CURRENCY_BY_REGION: dict = {
        "US": "USD",
        "EU": "EUR", 
        "UK": "GBP",
        "CA": "CAD",
        "AU": "AUD",
        "SG": "SGD",
        "JP": "JPY"
    }
    
    # Frontend Configuration
    FRONTEND_URL: str = "http://localhost:3000"
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "gif"]
    UPLOAD_FOLDER: str = "uploads"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "app.log"
    LOG_MAX_SIZE: int = 10 * 1024 * 1024  # 10MB
    LOG_BACKUP_COUNT: int = 5
    
    # Redis Configuration (for caching and rate limiting)
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    CACHE_EXPIRE_SECONDS: int = 3600  # 1 hour
    
    # Celery Configuration (for background tasks)
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    
    # Search Configuration
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    ELASTICSEARCH_INDEX_PREFIX: str = "manufacturing_platform"
    
    # Monitoring & Analytics
    SENTRY_DSN: Optional[str] = None
    GOOGLE_ANALYTICS_ID: Optional[str] = None
    
    # External APIs
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    
    # GDPR Compliance
    GDPR_DATA_RETENTION_DAYS: int = 365 * 7  # 7 years
    GDPR_DELETION_DELAY_DAYS: int = 30        # 30 days before actual deletion
    
    # Business Configuration
    DEFAULT_CURRENCY: str = "PLN"
    DEFAULT_LANGUAGE: str = "pl"
    DEFAULT_TIMEZONE: str = "Europe/Warsaw"
    VAT_RATE_POLAND: float = 0.23  # 23% VAT
    
    # Feature Flags
    ENABLE_EMAIL_VERIFICATION: bool = True
    ENABLE_TWO_FACTOR_AUTH: bool = False
    ENABLE_MANUFACTURER_VERIFICATION: bool = True
    ENABLE_PAYMENT_ESCROW: bool = True
    ENABLE_AI_MATCHING: bool = False
    
    @validator("DATABASE_URL_ASYNC", pre=True)
    def assemble_async_db_connection(cls, v: Optional[str], values: dict) -> str:
        if isinstance(v, str):
            return v
        db_url = values.get("DATABASE_URL", "")
        if db_url.startswith("postgresql://"):
            return db_url.replace("postgresql://", "postgresql+asyncpg://")
        return db_url
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    @validator("ALLOWED_HOSTS", pre=True)
    def assemble_allowed_hosts(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    @validator("SECRET_KEY", pre=True)
    def validate_secret_key(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v
    
    @validator("JWT_SECRET_KEY", pre=True)
    def validate_jwt_secret_key(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long")
        return v
    
    @validator("PLATFORM_COMMISSION_RATE")
    def validate_commission_rate(cls, v: float) -> float:
        if not 0 <= v <= 100:
            raise ValueError("PLATFORM_COMMISSION_RATE must be between 0 and 100")
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()


# Convenience function for backward compatibility
def get_config() -> Settings:
    """Get application configuration."""
    return get_settings()


# Global settings instance for backward compatibility
settings = get_settings()


# Environment-specific settings
class DevelopmentSettings(Settings):
    """Development environment settings."""
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:3000"]


class ProductionSettings(Settings):
    """Production environment settings."""
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: List[str] = []  # Set explicitly in production
    ALLOWED_HOSTS: List[str] = []  # Set explicitly in production


class TestingSettings(Settings):
    """Testing environment settings."""
    TESTING: bool = True
    DATABASE_URL: str = "sqlite:///./test.db"
    LOG_LEVEL: str = "WARNING"


def get_settings_for_environment(env: str) -> Settings:
    """Get settings for specific environment."""
    if env == "development":
        return DevelopmentSettings()
    elif env == "production":
        return ProductionSettings()
    elif env == "testing":
        return TestingSettings()
    else:
        return Settings() 