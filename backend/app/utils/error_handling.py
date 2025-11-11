"""
Error handling and diagnostic infrastructure for the WeatherPlanning application.

This module provides:
1. Centralized error logging mechanism
2. Custom exception classes with user-friendly messages
3. Diagnostic information capture
4. Multiple output format support (console/file)
5. Sensitive information scrubbing from error logs
"""
import os
import sys
import traceback
import logging
import json
import re
import time
import platform
import inspect
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple, Union, Callable
from functools import wraps
from pathlib import Path
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel, Field
from contextlib import contextmanager

from app.config.settings import get_settings, Environment

# Get application settings
settings = get_settings()

# Define logging levels
LOGGING_LEVELS = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warning": logging.WARNING,
    "error": logging.ERROR,
    "critical": logging.CRITICAL
}

# Configure default log directory
DEFAULT_LOG_DIR = Path("logs")
if not DEFAULT_LOG_DIR.exists():
    DEFAULT_LOG_DIR.mkdir(exist_ok=True)


class ErrorLogFormat(str):
    """Format options for error logs"""
    CONSOLE = "console"
    JSON = "json"
    TEXT = "text"


class DiagnosticInfo(BaseModel):
    """Model for diagnostic information captured during errors"""
    timestamp: str
    exception_type: str
    exception_message: str
    traceback: List[str]
    request_info: Optional[Dict[str, Any]] = None
    system_info: Dict[str, Any]
    additional_context: Optional[Dict[str, Any]] = None


class ErrorLogConfig:
    """Configuration for error logging"""
    def __init__(
        self,
        app_name: str = "weatherplanning",
        log_level: str = "info",
        console_output: bool = True,
        file_output: bool = True,
        file_format: str = ErrorLogFormat.JSON,
        log_dir: Optional[Path] = None,
        max_log_size_mb: int = 10,
        backup_count: int = 3,
        sensitive_patterns: Optional[List[str]] = None,
        include_traceback: bool = True
    ):
        """
        Initialize error logging configuration

        Args:
            app_name: Name of the application for log identification
            log_level: Logging level (debug, info, warning, error, critical)
            console_output: Whether to output logs to console
            file_output: Whether to output logs to file
            file_format: Format for file logs (json or text)
            log_dir: Directory for log files
            max_log_size_mb: Maximum size of log files in MB
            backup_count: Number of backup log files to keep
            sensitive_patterns: List of regex patterns for sensitive information
            include_traceback: Whether to include traceback in logs
        """
        self.app_name = app_name
        self.log_level = LOGGING_LEVELS.get(log_level.lower(), logging.INFO)
        self.console_output = console_output
        self.file_output = file_output
        self.file_format = file_format
        self.log_dir = log_dir or DEFAULT_LOG_DIR
        self.max_log_size_bytes = max_log_size_mb * 1024 * 1024
        self.backup_count = backup_count
        self.include_traceback = include_traceback

        # Default sensitive patterns (API keys, passwords, tokens, etc.)
        default_patterns = [
            r"api[-_]?key\w*\s*[:=]\s*[\"']?([^\"',\s]+)",
            r"password\w*\s*[:=]\s*[\"']?([^\"',\s]+)",
            r"secret\w*\s*[:=]\s*[\"']?([^\"',\s]+)",
            r"token\w*\s*[:=]\s*[\"']?([^\"',\s]+)",
            r"access[-_]?key\w*\s*[:=]\s*[\"']?([^\"',\s]+)",
            r"auth\w*\s*[:=]\s*[\"']?([^\"',\s]+)"
        ]

        self.sensitive_patterns = sensitive_patterns or default_patterns


# Define custom exception classes
class WeatherPlanningError(Exception):
    """Base exception for all WeatherPlanning application errors"""
    def __init__(self, message: str, status_code: int = 500, context: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.context = context or {}
        super().__init__(self.message)

    def user_friendly_message(self) -> str:
        """Return a user-friendly error message"""
        return self.message


class ConfigurationError(WeatherPlanningError):
    """Exception raised for configuration errors"""
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(f"Configuration error: {message}", status_code=500, context=context)

    def user_friendly_message(self) -> str:
        return "The application is not configured correctly. Please contact support."


class APIConnectionError(WeatherPlanningError):
    """Exception raised for errors connecting to external APIs"""
    def __init__(self, api_name: str, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(
            f"Error connecting to {api_name}: {message}",
            status_code=503,
            context=context
        )
        self.api_name = api_name

    def user_friendly_message(self) -> str:
        return f"Unable to connect to {self.api_name}. Please check your internet connection and try again later."


class WeatherDataError(WeatherPlanningError):
    """Exception raised for errors with weather data"""
    def __init__(self, message: str, location: Optional[Dict[str, float]] = None, context: Optional[Dict[str, Any]] = None):
        context_with_location = context or {}
        if location:
            context_with_location["location"] = location

        super().__init__(
            f"Weather data error: {message}",
            status_code=500,
            context=context_with_location
        )
        self.location = location

    def user_friendly_message(self) -> str:
        location_str = ""
        if self.location:
            lat = self.location.get("lat")
            lon = self.location.get("lon")
            if lat is not None and lon is not None:
                location_str = f" for location ({lat}, {lon})"

        return f"Unable to retrieve weather data{location_str}. Please try again later."


class InvalidInputError(WeatherPlanningError):
    """Exception raised for invalid input data"""
    def __init__(self, message: str, field: Optional[str] = None, context: Optional[Dict[str, Any]] = None):
        context_with_field = context or {}
        if field:
            context_with_field["field"] = field

        super().__init__(
            f"Invalid input: {message}",
            status_code=400,
            context=context_with_field
        )
        self.field = field

    def user_friendly_message(self) -> str:
        field_str = f" ({self.field})" if self.field else ""
        return f"Invalid input{field_str}: {self.message}"


# ErrorHandler class for centralized error handling
class ErrorHandler:
    """Centralized error handling and logging for the application"""
    _instance = None

    def __new__(cls, config: Optional[ErrorLogConfig] = None):
        if cls._instance is None:
            cls._instance = super(ErrorHandler, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, config: Optional[ErrorLogConfig] = None):
        if self._initialized:
            return

        self.config = config or ErrorLogConfig()
        self.logger = self._setup_logger()
        self._initialized = True

    def _setup_logger(self) -> logging.Logger:
        """Set up the logger with the configured handlers"""
        logger = logging.getLogger(f"{self.config.app_name}.error")
        logger.setLevel(self.config.log_level)
        logger.propagate = False  # Don't propagate to the root logger

        # Remove existing handlers
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)

        # Add console handler if enabled
        if self.config.console_output:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(self.config.log_level)
            console_formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)

        # Add file handler if enabled
        if self.config.file_output:
            # Ensure log directory exists
            os.makedirs(self.config.log_dir, exist_ok=True)

            # Set up rotating file handler
            from logging.handlers import RotatingFileHandler

            log_file = self.config.log_dir / f"{self.config.app_name}.log"
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=self.config.max_log_size_bytes,
                backupCount=self.config.backup_count
            )
            file_handler.setLevel(self.config.log_level)

            # Set formatter based on configured format
            if self.config.file_format == ErrorLogFormat.JSON:
                file_formatter = JsonFormatter()
            else:
                file_formatter = logging.Formatter(
                    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
                )

            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)

        return logger

    def log_error(
        self,
        error: Exception,
        level: str = "error",
        request: Optional[Request] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> DiagnosticInfo:
        """
        Log an error with diagnostic information

        Args:
            error: The exception to log
            level: Logging level (debug, info, warning, error, critical)
            request: FastAPI request object if available
            additional_context: Any additional context to include

        Returns:
            DiagnosticInfo object with captured diagnostic information
        """
        log_level = LOGGING_LEVELS.get(level.lower(), logging.ERROR)

        # Capture diagnostic information
        diagnostic_info = self._capture_diagnostic_info(error, request, additional_context)

        # Scrub sensitive information
        scrubbed_info = self._scrub_sensitive_info(diagnostic_info)

        # Log the error
        if isinstance(error, WeatherPlanningError):
            self.logger.log(log_level, f"{error.__class__.__name__}: {error.message}",
                           extra={"diagnostic_info": scrubbed_info.dict()})
        else:
            self.logger.log(log_level, f"{error.__class__.__name__}: {str(error)}",
                           extra={"diagnostic_info": scrubbed_info.dict()})

        return diagnostic_info

    def _capture_diagnostic_info(
        self,
        error: Exception,
        request: Optional[Request] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> DiagnosticInfo:
        """
        Capture diagnostic information about the error

        Args:
            error: The exception to capture information for
            request: FastAPI request object if available
            additional_context: Any additional context to include

        Returns:
            DiagnosticInfo object with captured diagnostic information
        """
        # Capture exception information
        exc_type = type(error).__name__
        exc_message = str(error)

        # Capture traceback
        tb_list = traceback.format_exception(type(error), error, error.__traceback__)

        # Capture request information if available
        request_info = None
        if request:
            request_info = {
                "method": request.method,
                "url": str(request.url),
                "headers": dict(request.headers),
                "client_host": request.client.host if request.client else None,
            }

        # Capture system information
        system_info = {
            "python_version": sys.version,
            "platform": platform.platform(),
            "environment": settings.environment.value,
            "app_version": "1.0.0",  # Replace with actual version from config
        }

        # Build diagnostic info
        return DiagnosticInfo(
            timestamp=datetime.now().isoformat(),
            exception_type=exc_type,
            exception_message=exc_message,
            traceback=tb_list if self.config.include_traceback else [],
            request_info=request_info,
            system_info=system_info,
            additional_context=additional_context
        )

    def _scrub_sensitive_info(self, diagnostic_info: DiagnosticInfo) -> DiagnosticInfo:
        """
        Scrub sensitive information from diagnostic info

        Args:
            diagnostic_info: The diagnostic information to scrub

        Returns:
            DiagnosticInfo with sensitive information removed
        """
        # Create a copy of the diagnostic info
        info_dict = diagnostic_info.dict()

        # Scrub traceback
        scrubbed_traceback = []
        for tb_line in info_dict["traceback"]:
            scrubbed_line = tb_line
            for pattern in self.config.sensitive_patterns:
                scrubbed_line = re.sub(pattern, r'\1="****"', scrubbed_line)
            scrubbed_traceback.append(scrubbed_line)
        info_dict["traceback"] = scrubbed_traceback

        # Scrub request headers if available
        if info_dict["request_info"] and "headers" in info_dict["request_info"]:
            headers = info_dict["request_info"]["headers"]
            for key in headers:
                if any(keyword in key.lower() for keyword in ["auth", "token", "secret", "key", "password"]):
                    headers[key] = "****"

        # Scrub additional context
        if info_dict["additional_context"]:
            context = info_dict["additional_context"]
            for key in list(context.keys()):
                if any(keyword in key.lower() for keyword in ["auth", "token", "secret", "key", "password"]):
                    context[key] = "****"

        return DiagnosticInfo(**info_dict)


class JsonFormatter(logging.Formatter):
    """JSON formatter for log messages"""
    def format(self, record):
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include exception info
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info)
            }

        # Include diagnostic info if available
        if hasattr(record, "diagnostic_info"):
            log_data["diagnostic_info"] = record.diagnostic_info

        return json.dumps(log_data)


# FastAPI exception handler
def configure_error_handlers(app: FastAPI, error_handler: ErrorHandler) -> None:
    """
    Configure global exception handlers for FastAPI application

    Args:
        app: FastAPI application instance
        error_handler: ErrorHandler instance
    """
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        """Handle HTTP exceptions"""
        error_handler.log_error(exc, level="warning", request=request)

        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        """Handle request validation errors"""
        error_handler.log_error(
            exc,
            level="warning",
            request=request,
            additional_context={"validation_errors": exc.errors()}
        )

        # Create user-friendly error message
        errors = exc.errors()
        error_messages = []

        for error in errors:
            location = " -> ".join(str(loc) for loc in error["loc"])
            message = error["msg"]
            error_messages.append(f"{location}: {message}")

        return JSONResponse(
            status_code=422,
            content={"detail": "Validation error", "errors": error_messages}
        )

    @app.exception_handler(WeatherPlanningError)
    async def weather_planning_exception_handler(request: Request, exc: WeatherPlanningError) -> JSONResponse:
        """Handle custom WeatherPlanning exceptions"""
        error_handler.log_error(
            exc,
            level="error",
            request=request,
            additional_context=exc.context if hasattr(exc, "context") else None
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.user_friendly_message()}
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle uncaught exceptions"""
        diagnostic_info = error_handler.log_error(exc, level="error", request=request)

        # Determine if we should return detailed error information
        is_development = settings.environment in (Environment.DEVELOPMENT, Environment.TESTING)

        if is_development:
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "An unexpected error occurred",
                    "error_type": type(exc).__name__,
                    "error_message": str(exc),
                    "traceback": traceback.format_exception(type(exc), exc, exc.__traceback__)
                    if settings.debug else None
                }
            )
        else:
            # In production, return a generic error message
            return JSONResponse(
                status_code=500,
                content={"detail": "An unexpected error occurred. Please try again later."}
            )


# Error context manager
@contextmanager
def error_context(
    error_handler: Optional[ErrorHandler] = None,
    context: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
    fallback_message: str = "An unexpected error occurred"
):
    """
    Context manager for handling errors and providing diagnostic information

    Args:
        error_handler: ErrorHandler instance to use
        context: Additional context to include in logs
        request: FastAPI request if available
        fallback_message: Message to use if an unexpected error occurs

    Yields:
        None

    Raises:
        WeatherPlanningError: If an error occurs within the context
    """
    handler = error_handler or ErrorHandler()

    try:
        yield
    except WeatherPlanningError:
        # Re-raise custom exceptions without modification
        raise
    except Exception as e:
        # Log the error and re-raise as a WeatherPlanningError
        handler.log_error(e, request=request, additional_context=context)
        raise WeatherPlanningError(fallback_message, context=context) from e


# Function decorator for error handling
def handle_errors(
    error_handler: Optional[ErrorHandler] = None,
    fallback_message: str = "An unexpected error occurred",
    expected_exceptions: Optional[Dict[type, Callable[[Exception], WeatherPlanningError]]] = None
):
    """
    Decorator for handling errors in functions

    Args:
        error_handler: ErrorHandler instance to use
        fallback_message: Message to use if an unexpected error occurs
        expected_exceptions: Mapping of exception types to functions that convert them to WeatherPlanningError

    Returns:
        Decorated function
    """
    handler = error_handler or ErrorHandler()

    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except WeatherPlanningError:
                # Re-raise custom exceptions without modification
                raise
            except Exception as e:
                # Check if this is an expected exception type
                if expected_exceptions and type(e) in expected_exceptions:
                    # Convert to appropriate WeatherPlanningError
                    converter = expected_exceptions[type(e)]
                    converted_error = converter(e)
                    # Log the converted error
                    handler.log_error(converted_error)
                    raise converted_error
                else:
                    # Log the error and re-raise as a WeatherPlanningError
                    handler.log_error(e)
                    raise WeatherPlanningError(fallback_message) from e

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except WeatherPlanningError:
                # Re-raise custom exceptions without modification
                raise
            except Exception as e:
                # Check if this is an expected exception type
                if expected_exceptions and type(e) in expected_exceptions:
                    # Convert to appropriate WeatherPlanningError
                    converter = expected_exceptions[type(e)]
                    converted_error = converter(e)
                    # Log the converted error
                    handler.log_error(converted_error)
                    raise converted_error
                else:
                    # Log the error and re-raise as a WeatherPlanningError
                    handler.log_error(e)
                    raise WeatherPlanningError(fallback_message) from e

        # Return async or sync wrapper based on whether the function is async
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


# Default error handler instance
default_error_handler = ErrorHandler()