FROM python:3.12-slim-bookworm

# Prevent .pyc files and enable immediate log buffering
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies and clean apt cache in a single layer
# apt-get upgrade is important to patch base image vulnerabilities
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (Principle of Least Privilege)
RUN useradd -m -u 1000 gridxd && \
    chown -R gridxd:gridxd /app

# Copy only requirements first to leverage Docker layer cache
COPY --chown=gridxd:gridxd requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY --chown=gridxd:gridxd . .

# Switch to non-root user
USER gridxd

# Cloud Run injects PORT env var (default 8080). Falls back to 8000 locally.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
