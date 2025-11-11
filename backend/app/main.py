"""
Main application entry point for the WeatherPlanning backend
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.routes import weather_routes

# Create FastAPI application
app = FastAPI(
    title="WeatherPlanning API",
    description="Backend API for the WeatherPlanning application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(weather_routes.router, prefix="/api/v1")

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to the WeatherPlanning API"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}