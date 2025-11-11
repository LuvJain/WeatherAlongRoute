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
import uvicorn
from dotenv import load_dotenv
from app.config.settings import get_settings, Environment

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
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
    return parser.parse_args()


def load_environment_variables(env=None):
    """
    Load environment variables from .env file and set command-line overrides

    Args:
        env: Optional environment to use (development, testing, production)
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


def validate_configuration():
    """
    Validate the application configuration

    Raises:
        ValueError: If the configuration is invalid
    """
    settings = get_settings()

    # Validate OpenWeather API key is set
    if not settings.openweather_api_key:
        logger.warning("OpenWeather API key is not set, weather data will not be available")

    # Validate production safety checks
    if settings.environment == Environment.PRODUCTION:
        if settings.debug:
            raise ValueError("Debug mode should be disabled in production environment")

        if "*" in settings.allowed_origins:
            raise ValueError("CORS allow_origins should not include '*' in production environment")

    # All validations passed
    logger.info("Configuration validated successfully")


def main():
    """Main server entry point"""
    try:
        # Parse command-line arguments
        args = parse_arguments()

        # Load environment variables
        load_environment_variables(args.env)

        # Get application settings
        settings = get_settings()

        # Override host/port from command-line if provided
        host = args.host or settings.host
        port = args.port or settings.port

        # Validate configuration
        validate_configuration()

        # Run the server
        logger.info(f"Starting WeatherPlanning API server on {host}:{port}")
        logger.info(f"Environment: {settings.environment}")

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
            log_level="debug" if settings.debug else "info",
        )

    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.exception(f"Unhandled error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()