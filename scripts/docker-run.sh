#!/bin/bash

# Docker Run Script for Strezz Performance Test Generator
# This script provides easy commands to run Strezz in Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="strezz"
DEFAULT_BACKEND="k6"
DEFAULT_CONFIG="examples/minimal-working.json"

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

print_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  generate    Generate performance test files"
    echo "  run         Run performance tests"
    echo "  shell       Open shell in container"
    echo "  help        Show this help message"
    echo ""
    echo "Options:"
    echo "  --backend BACKEND    Backend to use (k6, locust, multi) [default: k6]"
    echo "  --config CONFIG      Configuration file [default: examples/minimal-working.json]"
    echo "  --output OUTPUT      Output file path"
    echo "  --target TARGET      Target URL for testing"
    echo "  --help, -h           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 generate --backend k6 --config examples/laravel-ecommerce.json"
    echo "  $0 run --backend locust --config examples/yii-cms.json"
    echo "  $0 shell --backend multi"
    echo ""
    echo "Backends:"
    echo "  k6       - k6 performance testing (recommended)"
    echo "  locust   - Locust performance testing (legacy)"
    echo "  multi    - Both k6 and Locust support"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Check if image exists
check_image() {
    local backend=$1
    if ! docker image inspect "${IMAGE_NAME}:${backend}" > /dev/null 2>&1; then
        print_error "Docker image ${IMAGE_NAME}:${backend} not found."
        print_info "Run './scripts/docker-build.sh' to build the images first."
        exit 1
    fi
}

# Generate performance test files
generate_test() {
    local backend=${1:-$DEFAULT_BACKEND}
    local config=${2:-$DEFAULT_CONFIG}
    local output=${3:-""}
    
    print_header "Generating Performance Test"
    print_info "Backend: ${backend}"
    print_info "Config: ${config}"
    
    # Check if config file exists
    if [ ! -f "$config" ]; then
        print_error "Configuration file not found: ${config}"
        exit 1
    fi
    
    # Create output directory
    mkdir -p output
    
    # Generate test file
    print_step "Generating test file..."
    if [ -z "$output" ]; then
        output="output/test-${backend}.${backend == 'k6' ? 'js' : 'py'}"
    fi
    
    docker run --rm \
        -v "$(pwd)/examples:/app/examples:ro" \
        -v "$(pwd)/output:/app/output" \
        "${IMAGE_NAME}:${backend}" \
        node dist/strezz.js \
        --config "/app/${config}" \
        --backend "${backend}" \
        --output "/app/${output}"
    
    print_success "Test file generated: ${output}"
    
    # Show file contents
    if [ -f "$output" ]; then
        print_step "Generated test file contents:"
        echo "----------------------------------------"
        head -20 "$output"
        echo "----------------------------------------"
        print_info "Full file saved to: ${output}"
    fi
}

# Run performance tests
run_test() {
    local backend=${1:-$DEFAULT_BACKEND}
    local config=${2:-$DEFAULT_CONFIG}
    local target=${3:-""}
    
    print_header "Running Performance Test"
    print_info "Backend: ${backend}"
    print_info "Config: ${config}"
    
    # Check if config file exists
    if [ ! -f "$config" ]; then
        print_error "Configuration file not found: ${config}"
        exit 1
    fi
    
    # Create output directory
    mkdir -p output
    
    # Generate test file first
    local test_file="output/test-${backend}.${backend == 'k6' ? 'js' : 'py'}"
    generate_test "$backend" "$config" "$test_file"
    
    # Run the test
    print_step "Running performance test..."
    
    if [ "$backend" = "k6" ]; then
        # Run k6 test
        docker run --rm \
            -v "$(pwd)/output:/app/output" \
            "${IMAGE_NAME}:${backend}" \
            k6 run \
            --out json="/app/output/results.json" \
            --out text="/app/output/results.txt" \
            "/app/${test_file}"
    elif [ "$backend" = "locust" ]; then
        # Run Locust test
        local host=${target:-"https://httpbin.org"}
        docker run --rm \
            -v "$(pwd)/output:/app/output" \
            "${IMAGE_NAME}:${backend}" \
            locust \
            -f "/app/${test_file}" \
            --host="${host}" \
            --users 5 \
            --spawn-rate 1 \
            --run-time 30s \
            --headless \
            --csv="/app/output/results"
    else
        print_error "Unsupported backend: ${backend}"
        exit 1
    fi
    
    print_success "Performance test completed"
    
    # Show results
    if [ -f "output/results.json" ]; then
        print_step "Test results (JSON):"
        echo "----------------------------------------"
        head -10 output/results.json
        echo "----------------------------------------"
    fi
    
    if [ -f "output/results.txt" ]; then
        print_step "Test results (Text):"
        echo "----------------------------------------"
        cat output/results.txt
        echo "----------------------------------------"
    fi
}

# Open shell in container
open_shell() {
    local backend=${1:-$DEFAULT_BACKEND}
    
    print_header "Opening Shell in Container"
    print_info "Backend: ${backend}"
    print_info "Use 'exit' to return to host shell"
    
    docker run --rm -it \
        -v "$(pwd)/examples:/app/examples:ro" \
        -v "$(pwd)/output:/app/output" \
        "${IMAGE_NAME}:${backend}" \
        /bin/sh
}

# Main execution
main() {
    local command=""
    local backend="$DEFAULT_BACKEND"
    local config="$DEFAULT_CONFIG"
    local output=""
    local target=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            generate|run|shell|help)
                command=$1
                shift
                ;;
            --backend)
                backend="$2"
                shift 2
                ;;
            --config)
                config="$2"
                shift 2
                ;;
            --output)
                output="$2"
                shift 2
                ;;
            --target)
                target="$2"
                shift 2
                ;;
            --help|-h)
                print_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
    
    # Check Docker
    check_docker
    
    # Execute command
    case $command in
        generate)
            check_image "$backend"
            generate_test "$backend" "$config" "$output"
            ;;
        run)
            check_image "$backend"
            run_test "$backend" "$config" "$target"
            ;;
        shell)
            check_image "$backend"
            open_shell "$backend"
            ;;
        help|"")
            print_usage
            ;;
        *)
            print_error "Unknown command: $command"
            print_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
