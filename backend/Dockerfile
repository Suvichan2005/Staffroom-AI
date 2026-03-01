# ─────────────────────────────────────────────────
# Dockerfile — Staffroom AI Backend
# Multi-stage build for minimal production image
# ─────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ─────────────────────────────────────────────────
FROM node:20-alpine

# Security: run as non-root
RUN addgroup -S staffroom && adduser -S staffroom -G staffroom

WORKDIR /app

# Copy only production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

# Drop to non-root
USER staffroom

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "src/index.js"]
