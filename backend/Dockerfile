# syntax=docker/dockerfile:1

FROM python:3.8-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements.txt file from the root of the project
COPY requirements.txt .

# Install the required packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend source files (build context must be the repository root)
COPY backend/ .

# Set the command to run the application
CMD ["python", "run.py"]
