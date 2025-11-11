"""
Main application entry point for the WeatherPlanning backend
"""
import os
import logging
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routes import weather_routes
from app.config.settings import get_settings, Settings

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
        if settings.environment == "production":
            raise HTTPException(status_code=404, detail="Not found")

        masked_config = {k: "****" if k.endswith("_key") or k.endswith("_secret") else v
                        for k, v in settings.dict().items()}
        return masked_config

    # Log post-initialization summary
    logger.info(f"Server initialized with configuration from environment: {settings.environment}")

    return app

app = create_application()