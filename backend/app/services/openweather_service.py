"""
OpenWeatherMap API service
"""
import os
import httpx
import json
from typing import List, Dict, Any, Optional
import logging
from app.config.settings import get_settings
from app.utils.error_handling import (
    error_context, handle_errors, WeatherPlanningError,
    WeatherDataError, APIConnectionError
)

settings = get_settings()
logger = logging.getLogger(__name__)

class OpenWeatherService:
    """Service for interacting with the OpenWeatherMap API"""

    def __init__(self):
        """Initialize the service with configuration settings"""
        self.api_key = settings.openweather_api_key
        self.base_url = "https://api.openweathermap.org/data/2.5"

    @handle_errors(
        fallback_message="Failed to retrieve weather data",
        expected_exceptions={
            httpx.HTTPStatusError: lambda e: APIConnectionError(
                "OpenWeatherMap",
                f"API returned status code {e.response.status_code}: {e.response.text}"
            ),
            httpx.ConnectError: lambda e: APIConnectionError(
                "OpenWeatherMap",
                "Could not connect to the API"
            ),
            httpx.TimeoutException: lambda e: APIConnectionError(
                "OpenWeatherMap",
                "Request timed out"
            )
        }
    )
    async def get_weather_by_coordinates(self, lat: float, lon: float, units: str = "metric") -> Dict[str, Any]:
        """
        Get current weather for specific coordinates

        Args:
            lat: Latitude coordinate
            lon: Longitude coordinate
            units: Units of measurement (metric, imperial, standard)

        Returns:
            Parsed weather data

        Raises:
            APIConnectionError: If OpenWeatherMap API is unavailable
            WeatherDataError: If weather data can't be retrieved or parsed
        """
        # Validate API key
        if not self.api_key:
            raise WeatherDataError(
                "Missing OpenWeatherMap API key",
                location={"lat": lat, "lon": lon}
            )

        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.api_key,
            "units": units
        }

        # Using error_context to provide additional context
        with error_context(
            context={"location": {"lat": lat, "lon": lon}, "units": units},
            fallback_message=f"Failed to retrieve weather data for coordinates ({lat}, {lon})"
        ):
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/weather", params=params)
                response.raise_for_status()  # This will raise HTTPStatusError if the request failed
                data = response.json()

                # Check if response contains error message
                if "cod" in data and data["cod"] != 200:
                    error_msg = data.get("message", "Unknown API error")
                    raise WeatherDataError(
                        f"API error: {error_msg}",
                        location={"lat": lat, "lon": lon}
                    )

                # Check for required fields in response
                if "main" not in data or "weather" not in data or not data["weather"]:
                    raise WeatherDataError(
                        "Invalid or incomplete weather data received",
                        location={"lat": lat, "lon": lon},
                        context={"response": json.dumps(data)}
                    )

                # Transform response to a consistent format
                return self._format_weather_response(data, lat, lon)

    @handle_errors(
        fallback_message="Failed to retrieve route weather data"
    )
    async def get_route_weather(self, coordinates: List[Dict[str, float]], units: str = "metric") -> List[Dict[str, Any]]:
        """
        Get weather for multiple points along a route

        Args:
            coordinates: List of coordinate dictionaries with lat and lon keys
            units: Units of measurement

        Returns:
            List of weather data for each point

        Raises:
            APIConnectionError: If OpenWeatherMap API is unavailable
            WeatherDataError: If weather data can't be retrieved or parsed
        """
        # Sample coordinates if there are too many points
        sampled_coordinates = self._sample_route_coordinates(coordinates, max_points=5)

        # Using error_context to provide additional context
        with error_context(
            context={
                "route_points": len(sampled_coordinates),
                "units": units
            },
            fallback_message="Failed to retrieve weather data for route"
        ):
            # Get weather for each coordinate
            weather_results = []
            for coord in sampled_coordinates:
                try:
                    weather_data = await self.get_weather_by_coordinates(
                        coord["lat"], coord["lon"], units=units
                    )
                    weather_results.append(weather_data)
                except WeatherPlanningError as e:
                    # Log error but continue with other coordinates
                    logger.warning(
                        f"Failed to get weather for coordinate ({coord['lat']}, {coord['lon']}): {str(e)}"
                    )
                    # If this is the only point, re-raise the error
                    if len(sampled_coordinates) == 1:
                        raise

            # If we couldn't get any weather data, raise an error
            if not weather_results:
                raise WeatherDataError(
                    "Failed to retrieve weather data for any points on the route",
                    context={"coordinates": coordinates}
                )

            return weather_results

    def _sample_route_coordinates(self, coordinates: List[Dict[str, float]], max_points: int = 5) -> List[Dict[str, float]]:
        """
        Sample route coordinates to reduce the number of API calls

        Args:
            coordinates: Full list of coordinates
            max_points: Maximum number of points to return

        Returns:
            Sampled list of coordinates
        """
        if len(coordinates) <= max_points:
            return coordinates

        sampled = []
        step = max(1, len(coordinates) // max_points)

        # Always include start and end points
        sampled.append(coordinates[0])

        # Add intermediate points
        for i in range(step, len(coordinates) - 1, step):
            sampled.append(coordinates[i])

        # Add end point if not already included
        if coordinates[-1] != sampled[-1]:
            sampled.append(coordinates[-1])

        return sampled

    def _format_weather_response(self, data: Dict[str, Any], lat: float, lon: float) -> Dict[str, Any]:
        """
        Format raw OpenWeatherMap API response to a consistent format

        Args:
            data: Raw API response
            lat: Original latitude
            lon: Original longitude

        Returns:
            Formatted weather data
        """
        try:
            return {
                "location": {
                    "lat": lat,
                    "lon": lon
                },
                "temperature": data.get("main", {}).get("temp"),
                "description": data.get("weather", [{}])[0].get("description", ""),
                "humidity": data.get("main", {}).get("humidity"),
                "wind_speed": data.get("wind", {}).get("speed"),
                "weather_conditions": data.get("weather", [{}])[0].get("main", "")
            }
        except Exception as e:
            # If there's any error in formatting, raise a WeatherDataError
            logger.error(f"Error formatting weather response: {str(e)}")
            raise WeatherDataError(
                "Error processing weather data",
                location={"lat": lat, "lon": lon},
                context={"raw_data": json.dumps(data)}
            )