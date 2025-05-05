@echo off
echo Building and starting the app in production mode...

REM Change to the script directory
cd /d %~dp0

REM Stop and remove old containers (but keep volumes)
docker-compose -f docker-compose.yml down

REM Build and start in detached mode
docker-compose -f docker-compose.yml up --build -d

echo App is running at http://localhost (or assigned Railway URL if deployed)
