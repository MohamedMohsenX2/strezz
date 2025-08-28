#!/bin/bash

# Strezz Example Test Generator
# This script demonstrates how to generate performance tests from example configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check if strezz CLI is available
check_strezz() {
    if ! command -v strezz &> /dev/null; then
        print_error "Strezz CLI not found. Please install it first:"
        echo "  npm install -g ."
        echo "  npm run build"
        exit 1
    fi
}

# Generate tests for a specific example
generate_example() {
    local example_name=$1
    local backend=$2
    local config_file="examples/${example_name}.json"
    
    if [[ ! -f "$config_file" ]]; then
        print_error "Configuration file not found: $config_file"
        return 1
    fi
    
    print_status "Generating ${backend} tests for ${example_name}..."
    
    local output_file="${example_name}-${backend}-test"
    if [[ "$backend" == "k6" ]]; then
        output_file="${output_file}.js"
    elif [[ "$backend" == "locust" ]]; then
        output_file="${output_file}.py"
    fi
    
    # Generate the test
    if strezz --config "$config_file" --backend "$backend" --output "$output_file"; then
        print_status "✅ Generated ${output_file}"
        
        # Show file info
        if [[ -f "$output_file" ]]; then
            local file_size=$(du -h "$output_file" | cut -f1)
            local line_count=$(wc -l < "$output_file")
            print_status "File: $output_file (${file_size}, ${line_count} lines)"
        fi
    else
        print_error "Failed to generate ${backend} test for ${example_name}"
        return 1
    fi
}

# Main execution
main() {
    print_header "Strezz Example Test Generator"
    
    # Check prerequisites
    check_strezz
    
    # Available examples
    local examples=("laravel-ecommerce" "yii-cms" "generic-api")
    local backends=("k6" "locust")
    
    print_status "Available examples: ${examples[*]}"
    print_status "Available backends: ${backends[*]}"
    echo
    
    # Generate all examples for all backends
    for example in "${examples[@]}"; do
        print_header "Processing $example"
        
        for backend in "${backends[@]}"; do
            if generate_example "$example" "$backend"; then
                print_status "✅ Successfully generated $backend test for $example"
            else
                print_warning "⚠️  Failed to generate $backend test for $example"
            fi
            echo
        done
    done
    
    print_header "Test Generation Complete"
    print_status "Generated test files:"
    
    # List generated files
    for example in "${examples[@]}"; do
        for backend in "${backends[@]}"; do
            local output_file="${example}-${backend}-test"
            if [[ "$backend" == "k6" ]]; then
                output_file="${output_file}.js"
            elif [[ "$backend" == "locust" ]]; then
                output_file="${output_file}.py"
            fi
            
            if [[ -f "$output_file" ]]; then
                echo "  📄 $output_file"
            fi
        done
    done
    
    echo
    print_status "Next steps:"
    echo "  1. Review generated test files"
    echo "  2. Customize for your specific application"
    echo "  3. Run tests against your target environment"
    echo "  4. Analyze results and adjust thresholds"
    
    echo
    print_warning "Note: Locust backend is deprecated. Use k6 for new projects."
}

# Run main function
main "$@"
