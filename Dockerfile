# Stage 1: Build React frontend
FROM node:18 as frontend-builder
WORKDIR /app/frontend
COPY frontend/ ./
RUN npm install
RUN npm run build

# Stage 2: Set up Python backend
FROM python:3.10-slim as backend
WORKDIR /app

# Copy backend code
COPY backend/ ./backend
COPY requirements.txt .

# Install backend dependencies
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy frontend build output to be served by nginx
COPY --from=frontend-builder /app/frontend/build ./frontend_build

# Stage 3: Set up NGINX + Uvicorn with frontend
FROM nginx:alpine

# Copy NGINX config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy frontend files into nginx public directory
COPY --from=backend /app/frontend_build /usr/share/nginx/html

# Copy backend code
COPY --from=backend /app/backend /app/backend
COPY --from=backend /app/requirements.txt /app/
COPY --from=backend /usr/local/lib/python3.10 /usr/local/lib/python3.10
COPY --from=backend /usr/local/bin /usr/local/bin

# Install Python and Uvicorn inside nginx image
RUN apk add --no-cache python3 py3-pip
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

# Expose ports
EXPOSE 80

# Start both NGINX and Uvicorn (FastAPI)
CMD sh -c "nginx && uvicorn backend.main:app --host 0.0.0.0 --port 8000"
