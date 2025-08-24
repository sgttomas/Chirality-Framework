# API Documentation - Chirality Semantic Framework

*Complete API reference for the GraphQL Neo4j integration with document generation and graph mirror capabilities*

## Overview

The Chirality Semantic Framework provides REST and GraphQL APIs for document generation and graph-based discovery. The implementation includes file-based document storage with optional Neo4j mirroring for enhanced relationship tracking.

**Implementation Status:**
- ✅ **Document Generation REST API** - Two-pass generation with file storage
- ✅ **GraphQL API** - Read-only access to graph mirror with authentication  
- ✅ **Graph Mirror Integration** - Selective component mirroring to Neo4j
- ✅ **Health and Validation Endpoints** - Operational monitoring and testing

**Base URL**: `http://localhost:3001` (development)

## Document Generation API

### Core Document Generation

#### POST /api/core/orchestrate
**Two-pass document generation with cross-referential refinement**

Generates all four document types (DS/SP/X/M) using the two-pass methodology: sequential generation followed by cross-referential refinement and final resolution.

**Request**:
```bash
POST /api/core/orchestrate
Content-Type: application/json

{}  # Empty body - uses current problem from state
```

**Response**:
```typescript
{
  success: true,
  pass1: {
    DS: Triple<DSItem[]>,
    SP: Triple<SPItem[]>, 
    X: Triple<XItem[]>,
    M: Triple<MItem[]>
  },
  pass2: {
    DS: Triple<DSItem[]>,
    SP: Triple<SPItem[]>,
    X: Triple<XItem[]>, 
    M: Triple<MItem[]>
  },
  logs: string[],              // Generation progress logs
  totalTimeSeconds: number     // Total generation time
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/core/orchestrate \
  -H "Content-Type: application/json" \
  -d '{}'

# Response includes Pass 1, Pass 2, and final resolution logs
```

#### POST /api/core/run
**Single document generation**

Generates a specific document type using current context from other documents.

**Request**:
```bash
POST /api/core/run
Content-Type: application/json

{
  "kind": "DS" | "SP" | "X" | "M"
}
```

**Response**:
```typescript
{
  kind: string,
  triple: Triple<any>,         // Generated document
  latencyMs: number           // Generation time in milliseconds
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/core/run \
  -H "Content-Type: application/json" \
  -d '{"kind": "DS"}'
```

### State Management

#### GET /api/core/state
**Get current document state**

Returns the current problem definition and generated documents.

**Response**:
```typescript
{
  problem: {
    title: string,
    statement: string,
    initialVector: string[]
  },
  finals: {
    DS?: Triple<DSItem[]>,
    SP?: Triple<SPItem[]>,
    X?: Triple<XItem[]>,
    M?: Triple<MItem[]>
  },
  metadata?: {
    generatedAt: string,
    twoPassMode: boolean,
    resolutionStep: boolean
  }
}
```

#### POST /api/core/state
**Update document state**

Updates the problem definition or document state.

**Request**:
```typescript
{
  problem?: {
    title?: string,
    statement?: string,
    initialVector?: string[]
  },
  finals?: {
    DS?: Triple<DSItem[]>,
    SP?: Triple<SPItem[]>,
    X?: Triple<XItem[]>,
    M?: Triple<MItem[]>
  }
}
```

#### DELETE /api/core/state
**Clear all state**

Resets the application to initial state, clearing all documents and problem definition.

**Example**:
```bash
# Get current state
curl http://localhost:3001/api/core/state

# Set problem for generation
curl -X POST http://localhost:3001/api/core/state \
  -H "Content-Type: application/json" \
  -d '{
    "problem": {
      "statement": "implement user authentication system"
    }
  }'

# Clear all state
curl -X DELETE http://localhost:3001/api/core/state
```

### Chat Interface

#### POST /api/chat/stream
**RAG-enhanced streaming chat**

Provides streaming chat responses with automatic document context injection.

**Request**:
```typescript
{
  message: string,
  conversationId?: string
}
```

**Response**: Server-Sent Events stream

**Example**:
```bash
curl -X POST http://localhost:3001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How should I handle password validation?",
    "conversationId": "auth-discussion"
  }'
```

## Graph API (v1)

The Graph API provides read-only access to the Neo4j mirror containing selected document components and relationships.

### Authentication
All Graph API endpoints require Bearer token authentication:
```bash
Authorization: Bearer your-graphql-bearer-token
```

### GraphQL Endpoint

#### POST /api/v1/graph/graphql
**GraphQL query interface**

Provides flexible querying of document relationships and component search.

**Authentication**: Bearer token required
**CORS**: Configurable allowed origins

### Data Structures/Schema

#### JSON Matrix Format

The framework uses standardized JSON matrix format for semantic operations. Matrix structure follows the specification in [`chirality/cf14_spec.json`](chirality/cf14_spec.json).

**Example Matrix A (Problem Axioms)**:
```json
{
  "name": "A",
  "station": "Problem Statement",
  "shape": [3, 4],
  "column_names": ["Guiding", "Applying", "Judging", "Reviewing"],
  "row_names": ["Normative", "Operative", "Evaluative"],
  "elements": [
    ["Direction", "Implementation", "Evaluation", "Assessment"],
    ["Leadership", "Execution", "Decision-making", "Quality Control"],
    ["Standards", "Performance", "Feedback", "Refinement"]
  ],
  "metadata": {
    "created_at": "2025-01-17T12:00:00Z",
    "content_hash": "a1b2c3d4e5f6...",
    "domain": "general"
  }
}
```

**Matrix Validation Requirements**:
- `shape` must match `elements` dimensions
- `column_names` length must equal `shape[1]`
- `row_names` length must equal `shape[0]`
- All `elements` must be non-empty strings
- `content_hash` must match SHA1 of elements content

**Schema**:
```graphql
type Document {
  id: ID!                    # "DS:current", "SP:current", etc.
  kind: String!              # "DS", "SP", "X", "M"
  slug: String!              # Document identifier
  title: String!             # Human-readable title
  updatedAt: String          # ISO timestamp
  components: [Component!]!  # Selected components
  references: [Document!]!   # Cross-document references
  derivedFrom: [Document!]!  # Document lineage
}

type Component {
  id: ID!                    # SHA1 stable identifier
  type: String!              # Section type (API, Decision, etc.)
  title: String!             # Section heading
  anchor: String             # URL anchor
  order: Int                 # Order within document
  score: Int                 # Selection algorithm score (integer 0-10)
  parent: Document!          # Parent document
}

type Query {
  document(where: DocumentWhereOne!): Document
  documents(where: DocumentWhere): [Document!]!
  searchComponents(q: String!, limit: Int = 20): [Component!]!
}
```

**Query Examples**:

**Get Document with Components and Relationships**:
```bash
curl -X POST http://localhost:3001/api/v1/graph/graphql \
  -H "Authorization: Bearer dev-super-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetDocument($id: ID!) { 
      document(where: {id: $id}) { 
        id title kind updatedAt
        components { 
          id title type anchor score 
        }
        references { 
          id title kind 
        }
        derivedFrom { 
          id title kind 
        }
      } 
    }",
    "variables": {"id": "DS:current"}
  }'
```

**Search Components by Keyword**:
```bash
curl -X POST http://localhost:3001/api/v1/graph/graphql \
  -H "Authorization: Bearer dev-super-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query SearchComponents($q: String!) {
      searchComponents(q: $q, limit: 10) {
        id title type score
        parent { id title kind }
      }
    }",
    "variables": {"q": "API"}
  }'
```

**Get All Documents Overview**:
```bash
curl -X POST http://localhost:3001/api/v1/graph/graphql \
  -H "Authorization: Bearer dev-super-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query AllDocuments {
      documents {
        id title kind updatedAt
        components { id title score }
      }
    }"
  }'
```

### Health and Monitoring

#### GET /api/v1/graph/health
**Graph system health check**

Returns Neo4j connection status and database statistics.

**Response**:
```typescript
{
  status: "healthy" | "unhealthy",
  neo4j: {
    connected: boolean,
    documents: number,        // Count of Document nodes
    components: number        // Count of Component nodes
  },
  graph_enabled: boolean,     // Feature flag status
  timestamp: string          // ISO timestamp
}
```

**Example**:
```bash
curl http://localhost:3001/api/v1/graph/health

# Expected healthy response:
{
  "status": "healthy",
  "neo4j": {
    "connected": true,
    "documents": 4,
    "components": 12
  },
  "graph_enabled": true,
  "timestamp": "2025-08-17T10:30:00Z"
}
```

#### POST /api/v1/graph/validate
**Component selection validation**

Tests the component selection algorithm without writing to the graph.

**Request**:
```typescript
{
  bundle: {
    DS?: Doc,
    SP?: Doc, 
    X?: Doc,
    M?: Doc
  }
}
```

**Response**:
```typescript
{
  docs: string[],                    // Document IDs that would be created
  keepByDoc: Record<string, string[]>, // Components that would be kept per document
  components: Array<{                 // Components that would be created
    id: string,
    docId: string
  }>
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/v1/graph/validate \
  -H "Content-Type: application/json" \
  -d '{
    "bundle": {
      "DS": {
        "id": "DS:test",
        "kind": "DS", 
        "slug": "test",
        "title": "Test Document",
        "sections": [],
        "raw": "# Test Document\n## API Integration\nSee [[SP:deploy]] and [[X:solution]] for implementation."
      }
    }
  }'

# Response shows what would be selected:
{
  "docs": ["DS:test"],
  "keepByDoc": {"DS:test": ["a1b2c3..."]},
  "components": [{"id": "a1b2c3...", "docId": "DS:test"}]
}
```

## Error Handling

### Standard Error Response Format
All endpoints return errors in a standardized envelope:
```typescript
{
  code: string,               // Machine-readable error code
  message: string,            // Human-readable error message  
  details?: object,           // Additional error context
  graph_enabled?: boolean     // For graph endpoints when disabled
}
```

### Error Codes
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Valid auth but insufficient permissions
- `RATE_LIMITED` - Rate limit exceeded
- `GRAPH_DISABLED` - Graph system disabled via feature flag
- `QUERY_TOO_COMPLEX` - GraphQL query exceeds depth/complexity limits
- `VALIDATION_ERROR` - Invalid input parameters
- `INTERNAL_ERROR` - Server-side error
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid input, malformed query)
- `401` - Unauthorized (missing or invalid authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error
- `503` - Service Unavailable (graph system disabled or unhealthy)

### Common Error Scenarios

**Document Generation Errors**:
```bash
# Problem not set
curl -X POST http://localhost:3001/api/core/orchestrate
# Returns: {"code": "VALIDATION_ERROR", "message": "Problem statement required"}

# Invalid document kind  
curl -X POST http://localhost:3001/api/core/run -d '{"kind": "INVALID"}'
# Returns: {"code": "VALIDATION_ERROR", "message": "kind required (DS|SP|X|M)"}
```

**Graph API Errors**:
```bash
# Missing authentication
curl -X POST http://localhost:3001/api/v1/graph/graphql -d '{"query": "{ documents { id } }"}'
# Returns: {"code": "UNAUTHORIZED", "message": "Bearer token required"}

# Graph system disabled
curl http://localhost:3001/api/v1/graph/health  
# Returns: {"code": "GRAPH_DISABLED", "message": "Graph system disabled", "graph_enabled": false}

# Rate limit exceeded
curl -X POST http://localhost:3001/api/core/orchestrate
# Returns: {"code": "RATE_LIMITED", "message": "Too many requests", "details": {"retry_after": 60}}
```

## Rate Limiting and Security

### Authentication Requirements
- **Document Generation API**: Protected mode recommended for production (bearer token) or dev-only mode via `DEV_MODE=true`
- **Graph API**: Bearer token authentication required for all endpoints  
- **GraphQL**: Bearer token required, CORS configured

### Security Features
- **Query Depth Limiting**: GraphQL queries limited to prevent abuse
- **CORS Protection**: Configurable allowed origins for Graph API
- **Feature Flagging**: Complete graph system can be disabled via environment
- **Read-Only Access**: Graph API provides query-only access, no mutations

### Configuration

Complete environment variable reference for all system components:

```bash
# Core System Settings
FEATURE_GRAPH_ENABLED=true                    # Enable/disable graph mirror system
DEV_MODE=false                                # Dev-only mode (disables Core API auth)

# Neo4j Database Connection
NEO4J_URI=bolt://localhost:7687               # Neo4j connection string
NEO4J_USERNAME=neo4j                          # Database username
NEO4J_PASSWORD=your-password                  # Database password
NEO4J_MAX_POOL_SIZE=50                        # Connection pool size

# GraphQL API Security
GRAPHQL_BEARER_TOKEN=your-secure-token        # Authentication token
GRAPHQL_CORS_ORIGINS=http://localhost:3000    # Allowed origins (comma-separated)

# Rate Limiting
RATE_LIMIT_RPM=60                             # Requests per minute
RATE_LIMIT_BURST=120                          # Burst capacity

# CF14 Legacy Matrix Operations (if using)
OPENAI_API_KEY=your-openai-key                # For LLM semantic operations
OPENAI_MODEL=gpt-4                            # Model for matrix resolution

# Application Settings
PORT=3001                                     # Application port
NODE_ENV=development                          # Environment mode
```

### Configuration Validation

The system validates required environment variables on startup:

**Required for Graph API:**
- `FEATURE_GRAPH_ENABLED=true`
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
- `GRAPHQL_BEARER_TOKEN`

**Required for CF14 Operations:**
- `OPENAI_API_KEY` (for OpenAI resolver)

**Optional Settings:**
- `DEV_MODE=true` (disables auth for development)
- `GRAPHQL_CORS_ORIGINS` (defaults to `*` in development)
- Rate limiting variables (use defaults if not specified)

## Integration Examples

### Frontend Integration with Apollo Client
```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'http://localhost:3001/api/v1/graph/graphql'
});

const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPHQL_TOKEN}`
  }
}));

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

// Usage in React component
const { data, loading, error } = useQuery(gql`
  query GetDocuments {
    documents {
      id title kind
      components { id title score }
    }
  }
`);
```

### Backend Integration
```typescript
// Document generation with automatic graph mirroring
import { mirrorAfterWrite } from '@/lib/graph/integration';

async function generateDocuments(problem: string) {
  // Generate documents
  const result = await orchestrateTwoPass(problem);
  
  // Save to files (source of truth)
  writeState({ finals: result.pass2 });
  
  // Mirror to graph (async, non-blocking)
  mirrorAfterWrite(result.pass2);
  
  return result;
}
```

### Command Line Usage
```bash
# Complete workflow example
# 1. Start services
docker compose -f docker-compose.neo4j.yml up -d
npm run dev

# 2. Set problem and generate documents
curl -X POST http://localhost:3001/api/core/state \
  -H "Content-Type: application/json" \
  -d '{"problem": {"statement": "implement user authentication"}}'

curl -X POST http://localhost:3001/api/core/orchestrate

# 3. Query generated documents via GraphQL
curl -X POST http://localhost:3001/api/v1/graph/graphql \
  -H "Authorization: Bearer dev-super-secret" \
  -d '{"query": "{ documents { id title components { title score } } }"}'

# 4. Search components
curl -X POST http://localhost:3001/api/v1/graph/graphql \
  -H "Authorization: Bearer dev-super-secret" \
  -d '{"query": "query { searchComponents(q: \"API\") { title parent { title } } }"}'
```

## Development and Testing

### Development Setup
```bash
# Install dependencies
npm install

# Environment configuration
cp .env.example .env.local
# Edit .env.local with required variables

# Start development server
npm run dev

# Initialize graph database (if using)
docker compose -f docker-compose.neo4j.yml up -d
npm run tsx scripts/init-graph-constraints.ts
```

### Testing Endpoints
```bash
# Test document generation
npm run tsx scripts/test-document-generation.ts

# Test graph integration
npm run tsx scripts/test-graph-integration.ts

# Run full test suite
npm test
```

### Debugging
```bash
# Check system health
curl http://localhost:3001/api/healthz
curl http://localhost:3001/api/v1/graph/health

# View current state
curl http://localhost:3001/api/core/state

# Debug chat system
curl http://localhost:3001/api/chat/debug
```

## Component Selection Configuration

### Selection Algorithm Parameters
The component selection algorithm uses configurable parameters in `config/selection.json`:

```json
{
  "selection_v": "1.0.0",
  "threshold": 3,                    // Minimum score for inclusion
  "topKPerDoc": 12,                  // Max components per document
  "maxNodesPerRun": 50,              // Global cap per mirror operation
  "keywords": [                      // High-value section keywords
    "API", 
    "Dependency", 
    "Integration", 
    "Decision", 
    "Risk", 
    "Metric"
  ],
  "largeSectionCharLimit": 10000     // Size penalty threshold
}
```

### Scoring Rules
- **Cross-references**: +3 points for sections with 2+ references to other documents
- **Keywords**: +2 points for section headings starting with high-value keywords  
- **Size penalty**: -2 points for large sections (>10k chars) with few references
- **Threshold**: Minimum score of 3 required for inclusion
- **Caps**: Maximum 12 components per document, 50 total nodes per operation

## Performance Characteristics

### Response Times
- **Document Generation**: 45-90 seconds for two-pass generation
- **Single Document**: 15-30 seconds per document
- **GraphQL Queries**: <500ms for typical relationship queries
- **Health Checks**: <100ms
- **Graph Mirroring**: 1-3 seconds (async, non-blocking)

### Scalability
- **Documents**: Tested up to 100 documents
- **Components**: Up to 1200 components (12 per doc × 100 docs)
- **Concurrent Users**: Single-user focused, multi-user support planned
- **Memory Usage**: Minimal impact on application performance

## API Versioning

### Current Versions
- **Document Generation API**: Unversioned (stable)
- **Graph API**: v1 (stable)
- **Selection Algorithm**: v1.0.0 (tracked in data)

### Future Versioning Strategy
- **Backward Compatibility**: Additive changes only for stable APIs
- **Deprecation Policy**: 6-month notice for breaking changes
- **Migration Support**: Automated migration tools for data format changes

---

*API documentation reflects the actual implementation in chirality-ai-app with GraphQL Neo4j integration*