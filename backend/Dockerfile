# Use official Python image
FROM python:3.9

# Set working directory inside the container
WORKDIR /app

# Copy only requirements.txt first for caching layers
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend folder
COPY . .

# Expose port for FastAPI
EXPOSE 8000

# ✅ Update CMD to reflect the new main.py location
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
