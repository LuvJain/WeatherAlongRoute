"""
Weather-related API routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel, Field
from app.services.openweather_service import OpenWeatherService

router = APIRouter(tags=["weather"])

class Coordinates(BaseModel):
    """Coordinate model for latitude and longitude"""
    lat: float = Field(..., description="Latitude coordinate")
    lon: float = Field(..., description="Longitude coordinate")

class RouteCoordinates(BaseModel):
    """Model for a route with multiple coordinates"""
    coordinates: List[Coordinates] = Field(..., description="Array of coordinates defining the route")

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
async def get_weather(lat: float = Query(...), lon: float = Query(...), units: Optional[str] = "metric"):
    """
    Get current weather for a location
    """
    weather_service = OpenWeatherService()
    try:
        weather_data = await weather_service.get_weather_by_coordinates(lat, lon, units=units)
        return weather_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/route-weather", response_model=List[WeatherResponse])
async def get_route_weather(route: RouteCoordinates, units: Optional[str] = "metric"):
    """
    Get weather data for multiple points along a route
    """
    weather_service = OpenWeatherService()
    try:
        weather_data = await weather_service.get_route_weather(route.coordinates, units=units)
        return weather_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))