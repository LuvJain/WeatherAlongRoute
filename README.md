# WeatherPlanning

WeatherPlanning is a full-stack application for planning routes with real-time weather forecasts. It consists of a Python FastAPI backend and a React Native mobile frontend.

## Project Overview

This application helps users plan their routes by providing weather forecasts along the way. It integrates with the OpenWeatherMap API to retrieve weather data for specified locations.

### Key Features

- Real-time weather data retrieval from OpenWeatherMap API
- Route weather forecasting with multiple waypoints
- Location-based weather warnings
- Interactive route weather visualization interface
- Environment-aware configuration management

## Tech Stack

### Backend
- **Python 3.9+**
- **FastAPI**: High-performance web framework
- **SQLModel/PostgreSQL**: Database ORM and storage
- **Alembic**: Database migrations
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation and settings management
- **HTTPX**: Asynchronous HTTP client
- **Docker**: Containerization

### Frontend
- **React Native**: Mobile app framework
- **React**: UI library
- **Axios**: HTTP client
- **React Native Google Places Autocomplete**: Location search

## Prerequisites

Before setting up the project, make sure you have the following installed:

- **Python 3.9+**
- **PostgreSQL**: Database for storing application data
- **Node.js and npm**: For the React Native frontend
- **Docker and Docker Compose** (optional): For containerized development

You'll also need:
- **OpenWeatherMap API key**: Sign up at [OpenWeatherMap](https://openweathermap.org/api) to get an API key

## Installation and Setup

### Backend Setup

1. Clone the repository and navigate to the project directory:

   ```bash
   git clone <repository-url>
   cd weatherplanning
   ```

2. Create and activate a virtual environment (recommended):

   ```bash
   # Using venv
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Navigate to the backend directory and install dependencies:

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. Configure environment variables:

   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit the .env file with your configurations
   # Particularly set your OpenWeatherMap API key
   ```

5. Set up the PostgreSQL database:

   ```bash
   # Make sure PostgreSQL is running
   # Create a database named weatherplanning
   createdb weatherplanning

   # Update the DATABASE_URL in your .env file if necessary
   ```

6. Start the backend server:

   ```bash
   # Start the server
   python run.py --env=development

   # The server will be available at http://localhost:8000
   # API documentation will be available at http://localhost:8000/docs
   ```

### Frontend Setup

1. Navigate to the project root directory and install dependencies:

   ```bash
   npm install
   ```

2. Start the React Native development server:

   ```bash
   npm start
   ```

3. Run on Android or iOS:

   ```bash
   # For Android
   npm run android

   # For iOS
   npm run ios
   ```

### Using Docker (Alternative)

For containerized development, you can use Docker Compose:

1. Make sure Docker and Docker Compose are installed

2. Configure your environment variables in `.env.development`

3. Start the containers:

   ```bash
   cd backend
   docker-compose up -d
   ```

4. The API will be available at `http://localhost:8000` and the database at `localhost:5432`

## Configuration Options

The application supports multiple environments through configuration files:

- `.env.development`: Development environment settings
- `.env.testing`: Testing environment settings
- `.env.production`: Production environment settings

Key configuration options include:

- `APP_ENVIRONMENT`: Environment mode (development, testing, production)
- `DEBUG`: Enable/disable debug mode
- `HOST` and `PORT`: Server host and port
- `DATABASE_URL`: PostgreSQL connection string
- `OPENWEATHER_API_KEY`: API key for OpenWeatherMap
- `ALLOWED_ORIGINS`: CORS allowed origins
- `LOG_LEVEL`: Logging detail level

## Development Workflow

### Running Tests

```bash
# Run tests for the backend
cd backend
pytest

# Run tests with coverage report
pytest --cov=app
```

### Code Formatting and Linting

The project includes configuration for black, isort, mypy, and flake8:

```bash
# Format code with black
black app

# Sort imports
isort app

# Type checking
mypy app

# Linting
flake8 app
```

### API Documentation

When running in development mode, interactive API documentation is available:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Troubleshooting

### Common Issues

1. **OpenWeather API Key Issues**

   If you're getting errors related to weather data retrieval:

   - Verify your OpenWeather API key is correctly set in `.env`
   - Check that your API key is active and has the correct permissions
   - Ensure you're not exceeding API rate limits

2. **Database Connection Errors**

   If you're experiencing database connectivity issues:

   - Check if PostgreSQL is running: `pg_isready`
   - Verify your database credentials in `.env`
   - Ensure the database exists: `psql -l | grep weatherplanning`
   - Check if the database user has the correct permissions

3. **Docker Issues**

   If you encounter problems with Docker:

   - Check if containers are running: `docker-compose ps`
   - View container logs: `docker-compose logs -f api`
   - Rebuild containers if necessary: `docker-compose up -d --build`

4. **Python Environment Issues**

   If you're experiencing dependency or environment problems:

   - Verify you're using Python 3.9+: `python --version`
   - Ensure your virtual environment is activated
   - Reinstall dependencies: `pip install -r requirements.txt`
   - Check for conflicting packages: `pip check`

5. **Frontend Issues**

   For React Native problems:

   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`
   - Reset Metro bundler cache: `npm start -- --reset-cache`

### Diagnostic Tools

The backend includes diagnostic endpoints for troubleshooting:

- Health check: `http://localhost:8000/health`
- Config check (dev/test only): `http://localhost:8000/config`
- Diagnostic endpoint (dev/test only): `http://localhost:8000/diagnostic`

## License

[Add license information here]