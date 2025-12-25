"""
Environment-aware configuration management for WeatherPlanning application
"""
import os
import logging
from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseSettings, Field, validator
from functools import lru_cache

# Setup logging
logger = logging.getLogger("settings")
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
logger.addHandler(handler)
logger.setLevel(logging.INFO)


class Environment(str, Enum):
    """Environment enum for the application"""
    DEVELOPMENT = "development"
    TESTING = "testing"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """
    Application settings that supports different environments (dev/test/prod)
    Settings are loaded from environment variables and can be overridden in a .env file
    """
    # Environment configuration
    environment: Environment = Field(
        default=Environment.DEVELOPMENT,
        env="APP_ENVIRONMENT",
        description="Application environment (development, testing, production)"
    )
    debug: bool = Field(
        default=True,
        env="DEBUG",
        description="Debug mode flag"
    )

    # Server configuration
    host: str = Field(
        default="0.0.0.0",
        env="HOST",
        description="Server host"
    )
    port: int = Field(
        default=8000,
        env="PORT",
        description="Server port"
    )

    # API configuration
    openweather_api_key: str = Field(
        default="",
        env="OPENWEATHER_API_KEY",
        description="OpenWeatherMap API key"
    )

    # CORS configuration
    allowed_origins: list = Field(
        default=["*"],
        env="ALLOWED_ORIGINS",
        description="List of allowed CORS origins"
    )

    @validator("allowed_origins", pre=True)
    def parse_allowed_origins(cls, v):
        """Parse allowed origins from string to list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    @validator("environment", pre=True)
    def parse_environment(cls, v):
        """Validate the environment"""
        if v not in [e.value for e in Environment]:
            logger.warning(f"Invalid environment: {v}, defaulting to development")
            return Environment.DEVELOPMENT
        return v

    @validator("openweather_api_key")
    def validate_api_key(cls, v, values):
        """Validate OpenWeatherMap API key is set for non-dev environments"""
        env = values.get("environment")
        if env == Environment.PRODUCTION and not v:
            raise ValueError("OpenWeatherMap API key must be set in production environment")
        return v

    def log_config(self):
        """Log the current configuration (excluding sensitive values)"""
        masked_config = {k: "****" if k.endswith("_key") or k.endswith("_secret") else v
                         for k, v in self.dict().items()}

        logger.info(f"Running in {self.environment} environment with configuration:")
        for key, value in masked_config.items():
            logger.info(f"  {key}: {value}")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings

    Returns:
        Settings object with environment-specific configuration
    """
    settings = Settings()

    # Prevent accidental production deployments
    if os.environ.get("ENVIRONMENT_VALIDATION") != "production-ready" and settings.environment == Environment.PRODUCTION:
        logger.warning("Production environment detected but ENVIRONMENT_VALIDATION is not set correctly")
        logger.warning("Forcing environment to development to prevent accidental production deployment")
        settings.environment = Environment.DEVELOPMENT
        settings.debug = True

    # Log the configuration on first load
    settings.log_config()

    return settings