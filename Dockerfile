# Use an official Node.js runtime as a parent image
FROM node:latest

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json index.js app.js /app/
COPY routes/index.js /app/routes/

# Install any needed dependencies specified in package.json
RUN npm install express socket.io

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 6041

# Define the command to run the app
CMD ["npm", "start"]