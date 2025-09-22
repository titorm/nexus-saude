FROM python:3.11-slim

LABEL maintainer="Nexus Saúde Team"
LABEL service="data-warehouse"
LABEL version="1.0.0"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create app user
RUN adduser --disabled-password --gecos '' appuser

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /tmp/exports /tmp/reports /var/log/nexus-saude && \
    chown -R appuser:appuser /app /tmp/exports /tmp/reports /var/log/nexus-saude

# Switch to app user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8006/health || exit 1

# Expose port
EXPOSE 8006

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8006", "--workers", "4"]