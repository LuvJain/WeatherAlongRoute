"""
Weather-related API routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator

from app.services.openweather_service import OpenWeatherService
from app.utils.error_handling import (
    error_context, handle_errors, WeatherPlanningError,
    WeatherDataError, InvalidInputError, APIConnectionError
)

router = APIRouter(tags=["weather"])

class Coordinates(BaseModel):
    """Coordinate model for latitude and longitude"""
    lat: float = Field(..., description="Latitude coordinate")
    lon: float = Field(..., description="Longitude coordinate")

    @validator("lat")
    def validate_latitude(cls, v):
        """Validate latitude is within valid range"""
        if v < -90 or v > 90:
            raise ValueError("Latitude must be between -90 and 90 degrees")
        return v

    @validator("lon")
    def validate_longitude(cls, v):
        """Validate longitude is within valid range"""
        if v < -180 or v > 180:
            raise ValueError("Longitude must be between -180 and 180 degrees")
        return v

class RouteCoordinates(BaseModel):
    """Model for a route with multiple coordinates"""
    coordinates: List[Coordinates] = Field(..., description="Array of coordinates defining the route")

    @validator("coordinates")
    def validate_coordinates_length(cls, v):
        """Validate route has at least two coordinates"""
        if len(v) < 1:
            raise ValueError("Route must have at least one coordinate")
        return v

class WeatherResponse(BaseModel):
    """Weather response model"""
    location: Coordinates
    temperature: float
    description: str
    humidity: int
    wind_speed: float
    weather_conditions: str

    class Config:
        schema_extra = {
            "example": {
                "location": {"lat": 40.7128, "lon": -74.0060},
                "temperature": 22.5,
                "description": "Partly cloudy",
                "humidity": 65,
                "wind_speed": 5.2,
                "weather_conditions": "Clouds"
            }
        }

@router.get("/weather", response_model=WeatherResponse)
@handle_errors(
    fallback_message="Failed to retrieve weather data",
    expected_exceptions={
        ConnectionError: lambda e: APIConnectionError("OpenWeatherMap", str(e)),
        TimeoutError: lambda e: APIConnectionError("OpenWeatherMap", "Connection timed out"),
        ValueError: lambda e: WeatherDataError(str(e))
    }
)
async def get_weather(
    request: Request,
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    units: Optional[str] = Query("metric", description="Units of measurement (metric, imperial, standard)")
):
    """
    Get current weather for a location

    Args:
        request: FastAPI request object
        lat: Latitude coordinate (-90 to 90)
        lon: Longitude coordinate (-180 to 180)
        units: Units of measurement (metric, imperial, standard)

    Returns:
        Weather data for the specified location

    Raises:
        InvalidInputError: If coordinates are invalid
        WeatherDataError: If weather data can't be retrieved
        APIConnectionError: If OpenWeatherMap API is unavailable
    """
    # Validate units
    valid_units = ["metric", "imperial", "standard"]
    if units not in valid_units:
        raise InvalidInputError(
            f"Units must be one of: {', '.join(valid_units)}",
            field="units"
        )

    # Validate coordinates
    if lat < -90 or lat > 90:
        raise InvalidInputError("Latitude must be between -90 and 90 degrees", field="lat")

    if lon < -180 or lon > 180:
        raise InvalidInputError("Longitude must be between -180 and 180 degrees", field="lon")

    weather_service = OpenWeatherService()

    # Use error context to provide additional context for error handling
    with error_context(
        context={"location": {"lat": lat, "lon": lon}, "units": units},
        request=request,
        fallback_message=f"Failed to retrieve weather data for coordinates ({lat}, {lon})"
    ):
        weather_data = await weather_service.get_weather_by_coordinates(lat, lon, units=units)
        return weather_data

@router.post("/route-weather", response_model=List[WeatherResponse])
@handle_errors(
    fallback_message="Failed to retrieve route weather data",
    expected_exceptions={
        ConnectionError: lambda e: APIConnectionError("OpenWeatherMap", str(e)),
        TimeoutError: lambda e: APIConnectionError("OpenWeatherMap", "Connection timed out"),
        ValueError: lambda e: WeatherDataError(str(e))
    }
)
async def get_route_weather(
    request: Request,
    route: RouteCoordinates,
    units: Optional[str] = Query("metric", description="Units of measurement (metric, imperial, standard)")
):
    """
    Get weather data for multiple points along a route

    Args:
        request: FastAPI request object
        route: Route coordinates model containing list of lat/lon coordinates
        units: Units of measurement (metric, imperial, standard)

    Returns:
        List of weather data for points along the route

    Raises:
        InvalidInputError: If route coordinates are invalid
        WeatherDataError: If weather data can't be retrieved
        APIConnectionError: If OpenWeatherMap API is unavailable
    """
    # Validate units
    valid_units = ["metric", "imperial", "standard"]
    if units not in valid_units:
        raise InvalidInputError(
            f"Units must be one of: {', '.join(valid_units)}",
            field="units"
        )

    weather_service = OpenWeatherService()

    # Use error context to provide additional context for error handling
    with error_context(
        context={
            "route_points": len(route.coordinates),
            "units": units
        },
        request=request,
        fallback_message="Failed to retrieve weather data for route"
    ):
        weather_data = await weather_service.get_route_weather(route.coordinates, units=units)
        return weather_data