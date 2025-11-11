"""
Main application entry point for the WeatherPlanning backend
"""
import os
import logging
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.routes import weather_routes
from app.config.settings import get_settings, Settings, Environment
from app.utils.error_handling import (
    ErrorHandler, ErrorLogConfig, configure_error_handlers,
    error_context, WeatherPlanningError, ConfigurationError
)
from app.utils.error_middleware import configure_error_middleware

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("app.main")

def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application based on environment settings

    Returns:
        Configured FastAPI application
    """
    settings = get_settings()

    # Create FastAPI application with environment-specific configuration
    app_kwargs = {
        "title": "WeatherPlanning API",
        "description": "Backend API for the WeatherPlanning application",
        "version": "1.0.0",
        "debug": settings.debug,
        "openapi_url": None if settings.environment == "production" else "/openapi.json",
        "docs_url": None if settings.environment == "production" else "/docs",
        "redoc_url": None if settings.environment == "production" else "/redoc",
    }

    app = FastAPI(**app_kwargs)

    # Log application startup
    logger.info(f"Starting WeatherPlanning API in {settings.environment} mode")

    # Configure error handling
    # Create error log configuration based on environment
    error_log_config = ErrorLogConfig(
        app_name="weatherplanning",
        log_level="debug" if settings.debug else "info",
        console_output=True,
        file_output=settings.environment != Environment.DEVELOPMENT,
        file_format="json" if settings.environment == Environment.PRODUCTION else "text",
        include_traceback=settings.environment != Environment.PRODUCTION,
    )

    # Initialize error handler with configuration
    error_handler = ErrorHandler(config=error_log_config)

    # Configure FastAPI exception handlers
    configure_error_handlers(app, error_handler)

    # Configure error middleware with diagnostic info in non-production environments
    include_diagnostic_info = settings.environment != Environment.PRODUCTION
    configure_error_middleware(app, error_handler, include_diagnostic_info)

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(weather_routes.router, prefix="/api/v1")

    # Add error and diagnostic endpoints
    @app.get("/")
    async def root():
        """Root endpoint"""
        return {
            "message": "Welcome to the WeatherPlanning API",
            "environment": settings.environment,
            "version": "1.0.0"
        }

    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "environment": settings.environment
        }

    @app.get("/config", include_in_schema=False)
    async def show_config(settings: Settings = Depends(get_settings)):
        """
        Show application configuration (excluding sensitive values)
        Only available in development and testing environments
        """
        if settings.environment == Environment.PRODUCTION:
            raise ConfigurationError("Configuration endpoint not available in production")

        masked_config = {k: "****" if k.endswith("_key") or k.endswith("_secret") else v
                        for k, v in settings.dict().items()}
        return masked_config

    @app.get("/diagnostic", include_in_schema=False)
    async def diagnostic(request: Request):
        """
        Diagnostic endpoint for testing error handling
        Only available in non-production environments
        """
        settings = get_settings()

        if settings.environment == Environment.PRODUCTION:
            raise ConfigurationError("Diagnostic endpoint not available in production")

        # Get error type from query param
        error_type = request.query_params.get("error", "none")

        # Test different error types
        if error_type == "client":
            raise WeatherPlanningError(
                "Test client error",
                status_code=400,
                context={"test": True}
            )
        elif error_type == "server":
            raise WeatherPlanningError(
                "Test server error",
                status_code=500,
                context={"test": True}
            )
        elif error_type == "unhandled":
            # This will be caught by the global exception handler
            x = 1 / 0  # Deliberate ZeroDivisionError

        # If no error requested, return diagnostic info
        return {
            "message": "Diagnostic endpoint",
            "environment": settings.environment,
            "debug": settings.debug,
            "available_errors": ["client", "server", "unhandled"]
        }

    # Log post-initialization summary
    logger.info(f"Server initialized with configuration from environment: {settings.environment}")
    logger.info(f"Error handling and diagnostic infrastructure configured")

    return app

app = create_application()