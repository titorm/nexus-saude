#!/bin/bash

# Build and deployment script for ML service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="nexus-saude/ml-service"
VERSION=${1:-latest}
REGISTRY=${REGISTRY:-localhost:5000}

echo -e "${GREEN}🚀 Starting ML Service Build and Deployment${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo -e "${YELLOW}📋 Checking dependencies...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies check passed${NC}"

# Install Python dependencies
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
if [ -f "tests/test_main.py" ]; then
    python -m pytest tests/ -v
else
    echo -e "${YELLOW}⚠️  No tests found, skipping test phase${NC}"
fi

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:${VERSION} .

# Tag for registry if specified
if [ "$REGISTRY" != "localhost:5000" ]; then
    docker tag ${IMAGE_NAME}:${VERSION} ${REGISTRY}/${IMAGE_NAME}:${VERSION}
    echo -e "${GREEN}✅ Image tagged for registry: ${REGISTRY}/${IMAGE_NAME}:${VERSION}${NC}"
fi

# Push to registry if not local
if [ "$REGISTRY" != "localhost:5000" ]; then
    echo -e "${YELLOW}📤 Pushing to registry...${NC}"
    docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}
    echo -e "${GREEN}✅ Image pushed to registry${NC}"
fi

# Development deployment with docker-compose
echo -e "${YELLOW}🚀 Starting development deployment...${NC}"
docker-compose down || true
docker-compose up -d

# Wait for service to be ready
echo -e "${YELLOW}⏳ Waiting for service to be ready...${NC}"
timeout=60
counter=0

while [ $counter -lt $timeout ]; do
    if curl -s -f http://localhost:8001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ML Service is ready!${NC}"
        break
    fi
    
    echo -n "."
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo -e "${RED}❌ Service failed to start within ${timeout} seconds${NC}"
    docker-compose logs ml-service
    exit 1
fi

# Show service information
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📍 Service URLs:"
echo "   • ML Service API: http://localhost:8001"
echo "   • Health Check: http://localhost:8001/health"
echo "   • API Documentation: http://localhost:8001/docs"
echo "   • MLflow UI: http://localhost:5000"
echo ""
echo "📊 Service Status:"
curl -s http://localhost:8001/health | python -m json.tool || echo "Could not fetch status"

echo ""
echo -e "${GREEN}✨ ML Service is now running and ready to serve predictions!${NC}"

# Production deployment instructions
echo ""
echo -e "${YELLOW}📝 For production deployment:${NC}"
echo "   1. Update image version in k8s-deployment.yml"
echo "   2. Apply Kubernetes manifests:"
echo "      kubectl apply -f k8s-deployment.yml"
echo "   3. Monitor deployment:"
echo "      kubectl get pods -l app=ml-service"
echo "      kubectl logs -l app=ml-service"