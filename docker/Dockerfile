# Use the base image with Node.js
FROM node:8.17

# Copy the current directory into the Docker image
COPY . /member-api-v5

# Set working directory for future use
WORKDIR /member-api-v5

# Install the dependencies from package.json
RUN npm install

CMD npm start
