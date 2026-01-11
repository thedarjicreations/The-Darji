#!/bin/bash

# Production Build Script
# Run this before deploying to production

set -e # Exit on error

echo "🔨 Building The Darji App for Production..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

# Create .env.production if it doesn't exist
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production not found. Creating from template..."
    cp .env.production.example .env.production
    echo "⚠️  Please edit .env.production with your actual values before deploying!"
    echo ""
    read -p "Press Enter to continue or Ctrl+C to exit..."
fi

# Build Docker images
echo "📦 Building Docker images..."
docker-compose build --no-cache

echo ""
echo "✅ Build complete!"
echo ""
echo "🧪 To test locally:"
echo "   docker-compose up"
echo ""
echo "🚀 To deploy to DigitalOcean:"
echo "   See DEPLOYMENT.md for instructions"
echo ""
