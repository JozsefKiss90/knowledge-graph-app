@echo off
set API_URL=https://knowledge-graph-backend-production.up.railway.app

cd frontend
docker build ^
  --build-arg REACT_APP_API_URL=https://knowledge-graph-backend-production.up.railway.app ^
  -t jozsefkiss90/knowledge-graph-frontend ^
  .