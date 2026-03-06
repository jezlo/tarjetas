# Use this Dockerfile to build the backend

# Base image
FROM python:3.8-slim

# Set the working directory
WORKDIR /app

# Copy the requirements file from the parent directory
COPY ../requirements.txt ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 5000

# Command to run the application
CMD ["python", "app.py"]