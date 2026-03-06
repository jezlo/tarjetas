# Use Node 14 as the base image
FROM node:14

# Set the working directory to /app
WORKDIR /app

# Copy package.json to /app
COPY package.json /app/

# Install dependencies
RUN npm install

# Copy source code to /app
COPY . /app

# Expose port 3000
EXPOSE 3000

# Run the application in development mode
CMD ["npm", "start"]