# API Reference & Examples

Complete API documentation with practical examples for the Chirality Framework backend services.

## 🔗 Service Endpoints Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  GraphQL Service    │    │   Admin UI API      │    │   CLI Interface     │
│  localhost:8080     │    │   localhost:3001    │    │   Command Line      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
   /graphql (POST)              /api/phase1/*              chirality_cli.py
   /health (GET)                /api/orchestrate/*         neo4j_admin.py
   /ready (GET)                                           
   /metrics (GET)                                         
```

## 🔧 GraphQL Service API

### Base URL
```
http://localhost:8080
```

### Core Endpoints

#### 1. GraphQL Endpoint
```http
POST /graphql
Content-Type: application/json
```

**Basic Query Example:**
```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ __schema { types { name } } }"
  }'
```

**Component Query Example:**
```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetComponents($station: String) { components(station: $station) { id name station shape cells { i j resolved } } }",
    "variables": { "station": "Requirements" }
  }'
```

**Response Format:**
```json
{
  "data": {
    "components": [
      {
        "id": "C",
        "name": "Requirements Matrix",
        "station": "Requirements",
        "shape": [3, 4],
        "cells": [
          {
            "i": 0,
            "j": 0,
            "resolved": "Problem.Systematic.Analysis"
          }
        ]
      }
    ]
  }
}
```

#### 2. Health Check Endpoint
```http
GET /health
```

**Example:**
```bash
curl http://localhost:8080/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "graphql-service",
  "version": "1.0.0"
}
```

#### 3. Readiness Check Endpoint
```http
GET /ready
```

**Example:**
```bash
curl http://localhost:8080/ready
```

**Response (Ready):**
```json
{
  "status": "ready",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "dependencies": {
    "neo4j": "connected",
    "graphql": "schema_loaded"
  }
}
```

**Response (Not Ready):**
```json
{
  "status": "not_ready",
  "error": "Neo4j connection failed",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### 4. Metrics Endpoint
```http
GET /metrics
```

**Example:**
```bash
curl http://localhost:8080/metrics
```

**Response:**
```json
{
  "queries": {
    "components": {
      "count": 45,
      "avgDuration": 23.5,
      "minDuration": 12.1,
      "maxDuration": 156.7,
      "p95Duration": 89.2
    }
  },
  "errors": {
    "components": 2,
    "cells": 0
  },
  "connectionPool": {
    "active": 3,
    "idle": 7,
    "total": 10
  },
  "system": {
    "memory": {
      "rss": 45678912,
      "heapTotal": 32123456,
      "heapUsed": 23456789
    },
    "uptime": 3600.5,
    "cpuUsage": {
      "user": 123456,
      "system": 78901
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### GraphQL Schema Operations

#### Query Types

**Get All Components:**
```graphql
query GetAllComponents {
  components {
    id
    name
    station
    shape
    createdAt
    updatedAt
    cells {
      i
      j
      resolved
      rawTerms
      intermediate
    }
  }
}
```

**Get Component by ID:**
```graphql
query GetComponent($id: ID!) {
  component(id: $id) {
    id
    name
    station
    shape
    cells {
      i
      j
      resolved
      rawTerms
      intermediate
    }
  }
}
```

**Search Cells:**
```graphql
query SearchCells($query: String!, $station: String, $limit: Int) {
  searchCells(query: $query, station: $station, limit: $limit) {
    i
    j
    resolved
    component {
      id
      name
      station
    }
  }
}
```

#### Mutation Types

**Create Component:**
```graphql
mutation CreateComponent($input: ComponentInput!) {
  createComponent(input: $input) {
    id
    name
    station
    shape
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Test Matrix",
    "station": "Requirements",
    "shape": [3, 4]
  }
}
```

**Update Cell:**
```graphql
mutation UpdateCell($id: ID!, $content: String!) {
  updateCell(id: $id, content: $content) {
    id
    i
    j
    resolved
    updatedAt
  }
}
```

**Bulk Update Cells:**
```graphql
mutation BulkUpdateCells($updates: [CellUpdateInput!]!) {
  bulkUpdateCells(updates: $updates) {
    id
    i
    j
    resolved
  }
}
```

**Variables:**
```json
{
  "updates": [
    {
      "id": "cell_1_1",
      "resolved": "Updated content",
      "intermediate": ["step1", "step2"]
    },
    {
      "id": "cell_1_2",
      "resolved": "Another update",
      "intermediate": ["stepA", "stepB"]
    }
  ]
}
```

## 🎛️ Admin UI API

### Base URL
```
http://localhost:3001/api
```

### Phase 1 Operations

#### 1. CLI Step Execution
```http
POST /phase1/step
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "generate-c",
  "parameters": {
    "api_base": "http://localhost:8080",
    "matrix": "C",
    "rows": "all",
    "cols": "all"
  }
}
```

**Example with curl:**
```bash
curl -X POST http://localhost:3001/api/phase1/step \
  -H "Content-Type: application/json" \
  -d '{
    "action": "push-axioms",
    "parameters": {
      "api_base": "http://localhost:8080",
      "spec": "NORMATIVE_Chirality_Framework_14.2.1.1.txt"
    }
  }'
```

**Response:**
```json
{
  "status": "success",
  "action": "push-axioms",
  "output": "Matrices A, B, and J loaded successfully",
  "duration": 15.6,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### 2. Phase 1 Status
```http
GET /phase1/status
```

**Example:**
```bash
curl http://localhost:3001/api/phase1/status
```

**Response:**
```json
{
  "phase": "Phase 1",
  "status": "in_progress",
  "currentStep": "generate-c",
  "completedSteps": ["push-axioms"],
  "nextSteps": ["generate-f", "generate-d", "verify-stages"],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### 3. Component List
```http
GET /phase1/list
```

**Example:**
```bash
curl http://localhost:3001/api/phase1/list
```

**Response:**
```json
{
  "components": [
    {
      "id": "A",
      "name": "Problem Statement",
      "station": "Problem",
      "shape": [3, 4],
      "cellCount": 12,
      "completionStatus": "complete"
    },
    {
      "id": "C",
      "name": "Requirements",
      "station": "Requirements", 
      "shape": [3, 4],
      "cellCount": 8,
      "completionStatus": "partial"
    }
  ],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Orchestration API

#### 1. Run CLI Command
```http
POST /orchestrate/run
Content-Type: application/json
```

**Request Body:**
```json
{
  "cmd": "generate-c",
  "args": {
    "api_base": "http://localhost:8080",
    "matrix": "C",
    "rows": "all",
    "cols": "all"
  }
}
```

**Response:**
```json
{
  "jobId": "job_abc123",
  "status": "started",
  "command": "generate-c",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### 2. Job Status
```http
GET /orchestrate/status?jobId=job_abc123
```

**Response (Running):**
```json
{
  "jobId": "job_abc123",
  "status": "running",
  "progress": {
    "current": 5,
    "total": 12,
    "percentage": 41.7
  },
  "currentOperation": "Generating cell (1,2)",
  "startTime": "2025-01-15T10:30:00.000Z",
  "duration": 45.2
}
```

**Response (Completed):**
```json
{
  "jobId": "job_abc123", 
  "status": "completed",
  "result": {
    "matrix": "C",
    "cellsGenerated": 12,
    "duration": 180.5
  },
  "startTime": "2025-01-15T10:30:00.000Z",
  "endTime": "2025-01-15T10:33:00.500Z"
}
```

#### 3. Job Logs
```http
GET /orchestrate/logs/job_abc123
```

**Response:**
```json
{
  "jobId": "job_abc123",
  "logs": [
    {
      "timestamp": "2025-01-15T10:30:00.000Z",
      "level": "info",
      "message": "Starting matrix C generation"
    },
    {
      "timestamp": "2025-01-15T10:30:05.123Z",
      "level": "info", 
      "message": "Generated cell (0,0): Problem.Systematic.Analysis"
    },
    {
      "timestamp": "2025-01-15T10:30:10.456Z",
      "level": "warn",
      "message": "Cell (0,1) took longer than expected: 8.2s"
    }
  ]
}
```

## 🖥️ Command Line Interface

### Core CLI Commands

#### 1. Generate Matrix C
```bash
python chirality_cli.py generate-c [OPTIONS]
```

**Options:**
- `--api-base URL`: GraphQL API base URL (default: http://localhost:8080)
- `--matrix TEXT`: Matrix identifier (default: C)
- `--rows TEXT`: Row selection (default: all)
- `--cols TEXT`: Column selection (default: all)
- `--json-output`: Output structured JSON
- `--verbose`: Verbose logging

**Examples:**
```bash
# Basic usage
python chirality_cli.py generate-c

# With JSON output
python chirality_cli.py generate-c --json-output

# Specific rows/columns
python chirality_cli.py generate-c --rows "0,1" --cols "0,1,2"

# Custom API endpoint
python chirality_cli.py generate-c --api-base http://production:8080
```

**JSON Output Format:**
```json
{
  "status": "success",
  "operation": "generate-c", 
  "matrix_id": "C",
  "cells_generated": 12,
  "duration_seconds": 180.5,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "cells": [
    {
      "position": [0, 0],
      "content": "Problem.Systematic.Analysis",
      "stage": "product"
    }
  ]
}
```

#### 2. Push Axioms
```bash
python chirality_cli.py push-axioms [OPTIONS]
```

**Options:**
- `--api-base URL`: GraphQL API base URL
- `--spec PATH`: Path to normative specification file
- `--json-output`: Output structured JSON

**Example:**
```bash
python chirality_cli.py push-axioms \
  --spec NORMATIVE_Chirality_Framework_14.2.1.1.txt \
  --json-output
```

#### 3. Health Check
```bash
python chirality_cli.py health-check [OPTIONS]
```

**Options:**
- `--json-output`: Output structured JSON
- `--verbose`: Detailed health information

**Example:**
```bash
python chirality_cli.py health-check --verbose --json-output
```

**JSON Output:**
```json
{
  "status": "healthy",
  "checks": {
    "neo4j_connection": "pass",
    "graphql_service": "pass", 
    "openai_api": "pass",
    "environment_variables": "pass"
  },
  "details": {
    "neo4j_latency_ms": 23.5,
    "graphql_response_time_ms": 45.2,
    "environment": {
      "python_version": "3.9.7",
      "neo4j_uri": "neo4j+s://xxx.databases.neo4j.io",
      "openai_model": "gpt-4"
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Database Administration

#### 1. List Components
```bash
python neo4j_admin.py list [OPTIONS]
```

**Options:**
- `--station TEXT`: Filter by station
- `--format TEXT`: Output format (table, json, csv)
- `--verbose`: Include detailed information

**Examples:**
```bash
# List all components
python neo4j_admin.py list

# Filter by station
python neo4j_admin.py list --station Requirements

# JSON output
python neo4j_admin.py list --format json
```

#### 2. Delete Components
```bash
python neo4j_admin.py delete [OPTIONS]
```

**Options:**
- `--id TEXT`: Component ID to delete
- `--station TEXT`: Delete all components at station
- `--confirm`: Skip confirmation prompt

**Examples:**
```bash
# Delete specific component
python neo4j_admin.py delete --id C --confirm

# Delete all at station
python neo4j_admin.py delete --station Requirements --confirm
```

## 🔌 Integration Examples

### 1. Complete Workflow Example

**Step 1: Health Check**
```bash
# Check system health
curl http://localhost:8080/health
python chirality_cli.py health-check --json-output
```

**Step 2: Initialize Framework**
```bash
# Push axioms to database
python chirality_cli.py push-axioms \
  --spec NORMATIVE_Chirality_Framework_14.2.1.1.txt \
  --json-output
```

**Step 3: Generate Matrices**
```bash
# Generate requirements matrix
python chirality_cli.py generate-c --json-output

# Generate objectives matrix  
python chirality_cli.py generate-f --json-output

# Generate solution objectives
python chirality_cli.py generate-d --json-output
```

**Step 4: Verify Results**
```bash
# List all components
python neo4j_admin.py list --format json

# Query via GraphQL
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ components { id name station cellCount } }"
  }'
```

### 2. Admin UI Integration Example

**JavaScript/TypeScript Integration:**
```typescript
// Admin UI integration example
async function runCliOperation(action: string, parameters: Record<string, any>) {
  const response = await fetch('/api/phase1/step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, parameters })
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    console.log(`${action} completed in ${result.duration}s`);
    return result;
  } else {
    throw new Error(`${action} failed: ${result.error}`);
  }
}

// Usage
try {
  await runCliOperation('push-axioms', {
    api_base: 'http://localhost:8080',
    spec: 'NORMATIVE_Chirality_Framework_14.2.1.1.txt'
  });
  
  await runCliOperation('generate-c', {
    api_base: 'http://localhost:8080',
    matrix: 'C'
  });
  
  console.log('Workflow completed successfully');
} catch (error) {
  console.error('Workflow failed:', error);
}
```

### 3. Monitoring and Debugging

**Real-time Health Monitoring:**
```bash
# Continuous health monitoring
while true; do
  echo "=== Health Check $(date) ==="
  curl -s http://localhost:8080/health | jq '.'
  curl -s http://localhost:8080/metrics | jq '.queries'
  sleep 30
done
```

**Log Monitoring:**
```bash
# Monitor GraphQL service logs
tail -f logs/graphql-service.log

# Monitor CLI operations
python chirality_cli.py generate-c --verbose 2>&1 | tee cli-operation.log
```

## 🚨 Error Handling

### Common Error Responses

#### GraphQL Errors
```json
{
  "errors": [
    {
      "message": "Component not found: INVALID_ID",
      "extensions": {
        "code": "NOT_FOUND",
        "statusCode": 404,
        "timestamp": "2025-01-15T10:30:00.000Z"
      }
    }
  ]
}
```

#### CLI Errors
```json
{
  "status": "error",
  "operation": "generate-c",
  "message": "Failed to connect to Neo4j at bolt://localhost:7687",
  "suggestions": [
    "Check if Neo4j is running: systemctl status neo4j",
    "Verify credentials in .env file",
    "Test connection: curl http://localhost:7474/browser/"
  ],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### Admin UI Errors
```json
{
  "status": "error",
  "action": "generate-c",
  "error": "CLI operation timed out after 300 seconds",
  "details": {
    "timeout": 300,
    "partialResults": {
      "cellsGenerated": 5,
      "totalCells": 12
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Rate Limiting
All APIs implement rate limiting:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-01-15T10:31:00.000Z

{
  "error": "Rate limit exceeded",
  "retryAfter": 60,
  "limit": 100,
  "window": 60
}
```

---

This API reference provides complete examples for integrating with all Chirality Framework backend services. Use these examples as templates for building your own integrations or debugging existing implementations.