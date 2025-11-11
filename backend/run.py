"""
WeatherPlanning application server entry point
Supports multiple environments through configuration

Usage:
    python run.py [--env=development|testing|production]
"""
import os
import sys
import logging
import argparse
import traceback
import uvicorn
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from app.config.settings import get_settings, Environment
from app.utils.error_handling import (
    ConfigurationError, WeatherPlanningError, ErrorHandler, ErrorLogConfig
)

# Create logs directory
logs_dir = Path("logs")
logs_dir.mkdir(exist_ok=True)

# Configure logging with both file and console output
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        # Console handler
        logging.StreamHandler(sys.stdout),

        # File handler for startup logs
        logging.FileHandler(
            logs_dir / f"server-{datetime.now().strftime('%Y%m%d')}.log",
            mode="a"
        )
    ]
)
logger = logging.getLogger("server")


def parse_arguments():
    """Parse command-line arguments"""
    parser = argparse.ArgumentParser(
        description="WeatherPlanning API server"
    )
    parser.add_argument(
        "--env",
        choices=["development", "testing", "production"],
        default=None,
        help="Application environment (overrides .env file)"
    )
    parser.add_argument(
        "--host",
        type=str,
        default=None,
        help="Server host (overrides .env file)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="Server port (overrides .env file)"
    )
    parser.add_argument(
        "--log-level",
        choices=["debug", "info", "warning", "error", "critical"],
        default=None,
        help="Logging level (overrides .env file)"
    )
    return parser.parse_args()


def load_environment_variables(env=None):
    """
    Load environment variables from .env file and set command-line overrides

    Args:
        env: Optional environment to use (development, testing, production)

    Returns:
        Path to the loaded environment file
    """
    # Load environment-specific env file if it exists
    env_file = ".env"
    if env:
        env_specific_file = f".env.{env}"
        if os.path.exists(env_specific_file):
            env_file = env_specific_file
            logger.info(f"Using environment-specific config file: {env_specific_file}")
        else:
            logger.warning(f"Environment-specific config file {env_specific_file} not found, using .env")

    # Load environment variables from .env file
    if os.path.exists(env_file):
        load_dotenv(env_file)
        logger.info(f"Loaded environment variables from {env_file}")
    else:
        logger.warning(f"Environment file {env_file} not found, using defaults")

    # Set environment from command-line if provided
    if env:
        os.environ["APP_ENVIRONMENT"] = env
        logger.info(f"Setting environment to {env} from command-line argument")

    return env_file


def validate_configuration():
    """
    Validate the application configuration

    Raises:
        ConfigurationError: If the configuration is invalid
    """
    settings = get_settings()

    # Validate OpenWeather API key is set
    if not settings.openweather_api_key:
        logger.warning("OpenWeather API key is not set, weather data will not be available")

    # Validate production safety checks
    if settings.environment == Environment.PRODUCTION:
        if settings.debug:
            raise ConfigurationError(
                "Debug mode should be disabled in production environment",
                context={"debug": settings.debug, "environment": settings.environment.value}
            )

        if "*" in settings.allowed_origins:
            raise ConfigurationError(
                "CORS allow_origins should not include '*' in production environment",
                context={"allowed_origins": settings.allowed_origins, "environment": settings.environment.value}
            )

    # All validations passed
    logger.info("Configuration validated successfully")


def main():
    """Main server entry point"""
    try:
        # Parse command-line arguments
        args = parse_arguments()

        # Load environment variables
        env_file = load_environment_variables(args.env)

        # Get application settings
        settings = get_settings()

        # Override host/port from command-line if provided
        host = args.host or settings.host
        port = args.port or settings.port

        # Set log level from command line if provided
        log_level = args.log_level or ("debug" if settings.debug else "info")
        log_level_int = getattr(logging, log_level.upper())
        logging.getLogger().setLevel(log_level_int)

        # Configure startup error handler
        error_log_config = ErrorLogConfig(
            app_name="weatherplanning",
            log_level=log_level,
            console_output=True,
            file_output=True,
            file_format="json" if settings.environment == Environment.PRODUCTION else "text",
            include_traceback=settings.environment != Environment.PRODUCTION,
        )
        error_handler = ErrorHandler(config=error_log_config)

        # Validate configuration
        validate_configuration()

        # Run the server
        logger.info(f"Starting WeatherPlanning API server on {host}:{port}")
        logger.info(f"Environment: {settings.environment}")
        logger.info(f"Log level: {log_level}")

        # Print application URL
        if host in ("0.0.0.0", "127.0.0.1", "localhost"):
            logger.info(f"Application available at: http://localhost:{port}")
            logger.info(f"API documentation available at: http://localhost:{port}/docs")

        # Start the server using Uvicorn
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=settings.debug,
            log_level=log_level,
        )

    except ConfigurationError as e:
        # Log configuration errors
        error_handler = ErrorHandler()
        error_handler.log_error(e, level="error")
        logger.error(f"Configuration error: {e.message}")
        sys.exit(1)

    except WeatherPlanningError as e:
        # Log application errors
        error_handler = ErrorHandler()
        error_handler.log_error(e, level="error")
        logger.error(f"Application error: {e.message}")
        sys.exit(1)

    except Exception as e:
        # Log unexpected errors
        error_handler = ErrorHandler()
        error_handler.log_error(e, level="critical")
        logger.critical(f"Unhandled server error: {str(e)}")

        # In development, print full traceback to console
        if os.environ.get("APP_ENVIRONMENT") == Environment.DEVELOPMENT.value:
            logger.critical("Full traceback:")
            traceback.print_exc()

        sys.exit(1)


if __name__ == "__main__":
    main()