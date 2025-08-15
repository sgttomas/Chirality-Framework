#!/bin/bash

# Chirality Framework Development Startup Script
# This script starts all necessary services for development

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Chirality Framework Development Environment${NC}"
echo "======================================================="

# Function to print status
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i :$port &> /dev/null; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    print_status "Waiting for $service_name to start on port $port..."
    
    while [ $attempt -lt $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            print_success "$service_name is ready on port $port"
            return 0
        fi
        
        sleep 1
        ((attempt++))
        echo -n "."
    done
    
    print_error "$service_name failed to start within 30 seconds"
    return 1
}

# Check if we're in the right directory
if [ ! -f "chirality_cli.py" ] || [ ! -f "package.json" ]; then
    print_error "This script must be run from the chirality-semantic-framework root directory"
    exit 1
fi

# Validate environment first
print_status "Validating environment..."
if [ -f "scripts/validate-env.sh" ]; then
    if ! bash scripts/validate-env.sh; then
        print_error "Environment validation failed. Please fix the issues above."
        exit 1
    fi
else
    print_warning "Environment validation script not found. Proceeding anyway..."
fi

echo
print_status "Checking for running services..."

# Check if GraphQL service is already running
if check_port 8080; then
    print_warning "Port 8080 is already in use. GraphQL service may already be running."
    echo "  You can check with: curl http://localhost:8080/health"
    GRAPHQL_ALREADY_RUNNING=true
else
    GRAPHQL_ALREADY_RUNNING=false
fi

# Check if admin UI is already running
if check_port 3001; then
    print_warning "Port 3001 is already in use. Admin UI may already be running."
    ADMIN_UI_ALREADY_RUNNING=true
else
    ADMIN_UI_ALREADY_RUNNING=false
fi

echo
print_status "Installing/updating dependencies..."

# Install root dependencies
if [ -f "package.json" ]; then
    print_status "Installing root dependencies..."
    npm install --silent
    print_success "Root dependencies installed"
fi

# Install GraphQL service dependencies
if [ -f "graphql-service/package.json" ]; then
    print_status "Installing GraphQL service dependencies..."
    cd graphql-service
    npm install --silent
    cd ..
    print_success "GraphQL service dependencies installed"
fi

# Install admin UI dependencies
if [ -f "chirality-admin/package.json" ]; then
    print_status "Installing admin UI dependencies..."
    cd chirality-admin
    npm install --silent
    cd ..
    print_success "Admin UI dependencies installed"
fi

# Install Python dependencies
print_status "Checking Python dependencies..."
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

# Check if we're in a virtual environment or if pip install will work
if ! $PYTHON_CMD -c "import click" &> /dev/null; then
    print_status "Installing Python dependencies..."
    pip install -e . &> /dev/null || pip3 install -e . &> /dev/null
    print_success "Python dependencies installed"
fi

echo
print_status "Starting development services..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Start GraphQL service
if [ "$GRAPHQL_ALREADY_RUNNING" = false ]; then
    print_status "Starting GraphQL service..."
    cd graphql-service
    
    # Start GraphQL service in background
    npm run dev > ../logs/graphql-service.log 2>&1 &
    GRAPHQL_PID=$!
    echo $GRAPHQL_PID > ../logs/graphql-service.pid
    
    cd ..
    
    # Wait for GraphQL service to be ready
    if wait_for_service 8080 "GraphQL service"; then
        print_success "GraphQL service started (PID: $GRAPHQL_PID)"
        echo "  Logs: logs/graphql-service.log"
        echo "  Endpoint: http://localhost:8080/graphql"
    else
        print_error "Failed to start GraphQL service"
        exit 1
    fi
else
    print_warning "GraphQL service already running on port 8080"
fi

# Start admin UI
if [ "$ADMIN_UI_ALREADY_RUNNING" = false ] && [ -f "chirality-admin/package.json" ]; then
    print_status "Starting admin UI..."
    cd chirality-admin
    
    # Start admin UI in background
    npm run dev > ../logs/admin-ui.log 2>&1 &
    ADMIN_UI_PID=$!
    echo $ADMIN_UI_PID > ../logs/admin-ui.pid
    
    cd ..
    
    # Wait for admin UI to be ready
    if wait_for_service 3001 "Admin UI"; then
        print_success "Admin UI started (PID: $ADMIN_UI_PID)"
        echo "  Logs: logs/admin-ui.log"
        echo "  URL: http://localhost:3001"
    else
        print_warning "Admin UI may have started but is not responding on port 3001"
    fi
else
    if [ "$ADMIN_UI_ALREADY_RUNNING" = true ]; then
        print_warning "Admin UI already running on port 3001"
    else
        print_warning "Admin UI not found at chirality-admin/. Skipping..."
    fi
fi

echo
print_status "Running health checks..."

# Run health checks
if [ -f "scripts/health-check.sh" ]; then
    if bash scripts/health-check.sh; then
        print_success "All health checks passed!"
    else
        print_warning "Some health checks failed, but development can continue"
    fi
else
    print_warning "Health check script not found"
fi

echo
echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo
echo "Services running:"
echo "  • GraphQL Service: http://localhost:8080/graphql"
if [ -f "chirality-admin/package.json" ]; then
    echo "  • Admin UI: http://localhost:3001"
fi
echo
echo "Development commands:"
echo "  • Test CLI: python chirality_cli.py --help"
echo "  • Test Neo4j admin: python neo4j_admin.py list"
echo "  • Run smoke tests: npm run smoke:rest && npm run smoke:gql"
echo "  • View logs: tail -f logs/*.log"
echo
echo "Process management:"
echo "  • Stop services: ./scripts/dev-stop.sh"
echo "  • Restart services: ./scripts/dev-restart.sh"
echo "  • View running processes: ./scripts/dev-status.sh"
echo
echo "Getting started:"
echo "  • Read CONTRIBUTING.md for development workflow"
echo "  • Check CLAUDE_BACKEND.md for backend development priorities"
echo "  • View current tasks: grep -r 'TODO\\|FIXME' --include='*.py' --include='*.ts' ."
echo

# Create a simple script to stop services
cat > scripts/dev-stop.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping Chirality Framework development services..."

# Stop services by PID
if [ -f "logs/graphql-service.pid" ]; then
    PID=$(cat logs/graphql-service.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Stopped GraphQL service (PID: $PID)"
    fi
    rm -f logs/graphql-service.pid
fi

if [ -f "logs/admin-ui.pid" ]; then
    PID=$(cat logs/admin-ui.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Stopped Admin UI (PID: $PID)"
    fi
    rm -f logs/admin-ui.pid
fi

# Kill any remaining processes on our ports
if lsof -i :8080 &> /dev/null; then
    echo "🔧 Killing remaining processes on port 8080..."
    lsof -ti :8080 | xargs kill -9 2>/dev/null || true
fi

if lsof -i :3001 &> /dev/null; then
    echo "🔧 Killing remaining processes on port 3001..."
    lsof -ti :3001 | xargs kill -9 2>/dev/null || true
fi

echo "🎉 All services stopped"
EOF

chmod +x scripts/dev-stop.sh

# Create a simple script to check service status
cat > scripts/dev-status.sh << 'EOF'
#!/bin/bash

echo "📊 Chirality Framework Service Status"
echo "====================================="

check_service() {
    local port=$1
    local name=$2
    local pid_file=$3
    
    if nc -z localhost $port 2>/dev/null; then
        echo "✅ $name (port $port) - RUNNING"
        if [ -f "$pid_file" ]; then
            PID=$(cat $pid_file)
            echo "   PID: $PID"
        fi
    else
        echo "❌ $name (port $port) - STOPPED"
    fi
}

check_service 8080 "GraphQL Service" "logs/graphql-service.pid"
check_service 3001 "Admin UI" "logs/admin-ui.pid"

echo
echo "Log files:"
[ -f "logs/graphql-service.log" ] && echo "  • GraphQL: logs/graphql-service.log"
[ -f "logs/admin-ui.log" ] && echo "  • Admin UI: logs/admin-ui.log"
EOF

chmod +x scripts/dev-status.sh

print_success "Development environment started successfully! 🚀"