# Hardware Security Intelligence Pipeline
# Docker container for running the analysis pipeline

FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Create directories for data
RUN mkdir -p discord-exports results threaded-conversations

# Default command (can be overridden)
CMD ["node", "--version"]



