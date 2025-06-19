@echo off

REM Set the backend API URL
set API_URL=https://knowledge-graph-backend-production.up.railway.app

REM Navigate to frontend directory
cd frontend

REM Build the Docker image with injected API URL
docker build ^
  --build-arg REACT_APP_API_URL=%API_URL% ^
  -t jozsefkiss90/knowledge-graph-frontend:latest ^
  .

REM Push the built image to Docker Hub
docker push jozsefkiss90/knowledge-graph-frontend:latest
