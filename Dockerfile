# Use an official Node.js runtime as the base image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (root)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (App Runner defaults to 8080)
EXPOSE 8080

# Environment variable for port
ENV PORT=8080

# Define the command to run the app
CMD [ "node", "server.js" ]
