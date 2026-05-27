# ─── Build stage: frontend ───────────────────────────────────────
FROM node:22.13.0-alpine3.20 AS frontend-build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY vite.config.ts tsconfig.json ./
COPY frontend/ frontend/
RUN npm run build

# ─── Production stage ────────────────────────────────────────────
FROM python:3.12.7-slim
WORKDIR /app

# Create non-root user
RUN useradd -m -u 1000 app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend + whitelist-only data files (exclude generation logs / backups) + built frontend
COPY backend/ backend/
COPY data/all_nodes.json data/
COPY data/field_nodes.json data/
COPY data/display_tags_seed.json data/
COPY data/i18n/ data/i18n/
COPY config.yaml ./
COPY --from=frontend-build /app/dist/ dist/

# Transfer ownership to non-root user
RUN chown -R app:app /app

# Runtime configuration
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DEBUG=false
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

USER app

# JSON-array CMD means uvicorn is PID 1 and receives SIGTERM directly.
# --timeout-graceful-shutdown gives in-flight requests up to 10 s to finish.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-graceful-shutdown", "10"]
