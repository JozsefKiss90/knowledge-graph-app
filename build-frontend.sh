#!/bin/bash

# Set your backend URL
API_URL="https://knowledge-graph-backend-production.up.railway.app"

# Build and tag your image with automatic injection
docker build \
  --build-arg REACT_APP_API_URL=$API_URL \
  -t jozsefkiss90/knowledge-graph-frontend \
  -f frontend/Dockerfile .
