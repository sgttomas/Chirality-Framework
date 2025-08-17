# Troubleshooting Guide - Chirality Framework

## Common Issues and Solutions

### Installation Problems

#### Python Dependencies
**Problem**: `pip install -e .` fails with dependency conflicts
```
ERROR: Could not find a version that satisfies the requirement...
```

**Solutions**:
```bash
# Create fresh virtual environment
python -m venv cf14-env
source cf14-env/bin/activate  # Linux/Mac
# or cf14-env\Scripts\activate  # Windows

# Update pip and setuptools
pip install --upgrade pip setuptools

# Install with specific versions
pip install openai==1.3.0 neo4j==5.14.0

# Alternative: Use conda environment
conda create -n cf14 python=3.9
conda activate cf14
pip install -e .
```

#### Missing System Dependencies
**Problem**: Neo4j connection fails
```
neo4j.exceptions.ServiceUnavailable: Could not resolve address
```

**Solutions**:
```bash
# Install Docker Desktop
# Start Neo4j container
docker run --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:5.18-community

# Or use Neo4j Aura cloud service
# Update NEO4J_URI in .env to cloud instance
```

### Configuration Issues

#### Environment Variables
**Problem**: OpenAI API calls fail with authentication error
```
openai.error.AuthenticationError: Invalid API key
```

**Solutions**:
```bash
# Check environment variable
echo $OPENAI_API_KEY

# Set in current session
export OPENAI_API_KEY="sk-proj-your-key-here"

# Add to .env file
echo "OPENAI_API_KEY=sk-proj-your-key-here" >> .env

# Verify API key format (should start with sk-proj- or sk-)
```

#### Neo4j Connection
**Problem**: Database connection timeout
```
neo4j.exceptions.ClientError: Unable to retrieve routing information
```

**Solutions**:
```bash
# Check Neo4j status
docker ps | grep neo4j

# Restart Neo4j container
docker restart neo4j

# Test connection manually
pip install neo4j
python -c "
from neo4j import GraphDatabase
driver = GraphDatabase.driver('bolt://localhost:7687', auth=('neo4j', 'password'))
driver.verify_connectivity()
"

# Check firewall and network settings
telnet localhost 7687
```

### Semantic Operation Errors

#### Matrix Validation Failures
**Problem**: Invalid matrix format
```
ValidationError: Matrix shape [3, 4] doesn't match cells count 10
```

**Solutions**:
```python
# Check matrix structure
{
  "shape": [3, 4],  # Should be 3 rows, 4 columns = 12 cells
  "cells": [
    # Must have exactly 12 cell objects
    {"row": 0, "col": 0, "value": "..."},
    {"row": 0, "col": 1, "value": "..."},
    # ... 10 more cells
  ]
}

# Validate matrix before operation
python -m chirality.cli validate --matrix matrix_A.json
```

#### Dimension Mismatch
**Problem**: Incompatible matrices for multiplication
```
DimensionError: Cannot multiply [3,4] * [3,4] matrices
```

**Solutions**:
```python
# Matrix multiplication requires: A.cols == B.rows
# For A[3,4] * B[m,n]: need B[4,n]

# Fix matrix B dimensions
matrix_b = {
  "shape": [4, 4],  # Changed from [3,4] to [4,4]
  "cells": [
    # Add cells for row 3 (index 3)
    {"row": 3, "col": 0, "value": "..."},
    {"row": 3, "col": 1, "value": "..."},
    {"row": 3, "col": 2, "value": "..."},
    {"row": 3, "col": 3, "value": "..."}
  ]
}
```

#### Semantic Resolution Failures
**Problem**: LLM returns invalid semantic combinations
```
ResolverError: OpenAI API returned non-semantic response
```

**Solutions**:
```bash
# Use Echo resolver for testing
python -m chirality.cli multiply --resolver echo --A matrix_A.json --B matrix_B.json

# Check OpenAI model availability
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Try different temperature settings
# Lower temperature (0.1) for more consistent results
# Higher temperature (0.7) for more creative combinations

# Check input matrix content quality
# Ensure cells contain meaningful semantic concepts
# Avoid empty strings, special characters, or non-semantic content
```

### Performance Issues

#### Slow Semantic Operations
**Problem**: Operations take longer than 30 seconds
```
TimeoutError: Semantic multiplication exceeded timeout
```

**Solutions**:
```bash
# Check network latency to OpenAI
curl -w "%{time_total}" https://api.openai.com/v1/models

# Use smaller matrices for testing
# Start with 2x2 or 3x3 matrices

# Enable operation caching
# Check if same operation was performed recently

# Monitor system resources
top  # Check CPU/memory usage
```

#### Memory Usage
**Problem**: High memory consumption with large matrices
```
MemoryError: Unable to allocate memory for matrix operation
```

**Solutions**:
```python
# Process matrices in chunks
# Use streaming for large operations
# Implement lazy loading for matrix cells

# Check available memory
import psutil
print(f"Available memory: {psutil.virtual_memory().available / 1024**3:.1f} GB")

# Optimize matrix storage
# Remove unnecessary metadata
# Use efficient serialization
```

### CLI Issues

#### Command Not Found
**Problem**: `chirality` command not available
```
bash: chirality: command not found
```

**Solutions**:
```bash
# Use module form
python -m chirality.cli --help

# Check installation
pip show chirality-framework
pip list | grep chirality

# Install in development mode
pip install -e .

# Add to PATH if using global install
export PATH=$PATH:~/.local/bin
```

#### Import Errors
**Problem**: Module import failures
```
ModuleNotFoundError: No module named 'chirality.core'
```

**Solutions**:
```bash
# Check current directory
pwd  # Should be in project root

# Verify package structure
ls -la chirality/
ls -la chirality/core/

# Check Python path
python -c "import sys; print('\n'.join(sys.path))"

# Reinstall package
pip uninstall chirality-framework
pip install -e .
```

### Multi-Service Issues

#### Port Conflicts
**Problem**: Services fail to start on default ports
```
OSError: [Errno 48] Address already in use: localhost:8080
```

**Solutions**:
```bash
# Check what's using ports
lsof -i :8080
lsof -i :7474
lsof -i :7687

# Kill conflicting processes
kill $(lsof -t -i:8080)

# Use different ports
export GRAPHQL_PORT=8081
export NEO4J_HTTP_PORT=7475
export NEO4J_BOLT_PORT=7688

# Update service configurations
```

#### Service Dependencies
**Problem**: GraphQL service can't connect to Neo4j
```
ServiceError: Neo4j database unavailable
```

**Solutions**:
```bash
# Start services in order
# 1. Neo4j first
docker start neo4j

# 2. Wait for Neo4j to be ready
until curl -f http://localhost:7474; do sleep 1; done

# 3. Start GraphQL service
npm run dev

# Check service health
curl http://localhost:8080/health
curl http://localhost:7474
```

### Development Issues

#### Hot Reloading Problems
**Problem**: Changes not reflected in running services
```
# Code changes don't appear in CLI output
```

**Solutions**:
```bash
# Reinstall in development mode
pip install -e .

# Clear Python cache
find . -name "*.pyc" -delete
find . -name "__pycache__" -delete

# Restart services
# Kill all processes and restart

# Check file watchers
# Some systems have file watching limits
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
```

#### Testing Failures
**Problem**: Tests fail with import or connection errors
```
pytest: ImportError or ConnectionError
```

**Solutions**:
```bash
# Run tests with proper environment
export PYTHONPATH=.
python -m pytest chirality/tests/

# Use test-specific configuration
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j  
export NEO4J_PASSWORD=test_password

# Skip integration tests if needed
python -m pytest chirality/tests/ -k "not integration"

# Run individual test files
python -m pytest chirality/tests/test_ops.py -v
```

## Debugging Techniques

### Enable Detailed Logging
```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Or for specific modules
logging.getLogger('chirality.core.ops').setLevel(logging.DEBUG)
```

### Matrix Content Inspection
```bash
# Pretty print matrix files
python -c "
import json
with open('matrix_A.json') as f:
    print(json.dumps(json.load(f), indent=2))
"

# Validate specific matrix
python -c "
from chirality.core.validate import validate_matrix
from chirality.core.serialize import load_matrix
matrix = load_matrix('matrix_A.json')
validate_matrix(matrix)
print('Matrix is valid')
"
```

### Operation Tracing
```python
# Enable operation tracing
from chirality.core.ops import op_multiply
from chirality import OpenAIResolver

resolver = OpenAIResolver(api_key="your_key")
# Add debug logging to resolver
resolver.debug = True

result, operation = op_multiply("debug_thread", matrix_a, matrix_b, resolver)
print(f"Operation details: {operation}")
```

### Neo4j Query Debugging
```cypher
// Check stored matrices
MATCH (m:Matrix) RETURN m LIMIT 10;

// View operation lineage
MATCH (m1:Matrix)-[r:DERIVES]->(m2:Matrix) 
RETURN m1.name, r.operation, m2.name;

// Check for orphaned nodes
MATCH (n) WHERE NOT (n)--() RETURN count(n);
```

## Getting Help

### Check Existing Issues
1. Search project issues on GitHub
2. Check CURRENT_STATUS.md for known problems
3. Review CHANGELOG.md for recent changes

### Reporting Problems
Include:
- CF14 version (`python -c "import chirality; print(chirality.__version__)"`)
- Python version (`python --version`)
- Operating system
- Complete error messages
- Steps to reproduce
- Relevant configuration (without API keys)

### Community Resources
- Project documentation
- GitHub discussions
- Example implementations
- Test cases for reference

---

*Troubleshooting guide for CF14.3.0.0 - Updated January 2025*