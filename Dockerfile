# Stage 1: Build & dependency installation
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package manifests
COPY package*.json ./

# Install only production dependencies for the final runner
RUN npm ci --only=production

# Stage 2: Production runtime environment
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Create a non-privileged user and use it for execution
USER node

# Copy dependencies from the builder stage
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package*.json ./

# Copy application source code
COPY --chown=node:node server.js ./
COPY --chown=node:node src ./src

# Expose port (Cloud Run defaults to 8080, but respects process.env.PORT)
EXPOSE 8080

# Command to start the application
CMD ["npm", "start"]
