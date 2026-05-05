@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ==========================================
REM Production image build + push to Docker Hub
REM ==========================================

REM ---- Edit these if needed ----
set DOCKERHUB_USER=jozsefkiss90
set BACKEND_IMAGE=%DOCKERHUB_USER%/knowledge-graph-backend
set FRONTEND_IMAGE=%DOCKERHUB_USER%/knowledge-graph-frontend

REM Railway backend URL (used by React build)
set REACT_APP_API_URL=https://knowledge-graph-backend-production.up.railway.app

REM Optional: also tag a version (e.g., git SHA). Leave empty to skip.
REM Optional: also tag a version (e.g., timestamp). Leave empty to skip.
for /f "tokens=1-4 delims=/ " %%a in ("%date%") do set d=%%d%%b%%c
for /f "tokens=1-2 delims=: " %%a in ("%time%") do set t=%%a%%b
set VERSION_TAG=%d%-%t%

echo.
echo [PROD] Checking Docker login...
docker info >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo [PROD] ERROR: Docker is not running or not reachable.
  exit /b 1
)

echo.
echo [PROD] Building backend image: %BACKEND_IMAGE%:latest
docker build ^
  -f backend\Dockerfile.backend.prod ^
  -t %BACKEND_IMAGE%:latest ^
  backend
IF %ERRORLEVEL% NEQ 0 (
  echo [PROD] ERROR: Backend build failed.
  exit /b %ERRORLEVEL%
)

echo.
echo [PROD] Building frontend image: %FRONTEND_IMAGE%:latest
docker build ^
  -f frontend\Dockerfile.frontend.prod ^
  --build-arg REACT_APP_API_URL=%REACT_APP_API_URL% ^
  -t %FRONTEND_IMAGE%:latest ^
  frontend
IF %ERRORLEVEL% NEQ 0 (
  echo [PROD] ERROR: Frontend build failed.
  exit /b %ERRORLEVEL%
)

REM Optional version tagging
IF NOT "%VERSION_TAG%"=="" (
  echo.
  echo [PROD] Tagging version: %VERSION_TAG%
  docker tag %BACKEND_IMAGE%:latest %BACKEND_IMAGE%:%VERSION_TAG%
  docker tag %FRONTEND_IMAGE%:latest %FRONTEND_IMAGE%:%VERSION_TAG%
)

echo.
echo [PROD] Pushing backend: %BACKEND_IMAGE%:latest
docker push %BACKEND_IMAGE%:latest
IF %ERRORLEVEL% NEQ 0 (
  echo [PROD] ERROR: Backend push failed.
  exit /b %ERRORLEVEL%
)

echo.
echo [PROD] Pushing frontend: %FRONTEND_IMAGE%:latest
docker push %FRONTEND_IMAGE%:latest
IF %ERRORLEVEL% NEQ 0 (
  echo [PROD] ERROR: Frontend push failed.
  exit /b %ERRORLEVEL%
)

IF NOT "%VERSION_TAG%"=="" (
  echo.
  echo [PROD] Pushing backend version: %BACKEND_IMAGE%:%VERSION_TAG%
  docker push %BACKEND_IMAGE%:%VERSION_TAG%

  echo.
  echo [PROD] Pushing frontend version: %FRONTEND_IMAGE%:%VERSION_TAG%
  docker push %FRONTEND_IMAGE%:%VERSION_TAG%
)

echo.
echo [PROD] Done.
echo [PROD] Backend image:  %BACKEND_IMAGE%:latest
echo [PROD] Frontend image: %FRONTEND_IMAGE%:latest
echo [PROD] React API URL baked into frontend: %REACT_APP_API_URL%
echo.
endlocal
