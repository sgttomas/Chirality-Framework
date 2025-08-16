# Troubleshooting Guide

Comprehensive troubleshooting guide for the Chirality Framework with practical solutions and debugging techniques.

## 🚨 Quick Diagnosis

### 1. Run Health Checks First
```bash
# System-wide health check
python chirality_cli.py health-check --verbose

# GraphQL service health
curl http://localhost:8080/health

# Environment validation
./scripts/validate-env.sh

# Service status
./scripts/dev-status.sh
```

### 2. Check Service Status
```bash
# Check if GraphQL service is running
curl -I http://localhost:8080/graphql

# Check Neo4j connectivity
python -c "
from neo4j import GraphDatabase
import os
driver = GraphDatabase.driver(os.getenv('NEO4J_URI'), auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD')))
driver.verify_connectivity()
print('Neo4j: Connected')
"

# Check OpenAI API
python -c "
import openai, os
client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
print('OpenAI: Initialized')
"
```

## 🔧 Environment & Setup Issues

### Environment Variables Not Set

**Symptoms:**
```
Error: OPENAI_API_KEY not found
KeyError: 'NEO4J_URI'
Environment variable missing
```

**Diagnosis:**
```bash
# Check which variables are missing
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:-(not set)}"
echo "NEO4J_URI: ${NEO4J_URI:-(not set)}"
echo "NEO4J_USER: ${NEO4J_USER:-(not set)}"
echo "NEO4J_PASSWORD: ${NEO4J_PASSWORD:-(not set)}"
```

**Solutions:**
1. **Create .env file:**
   ```bash
   # Create .env file in project root
   cat > .env << EOF
   OPENAI_API_KEY=sk-proj-your-api-key
   NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-password
   NEO4J_DATABASE=neo4j
   EOF
   ```

2. **Load environment variables:**
   ```bash
   # For current session
   source .env
   
   # For Python scripts
   pip install python-dotenv
   ```

3. **Verify environment:**
   ```bash
   ./scripts/validate-env.sh
   ```

### Python Dependencies Missing

**Symptoms:**
```
ModuleNotFoundError: No module named 'click'
ImportError: cannot import name 'OpenAI' from 'openai'
```

**Solutions:**
```bash
# Install core dependencies
pip install click openai requests pydantic neo4j python-dotenv

# Install in development mode
pip install -e .

# Check Python version (requires 3.8+)
python --version

# If using virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
```

### Node.js Dependencies Issues

**Symptoms:**
```
Error: Cannot find module '@neo4j/graphql'
npm ERR! peer dep missing
TypeError: createYoga is not a function
```

**Solutions:**
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Install GraphQL service dependencies
cd graphql-service
rm -rf node_modules package-lock.json
npm install

# Check Node.js version (requires 18+)
node --version
npm --version

# Update Node.js if needed
nvm install 18
nvm use 18
```

## 🗄️ Database Connection Issues

### Neo4j Connection Failed

**Symptoms:**
```
ServiceUnavailable: Failed to establish connection
AuthenticationError: Invalid credentials
ConnectionTimeout: Connection timed out after 30s
```

**Diagnosis Steps:**
```bash
# 1. Check Neo4j URI format
echo $NEO4J_URI
# Should be: neo4j+s://instance.databases.neo4j.io or bolt://localhost:7687

# 2. Test network connectivity
ping your-instance.databases.neo4j.io

# 3. Verify credentials
python -c "
import os
print(f'URI: {os.getenv(\"NEO4J_URI\")}')
print(f'User: {os.getenv(\"NEO4J_USER\")}')
print(f'Password: {\"*\" * len(os.getenv(\"NEO4J_PASSWORD\", \"\"))}')
"

# 4. Test direct connection
python -c "
from neo4j import GraphDatabase
import os
try:
    driver = GraphDatabase.driver(
        os.getenv('NEO4J_URI'),
        auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD'))
    )
    driver.verify_connectivity()
    print('✅ Connection successful')
    
    # Test basic query
    with driver.session() as session:
        result = session.run('RETURN 1 as test')
        record = result.single()
        print(f'✅ Query successful: {record[\"test\"]}')
    
    driver.close()
except Exception as e:
    print(f'❌ Connection failed: {e}')
"
```

**Solutions:**

1. **Incorrect URI Format:**
   ```bash
   # Neo4j Aura (cloud)
   NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
   
   # Local Neo4j
   NEO4J_URI=bolt://localhost:7687
   
   # Neo4j Desktop
   NEO4J_URI=neo4j://localhost:7687
   ```

2. **Authentication Issues:**
   ```bash
   # Common mistake: using NEO4J_USERNAME instead of NEO4J_USER
   NEO4J_USER=neo4j  # Correct
   NEO4J_PASSWORD=your-actual-password
   
   # Reset Neo4j Aura password if needed
   # Go to https://console.neo4j.io
   ```

3. **Network/Firewall Issues:**
   ```bash
   # Test port connectivity
   telnet your-instance.databases.neo4j.io 7687
   
   # Check firewall rules
   # Ensure ports 7687 (Bolt) and 7474 (HTTP) are open
   ```

4. **Local Neo4j Setup:**
   ```bash
   # Install Neo4j locally
   # macOS
   brew install neo4j
   brew services start neo4j
   
   # Ubuntu
   wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
   echo 'deb https://debian.neo4j.com stable latest' | sudo tee /etc/apt/sources.list.d/neo4j.list
   sudo apt update
   sudo apt install neo4j
   sudo systemctl start neo4j
   ```

### Neo4j Query Performance Issues

**Symptoms:**
```
Query timeout after 30 seconds
org.neo4j.driver.exceptions.TransientException
Slow GraphQL responses
```

**Diagnosis:**
```cypher
-- Check query performance
PROFILE MATCH (n) RETURN count(n);

-- Show running queries
CALL dbms.listQueries() YIELD query, elapsedTimeMillis 
WHERE elapsedTimeMillis > 1000 
RETURN query, elapsedTimeMillis;

-- Check database statistics
CALL db.stats.retrieve('GRAPH COUNTS');
```

**Solutions:**
```cypher
-- Create indexes for common queries
CREATE INDEX component_station IF NOT EXISTS FOR (c:Component) ON c.station;
CREATE INDEX cell_position IF NOT EXISTS FOR (c:Cell) ON (c.i, c.j);
CREATE INDEX term_ufo_category IF NOT EXISTS FOR (t:Term) ON t.ufo_category;

-- Optimize query patterns
-- Instead of: MATCH (n) WHERE n.property = 'value'
-- Use: MATCH (n {property: 'value'})

-- Use LIMIT for large result sets
MATCH (c:Component) RETURN c LIMIT 100;
```

## 🔌 GraphQL Service Issues

### GraphQL Service Won't Start

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::8080
GraphQL schema compilation failed
TypeError: Cannot read property 'schema' of undefined
```

**Diagnosis:**
```bash
# Check if port 8080 is in use
lsof -i :8080
netstat -an | grep 8080

# Check GraphQL service logs
cd graphql-service
npm run dev 2>&1 | tee ../logs/graphql-debug.log

# Verify package.json scripts
cat package.json | jq '.scripts'
```

**Solutions:**

1. **Port Already in Use:**
   ```bash
   # Kill process using port 8080
   lsof -ti :8080 | xargs kill -9
   
   # Or use different port
   PORT=8081 npm run dev
   ```

2. **Schema Compilation Issues:**
   ```bash
   # Check schema.graphql syntax
   cd graphql-service
   node -e "
   const fs = require('fs');
   const { buildSchema } = require('graphql');
   try {
     const schema = fs.readFileSync('../schema.graphql', 'utf8');
     buildSchema(schema);
     console.log('✅ Schema is valid');
   } catch (e) {
     console.log('❌ Schema error:', e.message);
   }
   "
   ```

3. **Dependency Issues:**
   ```bash
   # Reinstall GraphQL dependencies
   cd graphql-service
   npm install @neo4j/graphql graphql-yoga graphql
   
   # Check for version conflicts
   npm ls graphql
   ```

### GraphQL Queries Failing

**Symptoms:**
```
GraphQLError: Cannot query field "components" on type "Query"
Network error: Failed to fetch
Error: Variable "$station" of required type "String!" was not provided
```

**Diagnosis:**
```bash
# Test GraphQL endpoint directly
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# Test specific query
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { components { id name station } }",
    "variables": {}
  }'

# Check GraphQL Playground
open http://localhost:8080/graphql
```

**Solutions:**

1. **Schema Definition Issues:**
   ```graphql
   # Ensure types are properly defined in schema.graphql
   type Component {
     id: ID!
     name: String!
     station: String!
     # ... other fields
   }
   
   type Query {
     components(station: String): [Component!]!
     component(id: ID!): Component
   }
   ```

2. **Resolver Implementation:**
   ```typescript
   // Check resolvers in graphql-service/src/index.ts
   const resolvers = {
     Query: {
       components: async (parent, args, context) => {
         // Implementation
       }
     }
   };
   ```

3. **Variable Validation:**
   ```graphql
   # Correct query with variables
   query GetComponents($station: String) {
     components(station: $station) {
       id
       name
       station
     }
   }
   ```

## 🤖 OpenAI API Issues

### OpenAI API Key Problems

**Symptoms:**
```
openai.AuthenticationError: Invalid API key
openai.RateLimitError: Rate limit exceeded
openai.APIError: The model 'gpt-4' does not exist
```

**Diagnosis:**
```bash
# Check API key format
echo $OPENAI_API_KEY | head -c 20
# Should start with 'sk-proj-' or 'sk-'

# Test API key validity
python -c "
import openai
import os
try:
    client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    # Don't make actual API calls in diagnosis
    print('✅ API key format is valid')
except Exception as e:
    print(f'❌ API key error: {e}')
"

# Check API usage and limits
# Visit: https://platform.openai.com/usage
```

**Solutions:**

1. **Invalid API Key:**
   ```bash
   # Get new API key from https://platform.openai.com/api-keys
   # Ensure it starts with 'sk-proj-' (new format) or 'sk-' (legacy)
   
   # Update .env file
   OPENAI_API_KEY=sk-proj-your-new-api-key
   ```

2. **Rate Limiting:**
   ```python
   # Add retry logic with exponential backoff
   import time
   import random
   
   def api_call_with_retry(func, max_retries=3):
       for attempt in range(max_retries):
           try:
               return func()
           except openai.RateLimitError as e:
               if attempt == max_retries - 1:
                   raise
               wait_time = (2 ** attempt) + random.uniform(0, 1)
               time.sleep(wait_time)
   ```

3. **Model Access Issues:**
   ```python
   # Check available models
   client = openai.OpenAI()
   models = client.models.list()
   available = [model.id for model in models.data if 'gpt' in model.id]
   print('Available models:', available)
   
   # Use appropriate model
   # gpt-3.5-turbo (always available)
   # gpt-4 (requires API access)
   # gpt-4-turbo-preview (requires API access)
   ```

### Semantic Operations Timing Out

**Symptoms:**
```
ReadTimeout: HTTPSConnectionPool read timed out
Matrix generation taking too long
CLI operation stuck on cell generation
```

**Solutions:**

1. **Increase Timeout:**
   ```python
   # In semmul.py
   client = openai.OpenAI(
       api_key=os.getenv('OPENAI_API_KEY'),
       timeout=60.0  # Increase from default 30s
   )
   ```

2. **Optimize Prompts:**
   ```python
   # Shorter, more focused prompts
   def semantic_multiply(term_a: str, term_b: str) -> str:
       prompt = f"Semantic product of '{term_a}' and '{term_b}'. One phrase:"
       # Instead of long, complex prompts
   ```

3. **Batch Operations:**
   ```python
   # Process multiple cells in single API call
   def batch_semantic_operations(cell_pairs: List[Tuple[str, str]]) -> List[str]:
       prompt = "Generate semantic products for these pairs:\n"
       for i, (a, b) in enumerate(cell_pairs):
           prompt += f"{i+1}. {a} × {b}\n"
       # Process response and split results
   ```

## 🖥️ CLI Integration Issues

### Admin UI Can't Execute CLI Commands

**Symptoms:**
```
Error: spawn ENOENT
CLI command not found
Process exited with code 1
Admin UI shows "CLI operation failed"
```

**Diagnosis:**
```bash
# Test CLI directly
python chirality_cli.py --help
python chirality_cli.py health-check

# Check Python path in Node.js context
node -e "
const { spawn } = require('child_process');
const proc = spawn('python', ['--version']);
proc.stdout.on('data', (data) => console.log('Python version:', data.toString()));
proc.stderr.on('data', (data) => console.log('Error:', data.toString()));
"

# Test CLI JSON output
python chirality_cli.py health-check --json-output
```

**Solutions:**

1. **Python Path Issues:**
   ```javascript
   // In runCli.ts, use full Python path
   const pythonPath = process.env.PYTHON_PATH || 'python3';
   const process = spawn(pythonPath, ['chirality_cli.py', command, ...args]);
   ```

2. **Working Directory Issues:**
   ```javascript
   // Ensure correct working directory
   const process = spawn('python', ['chirality_cli.py', command, ...args], {
     cwd: path.resolve(__dirname, '../..'), // Project root
     env: process.env
   });
   ```

3. **Permission Issues:**
   ```bash
   # Make CLI executable
   chmod +x chirality_cli.py
   
   # Check file permissions
   ls -la chirality_cli.py
   ```

### CLI Output Parsing Errors

**Symptoms:**
```
SyntaxError: Unexpected token in JSON
Admin UI shows garbled output
Progress updates not appearing
```

**Solutions:**

1. **Enable JSON Output:**
   ```typescript
   // Always use --json-output for programmatic access
   const args = ['--json-output', ...otherArgs];
   ```

2. **Handle Mixed Output:**
   ```typescript
   process.stdout.on('data', (data) => {
     const lines = data.toString().split('\n').filter(Boolean);
     
     for (const line of lines) {
       try {
         const parsed = JSON.parse(line);
         // Handle JSON output
         handleStructuredOutput(parsed);
       } catch (e) {
         // Handle non-JSON output (debug info, etc.)
         console.log('CLI Debug:', line);
       }
     }
   });
   ```

## 🔍 Development & Testing Issues

### Tests Failing

**Symptoms:**
```
Test suite failed to run
TypeError: Cannot read property 'mock' of undefined
AssertionError: expected 'success' but got 'error'
```

**Solutions:**

1. **Environment Setup for Tests:**
   ```bash
   # Create test environment file
   cp .env .env.test
   
   # Use test database
   NEO4J_DATABASE=neo4j_test
   
   # Run tests with test environment
   NODE_ENV=test npm test
   ```

2. **Mock External Dependencies:**
   ```javascript
   // Mock OpenAI in tests
   jest.mock('openai', () => ({
     OpenAI: jest.fn().mockImplementation(() => ({
       chat: {
         completions: {
           create: jest.fn().mockResolvedValue({
             choices: [{ message: { content: 'mocked response' } }]
           })
         }
       }
     }))
   }));
   ```

3. **Clean Test Data:**
   ```bash
   # Clear test database before tests
   python -c "
   from neo4j import GraphDatabase
   import os
   driver = GraphDatabase.driver(os.getenv('NEO4J_URI'), auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD')))
   with driver.session(database='neo4j_test') as session:
       session.run('MATCH (n) DETACH DELETE n')
   driver.close()
   "
   ```

### Performance Issues

**Symptoms:**
```
Matrix generation taking > 5 minutes
High memory usage during operations
GraphQL queries timing out
```

**Diagnosis:**
```bash
# Monitor system resources
top -p $(pgrep -f "node.*graphql")
htop

# Check memory usage
python -c "
import psutil
import os
process = psutil.Process(os.getpid())
print(f'Memory usage: {process.memory_info().rss / 1024 / 1024:.1f} MB')
"

# Profile GraphQL queries
# Enable query logging in GraphQL service
```

**Solutions:**

1. **Optimize Database Queries:**
   ```cypher
   -- Add missing indexes
   CREATE INDEX IF NOT EXISTS FOR (c:Component) ON c.station;
   CREATE INDEX IF NOT EXISTS FOR (cell:Cell) ON (cell.i, cell.j);
   
   -- Use LIMIT for large queries
   MATCH (c:Component) RETURN c LIMIT 100;
   ```

2. **Implement Caching:**
   ```typescript
   // Cache GraphQL responses
   import { LRUCache } from 'lru-cache';
   
   const cache = new LRUCache<string, any>({
     maxSize: 100,
     ttl: 1000 * 60 * 5 // 5 minutes
   });
   ```

3. **Batch API Calls:**
   ```python
   # Reduce OpenAI API calls by batching
   def batch_semantic_multiply(pairs: List[Tuple[str, str]]) -> List[str]:
       # Process multiple semantic operations in single API call
   ```

## 📊 Monitoring & Debugging

### Enable Debug Logging

```bash
# GraphQL service debug logs
DEBUG=* npm run dev

# Python CLI debug logs
PYTHONPATH=. python -v chirality_cli.py health-check

# Neo4j query logging
# Add to neo4j.conf:
# dbms.logs.query.enabled=true
# dbms.logs.query.threshold=0
```

### Log Analysis Tools

```bash
# Real-time log monitoring
tail -f logs/graphql-service.log | grep ERROR

# Search for specific errors
grep -r "Connection refused" logs/

# Analyze performance
grep -r "duration:" logs/ | awk '{print $NF}' | sort -n
```

### Health Check Automation

```bash
# Continuous health monitoring
while true; do
  echo "=== Health Check $(date) ==="
  python chirality_cli.py health-check --json-output | jq '.'
  echo
  sleep 30
done
```

## 🆘 Emergency Recovery

### Complete System Reset

```bash
# Stop all services
./scripts/dev-stop.sh

# Clear all data (WARNING: This deletes everything)
# Clear Neo4j database
python -c "
from neo4j import GraphDatabase
import os
driver = GraphDatabase.driver(os.getenv('NEO4J_URI'), auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD')))
with driver.session() as session:
    session.run('MATCH (n) DETACH DELETE n')
print('Database cleared')
driver.close()
"

# Clear node_modules and reinstall
rm -rf node_modules graphql-service/node_modules
npm install
cd graphql-service && npm install

# Reset Python environment
pip uninstall -y -r <(pip freeze)
pip install -e .

# Restart everything
./scripts/dev-start.sh
```

### Backup and Restore

```bash
# Backup Neo4j data
neo4j-admin dump --database=neo4j --to=/backups/chirality_$(date +%Y%m%d).dump

# Restore from backup
neo4j-admin load --from=/backups/chirality_20250115.dump --database=neo4j --force

# Export data for analysis
python -c "
import json
from neo4j import GraphDatabase
import os

driver = GraphDatabase.driver(os.getenv('NEO4J_URI'), auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD')))
with driver.session() as session:
    result = session.run('MATCH (c:Component) RETURN c')
    components = [record['c'] for record in result]
    
with open('backup_components.json', 'w') as f:
    json.dump(components, f, indent=2, default=str)
    
print('Data exported to backup_components.json')
driver.close()
"
```

---

## 📞 Getting Additional Help

If this troubleshooting guide doesn't resolve your issue:

1. **Check System Status**: Run `./scripts/health-check.sh` for comprehensive diagnostics
2. **Enable Verbose Logging**: Use `--verbose` flags and debug modes
3. **Review Recent Changes**: Check `git log --oneline -10` for recent modifications
4. **Create Minimal Reproduction**: Isolate the issue to the smallest possible test case
5. **Gather Diagnostics**: Include logs, error messages, and environment details
6. **Check Documentation**: Review CLAUDE_*.md files for component-specific guidance

**Diagnostic Information to Include:**
- Output of `./scripts/health-check.sh`
- Operating system and versions (Node.js, Python, etc.)
- Complete error messages and stack traces
- Steps to reproduce the issue
- Recent changes or modifications made