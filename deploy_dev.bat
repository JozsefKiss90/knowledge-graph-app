@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ===========================
REM Dev deployment (local)
REM Uses docker-compose.dev.yml
REM ===========================

set COMPOSE_FILE=docker-compose.dev.yml
set PROJECT_NAME=knowledge-graph-app-dev

echo.
echo [DEV] Stopping previous dev stack (if any)...
docker compose -p %PROJECT_NAME% -f %COMPOSE_FILE% down --remove-orphans
IF %ERRORLEVEL% NEQ 0 (
  echo [DEV] WARN: down returned non-zero. Continuing...
)

echo.
echo [DEV] Building images defined in %COMPOSE_FILE% ...
docker compose -p %PROJECT_NAME% -f %COMPOSE_FILE% build --pull
IF %ERRORLEVEL% NEQ 0 (
  echo [DEV] ERROR: build failed.
  exit /b %ERRORLEVEL%
)

echo.
echo [DEV] Starting containers...
docker compose -p %PROJECT_NAME% -f %COMPOSE_FILE% up -d
IF %ERRORLEVEL% NEQ 0 (
  echo [DEV] ERROR: up failed.
  exit /b %ERRORLEVEL%
)

echo.
echo [DEV] Running containers:
docker compose -p %PROJECT_NAME% -f %COMPOSE_FILE% ps

echo.
echo [DEV] Frontend: http://localhost:3001
echo [DEV] Backend:  http://localhost:8000
echo [DEV] Neo4j:    http://localhost:7474  (bolt: localhost:7687)
echo.
endlocal
