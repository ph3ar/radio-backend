# Use official Node.js image as the base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN pnpm build

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js server
CMD ["pnpm", "start"]
