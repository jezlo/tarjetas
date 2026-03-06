# Use Node 14 as the base image
FROM node:14

# Set the working directory to /app
WORKDIR /app

# Copy root package.json to /app (contains all frontend dependencies)
# Note: build context must be the repository root (see docker-compose.yml)
COPY package.json /app/

# Install dependencies
RUN npm install

# Copy frontend source code to /app
COPY frontend/ /app/

# Expose port 3000
EXPOSE 3000

# Run the application in development mode
CMD ["npm", "start"]