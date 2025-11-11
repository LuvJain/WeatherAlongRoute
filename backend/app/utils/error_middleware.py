"""
FastAPI error handler middleware for global error processing
"""
import time
import logging
import traceback
from typing import Callable, Dict, Any, Optional
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.utils.error_handling import ErrorHandler, WeatherPlanningError

logger = logging.getLogger(__name__)

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware for handling errors in FastAPI requests"""

    def __init__(
        self,
        app: FastAPI,
        error_handler: ErrorHandler,
        include_diagnostic_info: bool = False
    ):
        """
        Initialize the error handler middleware

        Args:
            app: FastAPI application
            error_handler: ErrorHandler instance to use for error handling
            include_diagnostic_info: Whether to include diagnostic info in responses
        """
        super().__init__(app)
        self.error_handler = error_handler
        self.include_diagnostic_info = include_diagnostic_info

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and handle any errors

        Args:
            request: FastAPI request
            call_next: Next middleware or route handler

        Returns:
            Response object
        """
        request_id = f"{request.client.host}-{time.time()}"
        request_start_time = time.time()

        # Add request ID to request state for tracking
        request.state.request_id = request_id

        try:
            # Process the request
            response = await call_next(request)

            # Log request completion time for performance monitoring
            process_time = time.time() - request_start_time
            response.headers["X-Process-Time"] = str(process_time)

            return response

        except WeatherPlanningError as exc:
            # Handle custom application exceptions
            diagnostic_info = self.error_handler.log_error(
                exc,
                level="error",
                request=request,
                additional_context=exc.context if hasattr(exc, "context") else None
            )

            # Create response with user-friendly message
            content = {"detail": exc.user_friendly_message()}

            # Include diagnostic info if enabled and in development environment
            if self.include_diagnostic_info:
                content["diagnostic_info"] = diagnostic_info.dict()

            return JSONResponse(
                status_code=exc.status_code,
                content=content
            )

        except Exception as exc:
            # Handle unexpected exceptions
            diagnostic_info = self.error_handler.log_error(
                exc,
                level="error",
                request=request
            )

            # Create response with generic error message
            content = {"detail": "An unexpected error occurred. Please try again later."}

            # Include diagnostic info if enabled
            if self.include_diagnostic_info:
                content["diagnostic_info"] = diagnostic_info.dict()
                content["exception_type"] = exc.__class__.__name__
                content["exception_message"] = str(exc)

            return JSONResponse(
                status_code=500,
                content=content
            )


def configure_error_middleware(
    app: FastAPI,
    error_handler: Optional[ErrorHandler] = None,
    include_diagnostic_info: bool = False
) -> None:
    """
    Configure error handling middleware for the FastAPI application

    Args:
        app: FastAPI application instance
        error_handler: ErrorHandler instance to use
        include_diagnostic_info: Whether to include diagnostic info in responses
    """
    from app.utils.error_handling import default_error_handler

    handler = error_handler or default_error_handler

    # Add error handling middleware
    app.add_middleware(
        ErrorHandlerMiddleware,
        error_handler=handler,
        include_diagnostic_info=include_diagnostic_info
    )