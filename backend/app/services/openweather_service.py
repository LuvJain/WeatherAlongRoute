"""
OpenWeatherMap API service
"""
import os
import httpx
from typing import List, Dict, Any, Optional
import logging
from app.config.settings import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class OpenWeatherService:
    """Service for interacting with the OpenWeatherMap API"""

    def __init__(self):
        """Initialize the service with configuration settings"""
        self.api_key = settings.openweather_api_key
        self.base_url = "https://api.openweathermap.org/data/2.5"

    async def get_weather_by_coordinates(self, lat: float, lon: float, units: str = "metric") -> Dict[str, Any]:
        """
        Get current weather for specific coordinates

        Args:
            lat: Latitude coordinate
            lon: Longitude coordinate
            units: Units of measurement (metric, imperial, standard)

        Returns:
            Parsed weather data
        """
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.api_key,
            "units": units
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/weather", params=params)
                response.raise_for_status()
                data = response.json()

                # Transform response to a consistent format
                return self._format_weather_response(data, lat, lon)
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
            raise ValueError(f"Error fetching weather data: {e.response.text}")
        except Exception as e:
            logger.error(f"Error getting weather data: {str(e)}")
            raise ValueError(f"Error fetching weather data: {str(e)}")

    async def get_route_weather(self, coordinates: List[Dict[str, float]], units: str = "metric") -> List[Dict[str, Any]]:
        """
        Get weather for multiple points along a route

        Args:
            coordinates: List of coordinate dictionaries with lat and lon keys
            units: Units of measurement

        Returns:
            List of weather data for each point
        """
        # Sample coordinates if there are too many points
        sampled_coordinates = self._sample_route_coordinates(coordinates, max_points=5)

        # Get weather for each coordinate
        weather_results = []
        for coord in sampled_coordinates:
            weather_data = await self.get_weather_by_coordinates(coord["lat"], coord["lon"], units=units)
            weather_results.append(weather_data)

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