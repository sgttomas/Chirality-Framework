# CLAUDE_BACKEND.md

Specific guidance for Claude Code when working on backend development tasks in the Chirality Framework.

## Backend Development Context

This repository is undergoing active backend infrastructure development to support production-grade operations. The backend consists of multiple interconnected services that require careful coordination during development.

### Current Backend Architecture

```
┌─────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Admin UI (Next.js) │────│  GraphQL Service│────│  Neo4j Graph   │
│  API Routes         │    │  (Port 8080)    │    │   Database     │
└─────────────────────┘    └─────────────────┘    └─────────────────┘
         │                           │                       │
    ┌────┴────┐                ┌────┴────┐              ┌────┴────┐
    │CLI Exec │                │@neo4j/  │              │Components│
    │Process  │                │graphql  │              │Cells+UFO │
    │Management│               │Apollo   │              │Terms     │
    └─────────┘                │Yoga     │              │Stations  │
                               └─────────┘              │Provenance│
┌─────────────────┐                                     └─────────┘
│Enhanced Python  │                                           │
│   CLI v2.1.1    │───────────────────────────────────────────┘
│  Semantic Ops   │
└─────────────────┘
```

## Priority Backend Development Tasks

### 🔥 High Priority - Complete Immediately

#### 1. CLI Integration Enhancement
**File**: `chirality-admin/pages/api/phase1/step.ts`
**Status**: Partially completed, needs finishing

**Current State**: 
- `push-axioms` and `generate-c` commands are integrated
- Mock functions have been replaced with real CLI execution

**Remaining Work**:
```typescript
// Add these CLI commands to the step handler
case 'generate-f':
  result = await runCli('generate-f', { api_base, matrix: 'F' });
  break;
case 'generate-d':
  result = await runCli('generate-d', { api_base, matrix: 'D' });
  break;
case 'verify-stages':
  result = await runCli('verify-stages', { api_base });
  break;
```

**Error Handling Requirements**:
- Add timeout handling for operations > 5 minutes
- Implement proper CLI process cleanup on failure
- Stream real-time output to frontend via WebSocket or SSE
- Return structured error responses with actionable suggestions

#### 2. GraphQL Service Health & Monitoring
**File**: `graphql-service/src/index.ts`
**Status**: Basic service running, needs production features

**Required Additions**:
```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  // Check Neo4j connectivity
  // Return service status
});

// Ready endpoint for k8s
app.get('/ready', (req, res) => {
  // Validate all dependencies
  // Return readiness status
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  // Return Prometheus-compatible metrics
});
```

**Performance Requirements**:
- Add request/response logging with correlation IDs
- Implement query performance monitoring
- Add rate limiting (100 requests/minute per client)
- Monitor memory usage during large operations

#### 3. Python CLI Structured Output
**File**: `chirality_cli.py`
**Status**: Human-readable output only, needs JSON mode

**Required Enhancement**:
```python
# Add --json-output flag to all commands
@click.option('--json-output', is_flag=True, help='Output structured JSON')
def generate_c(json_output, **kwargs):
    if json_output:
        return json.dumps({
            "status": "success",
            "operation": "generate-c",
            "matrix_id": "C",
            "cells_generated": 12,
            "duration_seconds": 180,
            "timestamp": datetime.utcnow().isoformat()
        })
```

### 🔶 Medium Priority - Next Development Cycle

#### 4. Database Administration Enhancements
**File**: `neo4j_admin.py`
**Required Features**:
- Bulk matrix operations (`bulk-delete`, `bulk-export`)
- Database integrity validation (`validate-integrity`)
- Performance optimization (`optimize-queries`)
- Backup/restore functionality (`backup`, `restore`)

#### 5. Error Recovery & Resilience
**Multiple Files**: All backend services
**Requirements**:
- Standardized error response format across all APIs
- Automatic retry logic for transient Neo4j failures
- Circuit breaker pattern for OpenAI API calls
- Graceful degradation when services are unavailable

## Development Workflow for Backend Tasks

### Before Starting Work

1. **Check Current Status**:
   ```bash
   # Verify all services are running
   curl http://localhost:8080/graphql
   python chirality_cli.py --help
   npm run smoke:rest && npm run smoke:gql
   ```

2. **Review Git Status**:
   ```bash
   git status
   git diff --name-only
   ```

3. **Check Environment**:
   ```bash
   # Verify required environment variables
   echo $OPENAI_API_KEY
   echo $NEO4J_URI
   ```

### During Development

1. **Use Incremental Testing**:
   ```bash
   # Test individual components
   python chirality_cli.py test-connection
   curl http://localhost:8080/health
   npm run test:api
   ```

2. **Monitor Logs**:
   ```bash
   # Watch GraphQL service logs
   cd graphql-service && npm run dev

   # Watch CLI operations
   python chirality_cli.py generate-c --verbose
   ```

3. **Validate Integration**:
   ```bash
   # Test end-to-end workflow
   npm run test:integration
   ```

### Testing Requirements

#### Unit Tests
- All new functions must have unit tests
- Minimum 80% code coverage for new code
- Mock external dependencies (Neo4j, OpenAI)

#### Integration Tests
- Test CLI integration with admin UI
- Validate GraphQL service with Neo4j
- End-to-end matrix generation workflow

#### Performance Tests
- Benchmark CLI operations
- Load test GraphQL endpoints
- Memory usage monitoring during large operations

## Code Quality Standards

### Python (CLI and Backend Scripts)
```python
# Follow these patterns for CLI development
import click
import json
from typing import Dict, Any, Optional

@click.command()
@click.option('--json-output', is_flag=True, help='Output structured JSON')
@click.option('--verbose', is_flag=True, help='Verbose logging')
def command_template(json_output: bool, verbose: bool):
    """Template for CLI command structure."""
    try:
        result = perform_operation()
        
        if json_output:
            return json.dumps({
                "status": "success",
                "data": result,
                "timestamp": datetime.utcnow().isoformat()
            })
        else:
            click.echo(f"Operation completed: {result}")
            
    except Exception as e:
        error_response = {
            "status": "error",
            "message": str(e),
            "suggestions": get_error_suggestions(e),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if json_output:
            return json.dumps(error_response)
        else:
            click.echo(f"Error: {e}")
            for suggestion in error_response["suggestions"]:
                click.echo(f"  - {suggestion}")
```

### TypeScript (GraphQL Service and Admin UI)
```typescript
// Follow these patterns for API development
interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  timestamp: string;
}

// Error handling middleware
export const errorHandler = (error: Error, req: Request, res: Response) => {
  const response: ApiResponse<null> = {
    status: 'error',
    message: error.message,
    timestamp: new Date().toISOString()
  };
  
  // Log error with correlation ID
  console.error(`[${req.headers['x-correlation-id']}]`, error);
  
  res.status(500).json(response);
};
```

## Common Backend Development Patterns

### 1. CLI Process Management
```typescript
// In admin UI API routes
export async function runCliCommand(command: string, args: Record<string, any>) {
  const process = spawn('python', ['chirality_cli.py', command, ...formatArgs(args)]);
  
  return new Promise((resolve, reject) => {
    let output = '';
    let errors = '';
    
    // Set timeout for long operations
    const timeout = setTimeout(() => {
      process.kill();
      reject(new Error('CLI operation timed out'));
    }, 5 * 60 * 1000); // 5 minutes
    
    process.stdout.on('data', (data) => {
      output += data.toString();
      // Stream to frontend if needed
    });
    
    process.stderr.on('data', (data) => {
      errors += data.toString();
    });
    
    process.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`CLI failed: ${errors}`));
      }
    });
  });
}
```

### 2. GraphQL Error Handling
```typescript
// In GraphQL resolvers
export const resolvers = {
  Query: {
    component: async (parent, args, context) => {
      try {
        const result = await neo4j.run(query, args);
        return result.records[0];
      } catch (error) {
        console.error('GraphQL query failed:', error);
        throw new Error(`Failed to retrieve component: ${error.message}`);
      }
    }
  }
};
```

### 3. Neo4j Connection Management
```python
# In Python CLI tools
from neo4j import GraphDatabase
import os

class Neo4jManager:
    def __init__(self):
        self.uri = os.getenv('NEO4J_URI')
        self.user = os.getenv('NEO4J_USER')
        self.password = os.getenv('NEO4J_PASSWORD')
        self.driver = None
    
    def connect(self):
        try:
            self.driver = GraphDatabase.driver(
                self.uri, 
                auth=(self.user, self.password),
                max_connection_lifetime=30 * 60,  # 30 minutes
                max_connection_pool_size=50
            )
            self.driver.verify_connectivity()
        except Exception as e:
            raise ConnectionError(f"Failed to connect to Neo4j: {e}")
    
    def close(self):
        if self.driver:
            self.driver.close()
```

## Performance Considerations

### CLI Operations
- Use connection pooling for Neo4j operations
- Implement caching for repeated GraphQL queries
- Add progress reporting for operations > 30 seconds
- Batch database updates where possible

### GraphQL Service
- Implement query complexity analysis
- Add request rate limiting
- Monitor memory usage during large graph traversals
- Use connection pooling for database connections

### Database Operations
- Optimize Cypher queries with EXPLAIN
- Use indexes for frequently queried properties
- Implement pagination for large result sets
- Monitor query execution times

## Troubleshooting Guide

### Common Issues

1. **CLI Process Hangs**:
   - Check OpenAI API rate limits
   - Verify Neo4j connectivity
   - Ensure proper timeout handling

2. **GraphQL Service Memory Issues**:
   - Monitor query complexity
   - Check for memory leaks in resolvers
   - Implement query result caching

3. **Neo4j Connection Failures**:
   - Verify credentials and URI
   - Check network connectivity
   - Monitor connection pool usage

### Debug Commands
```bash
# Test CLI connectivity
python chirality_cli.py test-connection --verbose

# Check GraphQL service health
curl http://localhost:8080/health

# Monitor Neo4j performance
# (Add monitoring queries here)
```

## Integration Points

### Admin UI ↔ CLI
- API routes call CLI commands via process spawning
- Real-time output streaming via WebSocket
- Structured JSON responses for UI parsing

### GraphQL Service ↔ Neo4j
- Direct database queries via @neo4j/graphql
- Connection pooling and retry logic
- Query optimization and caching

### CLI ↔ GraphQL Service
- CLI queries GraphQL for cell context
- GraphQL mutations for cell updates
- Batch operations for performance

---

**Important**: Always test backend changes with the full integration workflow to ensure compatibility across all services.