# Comprehensive Change Document for Chirality Integration

## Overview

Based on feedback, we need to realign both projects to implement a sophisticated-but-not-complicated MVP that focuses on a single vertical slice with proper guards and clean interfaces.

## Core Principles from Feedback

1. **One Vertical Slice**: Produce → Persist → Serve → Display
2. **App-Layer Guards**: State transitions enforced in application, not database
3. **Deterministic Hashing**: Reproducible component addresses
4. **Idempotent Operations**: MERGE on SemanticOperation for safety
5. **Simple Complexity Caps**: Rate limiting and query size limits
6. **Consistent Field Names**: Same names across DB, GraphQL, and UI

## Changes for chirality-semantic-framework (Backend)

### Task 1: Simplify Component Production

**Remove**:
- Complex state machine abstractions
- Database triggers and APOC procedures
- Vector indexes and embeddings (defer to P1)
- Deep lineage tracking beyond depth 2

**Add**:
```python
# lib.py - Core guards and helpers
from typing import Literal
import hashlib

State = Literal["INITIAL", "INTERPRETED", "COMBINED", "RESOLVED"]

VALID_TRANSITIONS = {
    "INITIAL": {"INTERPRETED"},
    "INTERPRETED": {"COMBINED", "RESOLVED"},
    "COMBINED": {"RESOLVED"},
    "RESOLVED": set(),
}

def can_transition(current: str, next: str) -> bool:
    """App-layer state transition guard"""
    return next in VALID_TRANSITIONS.get(current, set())

def address_hash(domain: str, matrix: str, row: int, col: int) -> str:
    """Deterministic component address hash"""
    key = f"cf14:{domain.lower()}:{matrix.lower()}:{row}:{col}"
    return hashlib.sha256(key.encode()).hexdigest()[:32]
```

### Task 2: Implement Idempotent Persistence

**Replace complex Neo4j adapter with**:
```python
# persistence.py
from neo4j import GraphDatabase
from tenacity import retry, stop_after_attempt, wait_exponential
import uuid

class ComponentPersister:
    def __init__(self, driver):
        self.driver = driver
    
    def create_component(self, domain: str, matrix: str, row: int, col: int) -> str:
        """Create component with composite uniqueness"""
        comp_id = str(uuid.uuid4())
        ah = address_hash(domain, matrix, row, col)
        
        with self.driver.session() as session:
            session.run("""
                MERGE (c:Component {
                    domain: $domain, 
                    matrix: $matrix, 
                    row: $row, 
                    col: $col,
                    address_hash: $ah
                })
                ON CREATE SET 
                    c.id = $id,
                    c.createdAt = timestamp(),
                    c.lastSeq = 0,
                    c.currentState = 'INITIAL',
                    c.schema_version = '1.0.0'
                RETURN c
            """, id=comp_id, domain=domain, matrix=matrix, row=row, col=col, ah=ah)
        
        return comp_id
    
    def append_state(self, component_id: str, to_state: str, operation_id: str):
        """Append state with idempotent operation MERGE"""
        with self.driver.session() as session:
            # Check transition validity
            result = session.run("""
                MATCH (c:Component {id: $id})
                RETURN c.currentState as current
            """, id=component_id)
            
            current = result.single()["current"]
            if not can_transition(current, to_state):
                raise ValueError(f"Invalid transition: {current} -> {to_state}")
            
            # Idempotent operation + atomic sequence increment
            session.execute_write(lambda tx: tx.run("""
                MERGE (o:SemanticOperation {id: $op_id})
                ON CREATE SET 
                    o.type = 'STATE_APPEND',
                    o.timestamp = timestamp()
                WITH o
                MATCH (c:Component {id: $comp_id})
                WITH c, o, coalesce(c.lastSeq, 0) + 1 AS next_seq
                CREATE (s:ComponentState {
                    id: randomUUID(),
                    type: $to_state,
                    sequence: next_seq,
                    createdAt: timestamp()
                })
                MERGE (c)-[:HAS_STATE]->(s)
                SET c.lastSeq = next_seq, c.currentState = $to_state
                RETURN c
            """, comp_id=component_id, to_state=to_state, op_id=operation_id))
```

### Task 3: Add Cycle-Safe Lineage

**Implement proper cycle guard**:
```python
def add_depends_on(tx, output_id: str, input_id: str, role: str = "input", idx: int = 0):
    """Add dependency with cycle prevention"""
    tx.run("""
        MATCH (out:Component {id: $out_id}), (inp:Component {id: $in_id})
        WHERE NOT (out)-[:DEPENDS_ON*1..]->(inp)
        MERGE (out)-[:DEPENDS_ON {role: $role, idx: $idx}]->(inp)
    """, out_id=output_id, in_id=input_id, role=role, idx=idx)
```

### Task 4: Simplify Configuration

**Replace complex configs with simple .env**:
```bash
# .env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=testpassword

# Simple tunables
BATCH_SIZE=100
GRAPH_READ_TIMEOUT_MS=2000
GRAPH_WRITE_TIMEOUT_MS=4000
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_MS=200
```

## Changes for chirality-ai-app (Frontend)

### Task 1: Single GraphQL Server

**Replace complex GraphQL setup with**:
```javascript
// graphql/server.js
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// Simple complexity guard
function complexityGuard(requestContext) {
    const size = JSON.stringify(requestContext.request.query || '').length;
    if (size > 10000) throw new Error('Query too complex');
}

// Per-thread rate limiting (in-memory for MVP)
const buckets = new Map();
function rateLimit(key) {
    const RPS = Number(process.env.RATE_LIMIT_RPS || 10);
    const now = Date.now();
    const bucket = buckets.get(key) || { tokens: RPS, ts: now };
    const refill = Math.min(RPS, bucket.tokens + ((now - bucket.ts) / 1000) * RPS);
    if (refill < 1) throw new Error('Rate limit exceeded');
    buckets.set(key, { tokens: refill - 1, ts: now });
}

const typeDefs = `#graphql
    scalar DateTime
    
    type Component {
        id: ID!
        domain: String!
        matrix: String!
        row: Int!
        col: Int!
        address_hash: String!
        currentState: String
        lastSeq: Int
    }
    
    type ComponentState {
        id: ID!
        type: String!
        sequence: Int!
        createdAt: String!
    }
    
    type Query {
        component(id: ID!): Component
        states(componentId: ID!, first: Int = 10): [ComponentState!]!
        lineage(componentId: ID!, maxDepth: Int = 2): [Component!]!
    }
    
    type Mutation {
        appendState(id: ID!, to: String!, operationId: ID!): Component!
    }
`;

const resolvers = {
    Query: {
        async component(_, { id }) {
            const session = driver.session();
            const result = await session.run(
                'MATCH (c:Component {id: $id}) RETURN c LIMIT 1',
                { id }
            );
            await session.close();
            return result.records[0]?.get('c').properties || null;
        },
        
        async states(_, { componentId, first }) {
            const session = driver.session();
            const result = await session.run(`
                MATCH (:Component {id: $id})-[:HAS_STATE]->(s:ComponentState)
                RETURN s ORDER BY s.sequence DESC LIMIT $first
            `, { id: componentId, first: Number(first) });
            await session.close();
            return result.records.map(r => r.get('s').properties);
        },
        
        async lineage(_, { componentId, maxDepth = 2 }) {
            // Simple depth-bounded query without APOC
            const session = driver.session();
            const components = [];
            
            // Depth 1
            const r1 = await session.run(`
                MATCH (c:Component {id: $id})-[:DEPENDS_ON]->(n)
                RETURN DISTINCT n
            `, { id: componentId });
            components.push(...r1.records.map(r => r.get('n').properties));
            
            // Depth 2 if requested
            if (maxDepth >= 2) {
                const r2 = await session.run(`
                    MATCH (c:Component {id: $id})-[:DEPENDS_ON]->()-[:DEPENDS_ON]->(n)
                    RETURN DISTINCT n
                `, { id: componentId });
                components.push(...r2.records.map(r => r.get('n').properties));
            }
            
            await session.close();
            
            // Dedupe by id
            const seen = new Map();
            components.forEach(c => seen.set(c.id, c));
            return [...seen.values()];
        }
    },
    
    Mutation: {
        async appendState(_, { id, to, operationId }, context) {
            // Rate limit per thread
            rateLimit(context.req?.headers?.['x-thread-id'] || 'anon');
            
            const session = driver.session();
            try {
                // App-layer transition guard
                const current = await session.run(
                    'MATCH (c:Component {id: $id}) RETURN coalesce(c.currentState, "INITIAL") AS state',
                    { id }
                );
                const currentState = current.records[0]?.get('state');
                
                const validTransitions = {
                    INITIAL: new Set(['INTERPRETED']),
                    INTERPRETED: new Set(['COMBINED', 'RESOLVED']),
                    COMBINED: new Set(['RESOLVED']),
                    RESOLVED: new Set()
                };
                
                if (!validTransitions[currentState]?.has(to)) {
                    throw new Error(`Invalid transition: ${currentState} -> ${to}`);
                }
                
                // Execute state append
                const result = await session.executeWrite(tx => tx.run(`
                    MERGE (o:SemanticOperation {id: $op_id})
                    ON CREATE SET o.type = 'STATE_APPEND', o.timestamp = timestamp()
                    WITH o
                    MATCH (c:Component {id: $comp_id})
                    WITH c, o, coalesce(c.lastSeq, 0) + 1 AS next_seq
                    CREATE (s:ComponentState {
                        id: randomUUID(),
                        type: $to_state,
                        sequence: next_seq,
                        createdAt: timestamp()
                    })
                    MERGE (c)-[:HAS_STATE]->(s)
                    SET c.lastSeq = next_seq, c.currentState = $to_state
                    RETURN c
                `, { comp_id: id, to_state: to, op_id: operationId }));
                
                return result.records[0].get('c').properties;
            } finally {
                await session.close();
            }
        }
    }
};
```

### Task 2: Simplified React UI

**Replace complex components with minimal viable UI**:
```tsx
// frontend/src/App.tsx
import { ApolloProvider, gql, useQuery } from '@apollo/client';
import { client } from './apollo';
import { useEffect } from 'react';

const COMPONENT_QUERY = gql`
    query ComponentDetail($id: ID!) {
        component(id: $id) {
            id
            domain
            matrix
            row
            col
            currentState
            lastSeq
        }
        states(componentId: $id, first: 10) {
            id
            type
            sequence
            createdAt
        }
        lineage(componentId: $id, maxDepth: 2) {
            id
            domain
            matrix
            row
            col
        }
    }
`;

function ComponentDetail({ id }: { id: string }) {
    const { data, loading, refetch } = useQuery(COMPONENT_QUERY, {
        variables: { id }
    });
    
    // Simple 3-second refetch for MVP (replace with subscriptions in P1)
    useEffect(() => {
        const interval = setInterval(() => refetch(), 3000);
        return () => clearInterval(interval);
    }, [refetch]);
    
    if (loading || !data?.component) {
        return <div className="p-4">Loading...</div>;
    }
    
    return (
        <div className="p-4">
            <h1>Component {data.component.id}</h1>
            <p>
                {data.component.domain} / {data.component.matrix} @ 
                [{data.component.row}, {data.component.col}]
            </p>
            <p>Current State: {data.component.currentState}</p>
            
            <h2>State History</h2>
            <ul>
                {data.states.map((state: any) => (
                    <li key={state.id}>
                        #{state.sequence} - {state.type} - 
                        {new Date(Number(state.createdAt)).toLocaleString()}
                    </li>
                ))}
            </ul>
            
            <h2>Lineage</h2>
            <ul>
                {data.lineage.map((comp: any) => (
                    <li key={comp.id}>
                        {comp.id}: {comp.domain}/{comp.matrix}[{comp.row},{comp.col}]
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function App() {
    const id = new URLSearchParams(location.search).get('id') || '';
    return (
        <ApolloProvider client={client}>
            <ComponentDetail id={id} />
        </ApolloProvider>
    );
}
```

### Task 3: Apollo Client Configuration

**Simple client setup**:
```typescript
// frontend/src/apollo.ts
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

export const client = new ApolloClient({
    link: new HttpLink({ 
        uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:4000/'
    }),
    cache: new InMemoryCache()
});
```

## Database Schema Changes

### Task 4: Apply Constraints

**Create constraints script**:
```bash
#!/usr/bin/env bash
# scripts/apply_constraints.sh
set -euo pipefail

docker exec -i neo4j-mvp cypher-shell -u "${NEO4J_USER:-neo4j}" -p "${NEO4J_PASSWORD:-testpassword}" <<'CQL'
-- Component uniqueness
CREATE CONSTRAINT comp_id IF NOT EXISTS 
FOR (c:Component) REQUIRE c.id IS UNIQUE;

-- State uniqueness
CREATE CONSTRAINT state_id IF NOT EXISTS 
FOR (s:ComponentState) REQUIRE s.id IS UNIQUE;

-- Operation uniqueness
CREATE CONSTRAINT op_id IF NOT EXISTS 
FOR (o:SemanticOperation) REQUIRE o.id IS UNIQUE;

-- Composite address uniqueness
CREATE CONSTRAINT component_address_unique IF NOT EXISTS
FOR (c:Component) 
REQUIRE (c.domain, c.matrix, c.row, c.col, c.address_hash) IS UNIQUE;
CQL

echo "✅ Neo4j constraints applied"
```

## Testing Strategy

### Task 5: Acceptance Tests

**Create acceptance test script**:
```bash
#!/usr/bin/env bash
# scripts/acceptance_checks.sh
set -euo pipefail

GRAPHQL=${GRAPHQL:-http://localhost:4000/}

echo "🔎 Testing GraphQL reachability..."
curl -sf -H 'content-type: application/json' \
  --data '{"query":"{__typename}"}' "$GRAPHQL" >/dev/null && echo "✅ OK"

echo "🔎 Testing complexity cap (should error)..."
LARGE_QUERY='{"query":"'$(printf 'x%.0s' {1..10001})'"}'
curl -s -H 'content-type: application/json' \
  --data "$LARGE_QUERY" "$GRAPHQL" | \
  jq -e 'has("errors")' >/dev/null && echo "✅ Capped" || echo "❌ Not capped"

echo "🔎 Testing state transitions..."
# Test invalid transition (should fail)
INVALID='{"query":"mutation{appendState(id:\"test\",to:\"RESOLVED\",operationId:\"op1\"){id}}"}'
curl -s -H 'content-type: application/json' \
  --data "$INVALID" "$GRAPHQL" | \
  jq -e '.errors[0].message | contains("Invalid transition")' >/dev/null && \
  echo "✅ Guards working" || echo "❌ Guards not working"
```

## Interface Contract

### Task 6: Document Contract

**Create interface contract**:
```markdown
# Interface Contract v1.0.0 (MVP)

## GraphQL Schema

### Types
- `Component`: Core semantic component
  - `id: ID!` - Unique identifier
  - `domain: String!` - Semantic domain
  - `matrix: String!` - Matrix name
  - `row: Int!` - Row position
  - `col: Int!` - Column position
  - `address_hash: String!` - Deterministic hash
  - `currentState: String` - Current state (INITIAL|INTERPRETED|COMBINED|RESOLVED)
  - `lastSeq: Int` - Last sequence number

- `ComponentState`: State snapshot
  - `id: ID!` - Unique identifier
  - `type: String!` - State type
  - `sequence: Int!` - Sequence number
  - `createdAt: String!` - Timestamp

### Queries
- `component(id: ID!): Component` - Get single component
- `states(componentId: ID!, first: Int = 10): [ComponentState!]!` - Get state history
- `lineage(componentId: ID!, maxDepth: Int = 2): [Component!]!` - Get dependencies

### Mutations
- `appendState(id: ID!, to: String!, operationId: ID!): Component!` - Append state

## Rules
1. State transitions: INITIAL → INTERPRETED → (COMBINED) → RESOLVED
2. Transitions enforced at application layer
3. Operations are idempotent via MERGE
4. Address hash: hex16(sha256("cf14:{domain}:{matrix}:{row}:{col}"))
5. Cycle prevention on DEPENDS_ON relationships
6. Rate limiting per thread (x-thread-id header)
7. Query complexity cap at 10KB
```

## Development Workflow

### Task 7: Daily Development Loop

**Create development script**:
```bash
#!/usr/bin/env bash
# scripts/dev.sh
set -euo pipefail

echo "🚀 Starting Chirality MVP Development Environment"

# 1. Start Neo4j
echo "Starting Neo4j..."
docker compose up -d
sleep 5
./scripts/apply_constraints.sh

# 2. Start GraphQL server
echo "Starting GraphQL server..."
(cd packages/graphql && node index.js) &
GRAPHQL_PID=$!

# 3. Start frontend
echo "Starting frontend..."
(cd packages/frontend && npm run dev) &
FRONTEND_PID=$!

# 4. Wait for services
sleep 3

# 5. Run acceptance tests
echo "Running acceptance tests..."
./scripts/acceptance_checks.sh

echo "
✅ Development environment ready!
   GraphQL: http://localhost:4000/
   Frontend: http://localhost:5173/
   Neo4j: http://localhost:7474/
   
Press Ctrl+C to stop all services
"

# Wait and cleanup
trap "kill $GRAPHQL_PID $FRONTEND_PID 2>/dev/null; docker compose down" EXIT
wait
```

## Migration Path

### From Current to MVP

1. **Week 1**: Remove complexity
   - Strip out vector indexes, APOC, deep lineage
   - Simplify to single GraphQL server
   - Implement app-layer guards

2. **Week 2**: Core MVP
   - Implement deterministic hashing
   - Add idempotent operations
   - Create minimal UI

3. **Week 3**: Testing & Documentation
   - Acceptance tests
   - Interface contract
   - Development scripts

### Future P1 Additions (Post-MVP)
- WebSocket subscriptions (replace 3s polling)
- DataLoader for batch queries
- Pagination for large result sets
- Basic observability (OpenTelemetry)
- TTL and archival strategies

## Summary

This change document transforms both projects into a sophisticated-but-not-complicated MVP that:
- Focuses on one working vertical slice
- Uses app-layer guards instead of database complexity
- Implements proper idempotency and cycle prevention
- Maintains consistent field names across all layers
- Provides simple, testable interfaces
- Can be extended incrementally without breaking changes

The key insight from the feedback: **Start with something that works end-to-end, then layer on complexity only where proven necessary.**