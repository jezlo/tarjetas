# Use an official Node.js runtime as a parent image
FROM node:14 AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the frontend files into the container
COPY ./frontend ./frontend

# Build the frontend app
RUN npm run build

# Create a new stage from the nginx base image
FROM nginx:alpine

# Copy the built frontend files from the previous stage
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Command to run the nginx server
CMD ["nginx", "-g", "daemon off;"]