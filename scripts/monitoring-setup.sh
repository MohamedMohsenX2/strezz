#!/bin/bash

# Monitoring Setup Script for Strezz Performance Testing
# This script sets up InfluxDB and Grafana for performance metrics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INFLUXDB_URL="http://localhost:8086"
GRAFANA_URL="http://localhost:3000"
INFLUXDB_TOKEN="strezz-admin-token"
INFLUXDB_ORG="strezz"
INFLUXDB_BUCKET="k6"

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

# Start monitoring stack
start_monitoring() {
    print_header "Starting Monitoring Stack"
    
    print_step "Starting InfluxDB and Grafana..."
    docker-compose --profile monitoring up -d
    
    print_step "Waiting for services to be ready..."
    sleep 10
    
    # Check InfluxDB
    if curl -s "${INFLUXDB_URL}/health" > /dev/null 2>&1; then
        print_success "InfluxDB is running"
    else
        print_error "InfluxDB is not responding"
        return 1
    fi
    
    # Check Grafana
    if curl -s "${GRAFANA_URL}/api/health" > /dev/null 2>&1; then
        print_success "Grafana is running"
    else
        print_error "Grafana is not responding"
        return 1
    fi
}

# Setup InfluxDB
setup_influxdb() {
    print_header "Setting up InfluxDB"
    
    print_step "Creating organization and bucket..."
    
    # Create organization
    curl -s -X POST "${INFLUXDB_URL}/api/v2/orgs" \
        -H "Authorization: Token ${INFLUXDB_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"${INFLUXDB_ORG}\"}" > /dev/null 2>&1 || true
    
    # Get organization ID
    ORG_ID=$(curl -s -X GET "${INFLUXDB_URL}/api/v2/orgs" \
        -H "Authorization: Token ${INFLUXDB_TOKEN}" | \
        jq -r ".orgs[] | select(.name==\"${INFLUXDB_ORG}\") | .id")
    
    if [ -z "$ORG_ID" ] || [ "$ORG_ID" = "null" ]; then
        print_error "Could not get organization ID"
        return 1
    fi
    
    print_success "Organization ID: ${ORG_ID}"
    
    # Create bucket
    curl -s -X POST "${INFLUXDB_URL}/api/v2/buckets" \
        -H "Authorization: Token ${INFLUXDB_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"${INFLUXDB_BUCKET}\",\"orgID\":\"${ORG_ID}\",\"retentionRules\":[{\"type\":\"expire\",\"everySeconds\":2592000}]}" > /dev/null 2>&1 || true
    
    print_success "Bucket '${INFLUXDB_BUCKET}' created"
    
    # Create retention policy (30 days)
    print_step "Setting retention policy to 30 days..."
    print_success "Retention policy configured"
}

# Setup Grafana
setup_grafana() {
    print_header "Setting up Grafana"
    
    print_step "Waiting for Grafana to be fully ready..."
    sleep 15
    
    # Check if datasource exists
    if curl -s -X GET "${GRAFANA_URL}/api/datasources/name/InfluxDB" \
        -H "Authorization: Bearer ${GRAFANA_TOKEN:-admin}" > /dev/null 2>&1; then
        print_success "InfluxDB datasource already exists"
    else
        print_step "Creating InfluxDB datasource..."
        
        # Create datasource
        curl -s -X POST "${GRAFANA_URL}/api/datasources" \
            -H "Content-Type: application/json" \
            -d "{
                \"name\": \"InfluxDB\",
                \"type\": \"influxdb\",
                \"url\": \"http://influxdb:8086\",
                \"access\": \"proxy\",
                \"secureJsonData\": {
                    \"token\": \"${INFLUXDB_TOKEN}\"
                },
                \"jsonData\": {
                    \"version\": \"Flux\",
                    \"organization\": \"${INFLUXDB_ORG}\",
                    \"defaultBucket\": \"${INFLUXDB_BUCKET}\",
                    \"tlsSkipVerify\": true,
                    \"httpMethod\": \"POST\"
                }
            }" > /dev/null 2>&1
        
        print_success "InfluxDB datasource created"
    fi
    
    # Import dashboard
    print_step "Importing k6 performance dashboard..."
    
    DASHBOARD_JSON=$(cat grafana/dashboards/k6-performance-dashboard.json)
    
    curl -s -X POST "${GRAFANA_URL}/api/dashboards/db" \
        -H "Content-Type: application/json" \
        -d "{
            \"dashboard\": ${DASHBOARD_JSON},
            \"overwrite\": true
        }" > /dev/null 2>&1
    
    print_success "k6 performance dashboard imported"
}

# Test monitoring integration
test_monitoring() {
    print_header "Testing Monitoring Integration"
    
    print_step "Running k6 test with InfluxDB output..."
    
    # Create output directory
    mkdir -p output
    
    # Generate test file
    if [ -f "dist/strezz.js" ]; then
        node dist/strezz.js \
            --config examples/minimal-working.json \
            --backend k6 \
            --output output/test-monitoring.js
    else
        print_info "Using Docker for test generation..."
        docker run --rm \
            -v "$(pwd)/examples:/app/examples:ro" \
            -v "$(pwd)/output:/app/output" \
            strezz:k6 \
            node dist/strezz.js \
            --config examples/minimal-working.json \
            --backend k6 \
            --output /app/output/test-monitoring.js
    fi
    
    # Run k6 test with InfluxDB output
    if command -v k6 > /dev/null 2>&1; then
        k6 run \
            --out influxdb=http://localhost:8086/k6 \
            --out json=output/results-monitoring.json \
            --out text=output/results-monitoring.txt \
            output/test-monitoring.js
    else
        print_info "Using Docker for k6 execution..."
        docker run --rm \
            -v "$(pwd)/output:/app/output" \
            --network host \
            strezz:k6 \
            k6 run \
            --out influxdb=http://localhost:8086/k6 \
            --out json=/app/output/results-monitoring.json \
            --out text=/app/output/results-monitoring.txt \
            /app/output/test-monitoring.js
    fi
    
    print_success "Test completed with InfluxDB output"
    
    # Check if data was sent to InfluxDB
    print_step "Verifying data in InfluxDB..."
    sleep 5
    
    # Query InfluxDB for test data
    DATA_COUNT=$(curl -s -X POST "${INFLUXDB_URL}/api/v2/query" \
        -H "Authorization: Token ${INFLUXDB_TOKEN}" \
        -H "Content-Type: application/vnd.flux" \
        -d "from(bucket:\"${INFLUXDB_BUCKET}\") |> range(start: -1h) |> count()" | \
        jq -r '.results[0].series[0].values[0][1]' 2>/dev/null || echo "0")
    
    if [ "$DATA_COUNT" -gt 0 ]; then
        print_success "Data successfully sent to InfluxDB (${DATA_COUNT} records)"
    else
        print_error "No data found in InfluxDB"
        return 1
    fi
}

# Show monitoring information
show_monitoring_info() {
    print_header "Monitoring Information"
    
    echo "InfluxDB:"
    echo "  URL: ${INFLUXDB_URL}"
    echo "  Organization: ${INFLUXDB_ORG}"
    echo "  Bucket: ${INFLUXDB_BUCKET}"
    echo "  Token: ${INFLUXDB_TOKEN}"
    echo ""
    
    echo "Grafana:"
    echo "  URL: ${GRAFANA_URL}"
    echo "  Username: admin"
    echo "  Password: strezz123"
    echo ""
    
    echo "Dashboard:"
    echo "  k6 Performance Dashboard: ${GRAFANA_URL}/d/k6-performance"
    echo ""
    
    echo "Next Steps:"
    echo "  1. Open Grafana at ${GRAFANA_URL}"
    echo "  2. Login with admin/strezz123"
    echo "  3. View the k6 Performance Dashboard"
    echo "  4. Run performance tests to see metrics"
}

# Stop monitoring stack
stop_monitoring() {
    print_header "Stopping Monitoring Stack"
    
    print_step "Stopping services..."
    docker-compose --profile monitoring down
    
    print_success "Monitoring stack stopped"
}

# Main execution
main() {
    print_header "Strezz Monitoring Setup"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --stop)
                STOP_MONITORING=true
                shift
                ;;
            --test-only)
                TEST_ONLY=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --stop        Stop monitoring stack"
                echo "  --test-only   Only test monitoring integration"
                echo "  --help, -h    Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                    # Setup monitoring stack"
                echo "  $0 --stop             # Stop monitoring stack"
                echo "  $0 --test-only        # Test monitoring integration"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    if [ "$STOP_MONITORING" = "true" ]; then
        stop_monitoring
        exit 0
    fi
    
    if [ "$TEST_ONLY" = "true" ]; then
        test_monitoring
        exit 0
    fi
    
    # Execute setup steps
    check_docker
    start_monitoring
    setup_influxdb
    setup_grafana
    test_monitoring
    show_monitoring_info
    
    print_header "Setup Complete!"
    print_success "Monitoring stack is ready"
    print_info "Access Grafana at: ${GRAFANA_URL}"
    print_info "Access InfluxDB at: ${INFLUXDB_URL}"
}

# Run main function
main "$@"
