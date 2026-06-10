# Stage 1: Build static assets
FROM node:22-alpine AS asset-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tailwind.config.js ./
COPY templates ./templates
COPY scripts ./scripts
RUN npm run build

# Stage 2: Final Python image
FROM python:3.12-slim AS runner
WORKDIR /app

ENV PYTHONUNBUFFERED=1

# Copy build artifacts from asset-builder stage
COPY --from=asset-builder /app/static ./static
COPY --from=asset-builder /app/package.json ./package.json

# Copy application files
COPY app.py database.py requirements.txt ./
COPY templates ./templates
COPY public/uploads ./public/uploads

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000

CMD ["python", "app.py"]

