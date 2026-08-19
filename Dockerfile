FROM node:20-slim AS builder
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npx tsc

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY frontend/ ./frontend/
COPY README.md ./
RUN mkdir -p /app/data
ENV FRONTEND_DIR=/app/frontend
EXPOSE 2666
CMD ["node", "dist/index.js"]
