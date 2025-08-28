#!/bin/bash

# Docker Build Script for Strezz Performance Test Generator
# This script builds and tests the different Docker images

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="strezz"
REGISTRY=""
VERSION=$(node -p "require('./package.json').version")
LATEST_TAG="latest"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_step() {
    echo -e "${YELLOW}➤ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Docker is running
check_docker() {
    print_step "Checking Docker..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Build Docker images
build_images() {
    print_header "Building Docker Images"
    
    # Build k6 runner
    print_step "Building k6 runner image..."
    docker build \
        --target k6-runner \
        --tag "${REGISTRY}${IMAGE_NAME}:k6" \
        --tag "${REGISTRY}${IMAGE_NAME}:k6-${VERSION}" \
        --file Dockerfile .
    print_success "k6 runner image built successfully"
    
    # Build Locust runner
    print_step "Building Locust runner image..."
    docker build \
        --target locust-runner \
        --tag "${REGISTRY}${IMAGE_NAME}:locust" \
        --tag "${REGISTRY}${IMAGE_NAME}:locust-${VERSION}" \
        --file Dockerfile .
    print_success "Locust runner image built successfully"
    
    # Build multi-backend runner
    print_step "Building multi-backend runner image..."
    docker build \
        --target multi-runner \
        --tag "${REGISTRY}${IMAGE_NAME}:multi" \
        --tag "${REGISTRY}${IMAGE_NAME}:multi-${VERSION}" \
        --tag "${REGISTRY}${IMAGE_NAME}:${LATEST_TAG}" \
        --file Dockerfile .
    print_success "Multi-backend runner image built successfully"
}

# Test Docker images
test_images() {
    print_header "Testing Docker Images"
    
    # Test k6 runner
    print_step "Testing k6 runner image..."
    if docker run --rm "${REGISTRY}${IMAGE_NAME}:k6" node --version > /dev/null 2>&1; then
        print_success "k6 runner Node.js test passed"
    else
        print_error "k6 runner Node.js test failed"
        return 1
    fi
    
    if docker run --rm "${REGISTRY}${IMAGE_NAME}:k6" k6 version > /dev/null 2>&1; then
        print_success "k6 runner k6 test passed"
    else
        print_error "k6 runner k6 test failed"
        return 1
    fi
    
    # Test Locust runner
    print_step "Testing Locust runner image..."
    if docker run --rm "${REGISTRY}${IMAGE_NAME}:locust" node --version > /dev/null 2>&1; then
        print_success "Locust runner Node.js test passed"
    else
        print_error "Locust runner Node.js test failed"
        return 1
    fi
    
    if docker run --rm "${REGISTRY}${IMAGE_NAME}:locust" locust --version > /dev/null 2>&1; then
        print_success "Locust runner Locust test passed"
    else
        print_error "Locust runner Locust test failed"
        return 1
    fi
    
    # Test multi-backend runner
    print_step "Testing multi-backend runner image..."
    if docker run --rm "${REGISTRY}${IMAGE_NAME}:multi" node --version > /dev/null 2>&1; then
        print_success "Multi-backend runner Node.js test passed"
    else
        print_error "Multi-backend runner Node.js test failed"
        return 1
    fi
    
    if docker run --rm "${REGISTRY}${IMAGE_NAME}:multi" k6 version > /dev/null 2>&1; then
        print_success "Multi-backend runner k6 test passed"
    else
        print_error "Multi-backend runner k6 test failed"
        return 1
    fi
    
    if docker run --rm "${REGISTRY}${IMAGE_NAME}:multi" locust --version > /dev/null 2>&1; then
        print_success "Multi-backend runner Locust test passed"
    else
        print_error "Multi-backend runner Locust test failed"
        return 1
    fi
}

# Test Strezz CLI functionality
test_cli() {
    print_header "Testing Strezz CLI in Docker"
    
    # Create output directory
    mkdir -p output
    
    print_step "Testing k6 backend generation..."
    if docker run --rm \
        -v "$(pwd)/examples:/app/examples:ro" \
        -v "$(pwd)/output:/app/output" \
        "${REGISTRY}${IMAGE_NAME}:k6" \
        node dist/strezz.js --config examples/minimal-working.json --backend k6 --output /app/output/test-k6.js; then
        print_success "k6 backend generation test passed"
    else
        print_error "k6 backend generation test failed"
        return 1
    fi
    
    print_step "Testing Locust backend generation..."
    if docker run --rm \
        -v "$(pwd)/examples:/app/examples:ro" \
        -v "$(pwd)/output:/app/output" \
        "${REGISTRY}${IMAGE_NAME}:locust" \
        node dist/strezz.js --config examples/minimal-working.json --backend locust --output /app/output/test-locust.py; then
        print_success "Locust backend generation test passed"
    else
        print_error "Locust backend generation test failed"
        return 1
    fi
    
    # Check if files were generated
    if [ -f "output/test-k6.js" ]; then
        print_success "k6 test file generated successfully"
    else
        print_error "k6 test file not generated"
        return 1
    fi
    
    if [ -f "output/test-locust.py" ]; then
        print_success "Locust test file generated successfully"
    else
        print_error "Locust test file not generated"
        return 1
    fi
}

# Show image information
show_images() {
    print_header "Docker Images Information"
    
    echo "Available images:"
    docker images | grep "${IMAGE_NAME}" || echo "No images found"
    
    echo ""
    echo "Image sizes:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep "${IMAGE_NAME}" || echo "No images found"
}

# Clean up
cleanup() {
    print_header "Cleanup"
    
    print_step "Removing test output files..."
    rm -rf output/
    print_success "Test output files removed"
    
    print_step "Removing Docker images..."
    docker rmi "${REGISTRY}${IMAGE_NAME}:k6" 2>/dev/null || true
    docker rmi "${REGISTRY}${IMAGE_NAME}:k6-${VERSION}" 2>/dev/null || true
    docker rmi "${REGISTRY}${IMAGE_NAME}:locust" 2>/dev/null || true
    docker rmi "${REGISTRY}${IMAGE_NAME}:locust-${VERSION}" 2>/dev/null || true
    docker rmi "${REGISTRY}${IMAGE_NAME}:multi" 2>/dev/null || true
    docker rmi "${REGISTRY}${IMAGE_NAME}:multi-${VERSION}" 2>/dev/null || true
    docker rmi "${REGISTRY}${IMAGE_NAME}:${LATEST_TAG}" 2>/dev/null || true
    print_success "Docker images removed"
}

# Main execution
main() {
    print_header "Strezz Docker Build Script"
    print_info "Version: ${VERSION}"
    print_info "Image Name: ${IMAGE_NAME}"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --cleanup)
                CLEANUP=true
                shift
                ;;
            --no-test)
                NO_TEST=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --cleanup     Clean up Docker images after testing"
                echo "  --no-test     Skip testing after building"
                echo "  --help, -h    Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                    # Build and test all images"
                echo "  $0 --cleanup          # Build, test, and clean up"
                echo "  $0 --no-test         # Build only, skip testing"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Execute steps
    check_docker
    build_images
    
    if [ "$NO_TEST" != "true" ]; then
        test_images
        test_cli
    fi
    
    show_images
    
    if [ "$CLEANUP" = "true" ]; then
        cleanup
    fi
    
    print_header "Build Complete!"
    print_success "All Docker images built successfully"
    
    if [ "$NO_TEST" != "true" ]; then
        print_success "All tests passed"
    fi
    
    print_info "Use 'docker run --rm ${IMAGE_NAME}:multi --help' to test the CLI"
    print_info "Use 'docker-compose up' to start services"
}

# Run main function
main "$@"
