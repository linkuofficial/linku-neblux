# ─── Build stage: frontend ───────────────────────────────────────
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY vite.config.ts tsconfig.json ./
COPY frontend/ frontend/
RUN npm run build

# ─── Production stage ────────────────────────────────────────────
FROM python:3.12-slim
WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend + data + built frontend
COPY backend/ backend/
COPY data/ data/
COPY config.yaml ./
COPY --from=frontend-build /app/dist/ dist/

# Runtime configuration
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DEBUG=false
EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
