#!/bin/bash

# Chirality Framework Environment Validation Script
# This script validates that all required dependencies and environment variables are properly configured

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

echo -e "${BLUE}🔍 Chirality Framework Environment Validation${NC}"
echo "=================================================="

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo
echo "1. Checking System Dependencies..."
echo "-----------------------------------"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | cut -d'v' -f2)
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        print_success "Node.js $NODE_VERSION (required: >= 18.x)"
    else
        print_error "Node.js $NODE_VERSION is too old (required: >= 18.x)"
    fi
else
    print_error "Node.js not found. Install Node.js 18+ from https://nodejs.org/"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION"
else
    print_error "npm not found. Install npm with Node.js"
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_success "$PYTHON_VERSION"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    print_success "$PYTHON_VERSION"
else
    print_error "Python not found. Install Python 3.8+ from https://python.org/"
fi

# Check pip
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version)
    print_success "pip3 available"
elif command -v pip &> /dev/null; then
    PIP_VERSION=$(pip --version)
    print_success "pip available"
else
    print_error "pip not found. Install pip with Python"
fi

# Check git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    print_success "$GIT_VERSION"
else
    print_error "Git not found. Install Git from https://git-scm.com/"
fi

echo
echo "2. Checking Environment Variables..."
echo "------------------------------------"

# Check for .env files
if [ -f ".env" ]; then
    print_success ".env file found"
    source .env
elif [ -f ".env.local" ]; then
    print_success ".env.local file found"
    source .env.local
else
    print_warning "No .env or .env.local file found. Create one with required variables."
fi

# Check required environment variables
check_env_var() {
    local var_name=$1
    local var_desc=$2
    local is_required=${3:-true}
    
    if [ -n "${!var_name}" ]; then
        # Mask sensitive variables
        if [[ $var_name == *"KEY"* ]] || [[ $var_name == *"PASSWORD"* ]]; then
            local masked_value="${!var_name:0:7}...${!var_name: -4}"
            print_success "$var_name=$masked_value ($var_desc)"
        else
            print_success "$var_name=${!var_name} ($var_desc)"
        fi
    else
        if [ "$is_required" = true ]; then
            print_error "$var_name not set ($var_desc)"
        else
            print_warning "$var_name not set ($var_desc) - optional"
        fi
    fi
}

# Required environment variables
check_env_var "OPENAI_API_KEY" "OpenAI API key for semantic operations"
check_env_var "NEO4J_URI" "Neo4j database connection URI"
check_env_var "NEO4J_USER" "Neo4j database username"
check_env_var "NEO4J_PASSWORD" "Neo4j database password"

# Optional environment variables
check_env_var "NEO4J_DATABASE" "Neo4j database name" false
check_env_var "NEXT_PUBLIC_API_BASE" "API base URL" false

echo
echo "3. Checking Project Dependencies..."
echo "-----------------------------------"

# Check package.json dependencies
if [ -f "package.json" ]; then
    print_success "Root package.json found"
    if [ -f "package-lock.json" ]; then
        print_success "package-lock.json found"
    else
        print_warning "package-lock.json not found. Run 'npm install'"
    fi
    
    if [ -d "node_modules" ]; then
        print_success "Root node_modules directory exists"
    else
        print_warning "Root node_modules not found. Run 'npm install'"
    fi
else
    print_error "package.json not found in root directory"
fi

# Check GraphQL service dependencies
if [ -f "graphql-service/package.json" ]; then
    print_success "GraphQL service package.json found"
    if [ -d "graphql-service/node_modules" ]; then
        print_success "GraphQL service node_modules exists"
    else
        print_warning "GraphQL service node_modules not found. Run 'cd graphql-service && npm install'"
    fi
else
    print_error "graphql-service/package.json not found"
fi

# Check Python requirements
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

# Check if Python packages are installed
check_python_package() {
    local package=$1
    if $PYTHON_CMD -c "import $package" &> /dev/null; then
        print_success "Python package '$package' installed"
    else
        print_error "Python package '$package' not installed. Run 'pip install $package'"
    fi
}

check_python_package "click"
check_python_package "openai" 
check_python_package "requests"
check_python_package "pydantic"
check_python_package "neo4j"
check_python_package "dotenv"

echo
echo "4. Checking Core Files..."
echo "-------------------------"

# Check for core CLI files
core_files=(
    "chirality_cli.py"
    "neo4j_admin.py" 
    "semmul.py"
    "chirality_graphql.py"
    "schema.graphql"
)

for file in "${core_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "Core file '$file' found"
    else
        print_error "Core file '$file' missing"
    fi
done

# Check for documentation files
doc_files=(
    "README.md"
    "CLAUDE.md"
    "CONTRIBUTING.md"
    "BACKEND_DEVELOPMENT.md"
)

for file in "${doc_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "Documentation '$file' found"
    else
        print_warning "Documentation '$file' missing"
    fi
done

echo
echo "5. Testing Basic Connectivity..."
echo "--------------------------------"

# Test Python CLI
if [ -f "chirality_cli.py" ]; then
    if $PYTHON_CMD chirality_cli.py --help &> /dev/null; then
        print_success "Python CLI responds to --help"
    else
        print_error "Python CLI not working. Check dependencies."
    fi
else
    print_error "chirality_cli.py not found"
fi

# Test Neo4j connection (if environment variables are set)
if [ -n "$NEO4J_URI" ] && [ -n "$NEO4J_USER" ] && [ -n "$NEO4J_PASSWORD" ]; then
    print_info "Testing Neo4j connection..."
    if $PYTHON_CMD -c "
from neo4j import GraphDatabase
import os
try:
    driver = GraphDatabase.driver(
        os.getenv('NEO4J_URI'),
        auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD'))
    )
    driver.verify_connectivity()
    driver.close()
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}')
" | grep -q "SUCCESS"; then
        print_success "Neo4j connection successful"
    else
        print_error "Neo4j connection failed. Check credentials and network."
    fi
else
    print_warning "Neo4j environment variables not set. Skipping connection test."
fi

# Test OpenAI API (if API key is set)
if [ -n "$OPENAI_API_KEY" ]; then
    print_info "Testing OpenAI API connection..."
    if $PYTHON_CMD -c "
import openai
import os
try:
    client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    # Just check if we can create a client, don't make actual API calls
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}')
" | grep -q "SUCCESS"; then
        print_success "OpenAI API client initialized successfully"
    else
        print_error "OpenAI API client initialization failed. Check API key."
    fi
else
    print_warning "OPENAI_API_KEY not set. Skipping API test."
fi

echo
echo "Summary"
echo "======="

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        print_success "Environment validation passed! You're ready to develop. 🎉"
        echo
        echo "Next steps:"
        echo "  1. Run './scripts/health-check.sh' to test services"
        echo "  2. Run './scripts/dev-start.sh' to start development servers"
        echo "  3. Check CONTRIBUTING.md for development workflow"
        exit 0
    else
        echo -e "${YELLOW}Environment validation completed with $WARNINGS warning(s).${NC}"
        echo "You can proceed with development, but consider addressing the warnings."
        exit 0
    fi
else
    echo -e "${RED}Environment validation failed with $ERRORS error(s) and $WARNINGS warning(s).${NC}"
    echo
    echo "Please fix the errors above before proceeding with development."
    echo "See CONTRIBUTING.md for detailed setup instructions."
    exit 1
fi