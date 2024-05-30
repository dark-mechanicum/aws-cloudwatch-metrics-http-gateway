# Build stage for installing node_modules
FROM imbios/bun-node:latest-20-alpine AS build
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package.json ./
COPY package-lock.json* ./

# Install node_modules
RUN bun install

# === Final stage ===
FROM imbios/bun-node:latest-20-alpine
WORKDIR /app

# Copy node_modules from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["bun", "run", "src/index.ts"]
