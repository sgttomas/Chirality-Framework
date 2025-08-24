# Neo4j Semantic Integration - Implementation Details

*Technical implementation details for the metadata-only graph mirror system with component selection and relationship tracking*
**Status Last Updated**: August 24, 2025 at 11:19h
**Note**: Always ask user for current date/time when updating status - AI doesn't have real-time access
References to "CF14" are for the Chirality Framework version 14.

## Purpose

This document defines the technical implementation of the Neo4j integration that provides enhanced document discovery while maintaining files as the source of truth. The system selectively mirrors high-value document components to Neo4j for relationship analysis and search capabilities.

## Implementation Architecture

### Core Principles
- **Files as Source of Truth**: Complete DS/SP/X/M documents remain in `store/state.json`
- **Selective Mirroring**: Only components scoring above threshold are mirrored to Neo4j
- **Async Non-Blocking**: Graph updates never impact document generation performance
- **Idempotent Operations**: Safe to repeat mirror operations, handles additions/removals
- **Feature Flagged**: Complete system controlled via `FEATURE_GRAPH_ENABLED`

### Data Flow
```
Document Generation → File Write → Component Selection → Neo4j Mirror
      (Primary)         (SoT)        (Rule-based)       (Metadata)
```

## Neo4j Schema Design

### Node Types

#### Component Nodes  
```cypher
(:Component {
  id: String!,              // SHA1 hash: stableComponentId(docId, anchor)
  type: String!,            // First word of heading: "API", "Decision", etc.
  title: String!,           // Full section heading
  anchor: String,           // URL slug for section
  order: Int,               // Order within document
  score: Int                // Selection algorithm score
})
```

**Usage**: Represents selected high-value document sections. Contains metadata for discovery, not full content.

### Relationship Types

### Database Constraints
```cypher
-- Unique constraints for data integrity
CREATE CONSTRAINT comp_id IF NOT EXISTS FOR (c:Component) REQUIRE c.id IS UNIQUE;
```

### Selection Parameters
Configuration in `config/selection.json` with version tracking:
```json
{
  "selection_v": "1.0.0",           // Version for schema migration tracking
  "threshold": 3,                   // Minimum score for inclusion  
  "topKPerDoc": 12,                 // Max components per document
  "maxNodesPerRun": 50,             // Global cap per mirror operation
  "keywords": ["API", "Dependency", "Integration", "Decision", "Risk", "Metric"],
  "largeSectionCharLimit": 10000    // Size penalty threshold
}
```

**Version Tracking**: The `selection_v` is returned by `/api/v1/graph/validate` and surfaced in `/api/v1/graph/health` to enable detection of configuration changes and migration needs.

### Stable Component IDs
```typescript
export function stableComponentId(docId: string, anchor: string): string {
  return crypto.createHash("sha1").update(`${docId}#${anchor}`).digest("hex");
}
```

**Purpose**: Consistent component identification across runs
**Implementation**: SHA1 hash of `docId#anchor` ensures same component gets same ID
**Benefits**: Enables proper updates/removals, prevents duplicate components


### Stale Component Removal
**Problem**: When components are removed or changed, orphaned nodes remain in graph
**Solution**: Set difference approach - compare current selection with existing components
**Implementation**: Delete components not in `keepByDoc[docId]` list
**Safety**: Only delete components with no remaining CONTAINS relationships


## GraphQL Schema Implementation

### Neo4j GraphQL Integration
```typescript
import { Neo4jGraphQL } from "@neo4j/graphql";

  type Component {
    id: ID!
    type: String!
    title: String!
    anchor: String
    order: Int
    score: Int
    parent: Document! @relationship(type: "CONTAINS", direction: IN)
  }

```

### Custom Search Resolver
```typescript
// Component search using Cypher @directive
searchComponents(q: String!, limit: Int = 20): [Component!]!
  @cypher(
    statement: """
    MATCH (c:Component)
    WHERE toLower(c.title) CONTAINS toLower($q)
    RETURN c LIMIT $limit
    """
  )
```

## Authentication and Security

### Bearer Token Authentication
```typescript
export async function POST(req: NextRequest) {
  // Basic auth check
  const auth = req.headers.get("authorization") || "";
  const ok = auth === `Bearer ${process.env.GRAPHQL_BEARER_TOKEN}`;
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  // Process GraphQL query...
}
```

### Query Depth Protection
```typescript
// Simple depth guard to prevent abuse
if (typeof query === "string" && (query.match(/\{/g)?.length || 0) > 20) {
  return NextResponse.json({ error: "Query too deep" }, { status: 400 });
}
```

### CORS Configuration
```typescript
function cors() {
  return {
    "Access-Control-Allow-Origin": process.env.GRAPHQL_CORS_ORIGINS || "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
```

## Operational Aspects

### Health Monitoring
```typescript
// Health check endpoint: /api/v1/graph/health
export async function GET() {
  try {
    const driver = getDriver();
    const session = driver.session();
    
    await session.run('RETURN 1 as health');
    
    const docCount = await session.run('MATCH (d:Document) RETURN count(d) as count');
    const compCount = await session.run('MATCH (c:Component) RETURN count(c) as count');
    
    return NextResponse.json({
      status: 'healthy',
      neo4j: {
        connected: true,
        documents: docCount.records[0].get('count').toNumber(),
        components: compCount.records[0].get('count').toNumber()
      },
      graph_enabled: process.env.FEATURE_GRAPH_ENABLED === 'true'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
}
```

### Environment Validation
```typescript
// scripts/validate-graph-env.ts
async function validateEnvironment() {
  const required = ['NEO4J_URI', 'NEO4J_USERNAME', 'NEO4J_PASSWORD', 'GRAPHQL_BEARER_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing);
    process.exit(1);
  }
  
  const driver = getDriver();
  await ensureConstraints(driver);
  await driver.close();
  
  console.log('✅ Environment validation passed');
}
```

## Error Handling and Recovery

### Operational Policies

#### Retries and Backoff
- **Max attempts**: 5 with exponential backoff (200ms → 3.2s) and ±20% jitter
- **Idempotency key**: SHA1 hash of `docId|anchor|title|order` prevents duplicates on retry
- **Circuit breaker**: Opens after 10 consecutive failures; resets after 60s
- **Dead letter**: Failed operations logged with full context for manual review

#### Timeouts and Sizing  
- **Neo4j transaction timeout**: 10 seconds
- **Driver max pool size**: 50 connections (tune via `NEO4J_MAX_POOL_SIZE`)
- **Statement fetch size**: 1000 records per batch
- **Connection timeout**: 5 seconds with 3 retry attempts

#### Configuration Management
- **Selection config**: Versioned in `config/selection.json` with SHA256 checksum
- **Schema migration**: `selection_v` field enables automatic migration detection
- **Health reporting**: Config version and checksum surfaced in `/api/v1/graph/health`

#### Cleanup and Maintenance
- **Orphan cleanup**: Nightly job removes components for deleted documents
- **Dry run mode**: `DRY_RUN=true` for safe testing of cleanup operations
- **Constraint validation**: Weekly job verifies database constraint integrity

### Graceful Degradation
- **Graph Unavailable**: Core document generation continues normally
- **Mirror Failures**: Logged but don't interrupt user workflows  
- **Invalid Queries**: Return standardized error codes with `graph_enabled` status
- **Authentication Failures**: Clear error messages without exposing internals

### Recovery Strategies
- **Connection Lost**: Automatic reconnection on next mirror operation with backoff
- **Stale Data**: Set difference approach removes outdated components safely
- **Schema Changes**: Version tracking enables automatic migration detection
- **Constraint Violations**: Idempotent operations handle conflicts gracefully

## Testing Strategy

### Unit Tests
```typescript
describe('Component Selection', () => {
  it('selects high-scoring components', () => {
    const bundle = createTestBundle();
    const selection = selectForMirror(bundle, testConfig);
    expect(selection.components.length).toBeGreaterThan(0);
  });
  
  it('enforces caps and thresholds', () => {
    const largeBundle = createLargeTestBundle();
    const selection = selectForMirror(largeBundle, testConfig);
    expect(selection.components.length).toBeLessThanOrEqual(testConfig.topKPerDoc);
  });
});
```

### Integration Tests
```typescript
describe('Mirror Synchronization', () => {
  it('mirrors components to Neo4j', async () => {
    const payload = createTestPayload();
    await mirrorGraph(payload);
    
    const session = driver.session();
    const result = await session.run('MATCH (c:Component) RETURN count(c) as count');
    expect(result.records[0].get('count').toNumber()).toBe(payload.components.length);
  });
});
```

## Summary

The Neo4j semantic integration provides:

1. **Store of Output from the core framework implementation**: Components and cells with their semantic content
2. **Relationship Tracking**: Cross-references, lineage, and dependencies
3. **Stable Operations**: Idempotent sync with proper cleanup and cycle protection
4. **Security**: Bearer token auth, CORS, query depth protection
5. **Observability**: Health checks, validation endpoints, performance metrics
6. **Operational Tools**: Backfill scripts, environment validation, error recovery


---

*Implementation details reflect the actual metadata-only graph system deployed in chirality-framework*