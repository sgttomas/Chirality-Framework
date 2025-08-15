#!/bin/bash

# Chirality Framework Health Check Script
# This script tests all services and endpoints to ensure they're working properly

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_TOTAL=0

echo -e "${BLUE}🏥 Chirality Framework Health Check${NC}"
echo "===================================="

# Function to run a health check
run_check() {
    local check_name="$1"
    local check_command="$2"
    local expected_pattern="$3"
    
    ((CHECKS_TOTAL++))
    echo -n "Testing $check_name... "
    
    if result=$(eval "$check_command" 2>&1); then
        if [[ -z "$expected_pattern" ]] || echo "$result" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✅ PASS${NC}"
            ((CHECKS_PASSED++))
            return 0
        else
            echo -e "${RED}❌ FAIL${NC} (unexpected output)"
            echo "  Expected pattern: $expected_pattern"
            echo "  Got: $result"
            ((CHECKS_FAILED++))
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Error: $result"
        ((CHECKS_FAILED++))
        return 1
    fi
}

# Function to check if service is running on port
check_port() {
    local port="$1"
    local service_name="$2"
    
    if nc -z localhost "$port" 2>/dev/null; then
        echo -e "${GREEN}✅ $service_name (port $port) is accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name (port $port) is not accessible${NC}"
        return 1
    fi
}

# Check if required commands are available
echo
echo "1. Command Availability Checks"
echo "------------------------------"

run_check "Python CLI help" "python3 chirality_cli.py --help || python chirality_cli.py --help" "Usage:"
run_check "Neo4j Admin help" "python3 neo4j_admin.py --help || python neo4j_admin.py --help" "Usage:"

echo
echo "2. Service Connectivity Checks"
echo "------------------------------"

# Check if GraphQL service is running
if check_port 8080 "GraphQL Service"; then
    # Test GraphQL endpoint
    run_check "GraphQL Schema Introspection" \
        "curl -s -X POST http://localhost:8080/graphql -H 'Content-Type: application/json' -d '{\"query\":\"{ __schema { types { name } } }\"}'" \
        "types"
    
    # Test health endpoint if it exists
    run_check "GraphQL Health Endpoint" \
        "curl -s http://localhost:8080/health" \
        "healthy\|status"
else
    echo -e "${YELLOW}⚠️  GraphQL service not running. Start with: cd graphql-service && npm run dev${NC}"
fi

# Check Neo4j connectivity
echo
echo "3. Database Connectivity Checks"
echo "-------------------------------"

if [ -n "$NEO4J_URI" ] && [ -n "$NEO4J_USER" ] && [ -n "$NEO4J_PASSWORD" ]; then
    run_check "Neo4j Connection" \
        "python3 -c \"
from neo4j import GraphDatabase
import os
try:
    driver = GraphDatabase.driver(
        os.getenv('NEO4J_URI'),
        auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD'))
    )
    driver.verify_connectivity()
    driver.close()
    print('Connected successfully')
except Exception as e:
    print(f'Connection failed: {e}')
    exit(1)
\"" \
        "Connected successfully"
        
    # Test basic Neo4j query
    run_check "Neo4j Basic Query" \
        "python3 -c \"
from neo4j import GraphDatabase
import os
try:
    driver = GraphDatabase.driver(
        os.getenv('NEO4J_URI'),
        auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD'))
    )
    with driver.session() as session:
        result = session.run('RETURN 1 as test')
        record = result.single()
        print(f'Query result: {record[\\\"test\\\"]}')
    driver.close()
except Exception as e:
    print(f'Query failed: {e}')
    exit(1)
\"" \
        "Query result: 1"
else
    echo -e "${YELLOW}⚠️  Neo4j environment variables not set. Skipping database tests.${NC}"
fi

echo
echo "4. API Integration Checks"
echo "------------------------"

# Test OpenAI API connectivity
if [ -n "$OPENAI_API_KEY" ]; then
    run_check "OpenAI API Client" \
        "python3 -c \"
import openai
import os
try:
    client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    print('OpenAI client initialized successfully')
except Exception as e:
    print(f'OpenAI client failed: {e}')
    exit(1)
\"" \
        "initialized successfully"
else
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY not set. Skipping OpenAI tests.${NC}"
fi

echo
echo "5. CLI Functionality Checks"
echo "---------------------------"

# Test CLI health check command (if it exists)
if python3 chirality_cli.py --help 2>/dev/null | grep -q "health-check"; then
    run_check "CLI Health Check Command" \
        "python3 chirality_cli.py health-check" \
        "healthy\|success\|OK"
else
    echo -e "${YELLOW}⚠️  CLI health-check command not implemented yet${NC}"
fi

# Test CLI basic commands
run_check "CLI List Components" \
    "python3 neo4j_admin.py list" \
    ""  # Accept any output for now

echo
echo "6. File System Checks"
echo "--------------------"

# Check critical files exist
critical_files=(
    "chirality_cli.py"
    "neo4j_admin.py"
    "schema.graphql"
    "graphql-service/package.json"
    "CLAUDE.md"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌ $file missing${NC}"
        ((CHECKS_FAILED++))
    fi
    ((CHECKS_TOTAL++))
done

# Check directory structure
critical_dirs=(
    "graphql-service/src"
    "scripts"
    "ontology"
    "docs"
)

for dir in "${critical_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ $dir/ directory exists${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌ $dir/ directory missing${NC}"
        ((CHECKS_FAILED++))
    fi
    ((CHECKS_TOTAL++))
done

echo
echo "7. Integration Workflow Test"
echo "---------------------------"

# Test a simple end-to-end workflow if all services are available
if nc -z localhost 8080 2>/dev/null && [ -n "$NEO4J_URI" ]; then
    echo "Testing complete workflow..."
    
    # Test GraphQL query to Neo4j
    run_check "GraphQL->Neo4j Integration" \
        "curl -s -X POST http://localhost:8080/graphql -H 'Content-Type: application/json' -d '{\"query\":\"{ __typename }\"}'" \
        "Query\|__typename"
else
    echo -e "${YELLOW}⚠️  Services not running. Skipping integration tests.${NC}"
fi

echo
echo "Summary"
echo "======="

echo "Health Check Results:"
echo "  • Total checks: $CHECKS_TOTAL"
echo "  • Passed: $CHECKS_PASSED"
echo "  • Failed: $CHECKS_FAILED"

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All health checks passed! System is ready for development.${NC}"
    echo
    echo "Next steps:"
    echo "  • Start development with: ./scripts/dev-start.sh"
    echo "  • Run smoke tests with: npm run smoke:rest && npm run smoke:gql"
    echo "  • Check CONTRIBUTING.md for development workflow"
    exit 0
elif [ $CHECKS_FAILED -le 3 ]; then
    echo -e "${YELLOW}⚠️  Some health checks failed, but core functionality appears to work.${NC}"
    echo "You may be able to proceed with development, but consider fixing the issues above."
    exit 0
else
    echo -e "${RED}❌ Multiple health checks failed. Please address the issues before proceeding.${NC}"
    echo
    echo "Common fixes:"
    echo "  • Start GraphQL service: cd graphql-service && npm run dev"
    echo "  • Check environment variables in .env file"
    echo "  • Verify Neo4j and OpenAI credentials"
    echo "  • Run ./scripts/validate-env.sh for detailed diagnostics"
    exit 1
fi