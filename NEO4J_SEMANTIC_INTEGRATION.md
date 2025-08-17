# Neo4j Semantic Integration - Implementation Details

*Technical implementation details for the metadata-only graph mirror system with component selection and relationship tracking*

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

#### Document Nodes
```cypher
(:Document {
  id: String!,              // "DS:current", "SP:current", etc.
  kind: String!,            // "DS", "SP", "X", "M"  
  slug: String!,            // "current"
  title: String!,           // "Data Sheet", "Solution Template"
  updatedAt: String,        // ISO timestamp
  selection_v: String       // Version tracking: "1.0.0"
})
```

**Usage**: Represents document metadata without full content. Links to components and other documents.

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

#### CONTAINS: Document → Component
```cypher
(doc:Document)-[:CONTAINS]->(comp:Component)
```
**Purpose**: Links documents to their selected components
**Cardinality**: One document can contain multiple components

#### REFERENCES: Document → Document  
```cypher
(source:Document)-[:REFERENCES]->(target:Document)
```
**Purpose**: Tracks cross-document references found in content
**Cardinality**: Many-to-many based on extracted document references

#### DERIVED_FROM: Document → Document
```cypher
(derived:Document)-[:DERIVED_FROM]->(source:Document)
```
**Purpose**: Tracks document lineage (SP derives from DS, X derives from DS, etc.)
**Cardinality**: Documents can derive from multiple sources
**Cycle Protection**: Prevents circular dependencies

### Database Constraints
```cypher
-- Unique constraints for data integrity
CREATE CONSTRAINT doc_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT comp_id IF NOT EXISTS FOR (c:Component) REQUIRE c.id IS UNIQUE;
```

## Component Selection Algorithm

### Scoring System
```typescript
function scoreSection(doc: Doc, section: Section, cfg: SelCfg): number {
  let score = 0;
  
  // Rule 1: Cross-references (+3 points)
  const refs = extractDocRefs(section.content).filter(r => r !== doc.id);
  if (refs.length >= 2) score += 3;
  
  // Rule 2: High-value keywords (+2 points)  
  const kwRe = new RegExp(`^(${cfg.keywords.join("|")})`, "i");
  if (kwRe.test(section.heading)) score += 2;
  
  // Rule 3: Size penalty (-2 points)
  if (section.content.length > cfg.largeSectionCharLimit && refs.length < 3) {
    score -= 2;
  }
  
  return score;
}
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

### Reference Extraction
```typescript
export function extractDocRefs(text: string): string[] {
  const ids = new Set<string>();
  
  // Wiki-style links: [[DS:payments-auth]] or [[sp-deploy-runbook]]
  const wiki = /\[\[([A-Za-z]{1,2}:[\w-]+|[a-z0-9-]+)\]\]/g;
  
  // Markdown links: (…/docs/slug) or (slug)
  const md = /\]\((?:\/docs\/)?([a-z0-9-]+)\)/g;
  
  // Inline references: DS:slug or SP:slug
  const inline = /\b([A-Za-z]{1,2}:[\w-]+)\b/g;
  
  for (const m of text.matchAll(wiki)) ids.add(m[1]);
  for (const m of text.matchAll(md)) ids.add(m[1]);
  for (const m of text.matchAll(inline)) ids.add(m[1]);
  
  return [...ids];
}
```

### Stable Component IDs
```typescript
export function stableComponentId(docId: string, anchor: string): string {
  return crypto.createHash("sha1").update(`${docId}#${anchor}`).digest("hex");
}
```

**Purpose**: Consistent component identification across runs
**Implementation**: SHA1 hash of `docId#anchor` ensures same component gets same ID
**Benefits**: Enables proper updates/removals, prevents duplicate components

## Mirror Synchronization

### Idempotent Upsert Operations
```typescript
export async function mirrorGraph(payload: MirrorPayload) {
  const session = driver.session();
  
  await session.executeWrite(async tx => {
    // 1. Upsert documents and components
    await tx.run(`
      UNWIND $docs AS d
        MERGE (doc:Document {id:d.id})
        SET doc += d.props, doc.selection_v = $selection_v;
      
      UNWIND $components AS c
        MERGE (k:Component {id:c.id})
        SET k += c.props;
      
      UNWIND $components AS c
        MATCH (d:Document {id:c.docId}), (k:Component {id:c.id})
        MERGE (d)-[:CONTAINS]->(k);
    `, { docs: payload.docs, components: payload.components, selection_v: payload.selection_v });

    // 2. Remove stale components using set difference
    await tx.run(`
      UNWIND keys($keepByDoc) AS did
      WITH did, $keepByDoc[did] AS keep
      MATCH (d:Document {id:did})-[r:CONTAINS]->(k:Component)
      WHERE NOT k.id IN keep
      DELETE r
      WITH k
      WHERE size( (k)<-[:CONTAINS]-() ) = 0
      DETACH DELETE k
    `, { keepByDoc: payload.keepByDoc });

    // 3. Update document references
    await tx.run(`
      UNWIND $refs AS r
      MATCH (s:Document {id:r.src})
      MERGE (t:Document {id:r.dst})
      MERGE (s)-[:REFERENCES]->(t)
    `, { refs: payload.references });

    // 4. Update lineage with cycle protection
    await tx.run(`
      UNWIND $derived AS e
      MATCH (s:Document {id:e.src}), (t:Document {id:e.dst})
      WHERE NOT (t)-[:DERIVED_FROM*1..]->(s)
      MERGE (s)-[:DERIVED_FROM]->(t)
    `, { derived: payload.derived });
  });
}
```

### Stale Component Removal
**Problem**: When components are removed from documents, orphaned nodes remain in graph
**Solution**: Set difference approach - compare current selection with existing components
**Implementation**: Delete components not in `keepByDoc[docId]` list
**Safety**: Only delete components with no remaining CONTAINS relationships

### Cycle Protection
**Problem**: Document lineage could create circular dependencies  
**Solution**: Check for existing path before creating DERIVED_FROM relationship
**Implementation**: `WHERE NOT (t)-[:DERIVED_FROM*1..]->(s)`
**Benefits**: Prevents infinite loops during graph traversal

## Integration Points

### Single Call Site Pattern
```typescript
// Document generation endpoints call this after successful file write
export async function mirrorAfterWrite(finals: Finals) {
  if (process.env.FEATURE_GRAPH_ENABLED !== "true") return;
  
  const bundle = finalsToBundle(finals);
  const sel = selectForMirror(bundle, cfg);
  
  // Non-blocking async execution
  queueMicrotask(() => 
    mirrorGraph({ selection_v: cfg.selection_v, ...sel })
      .catch(err => console.warn("mirror deferred failed", err))
  );
}
```

**Key Points**:
- Single trigger point prevents duplicate mirror operations
- `queueMicrotask()` ensures file writes are never blocked
- Error handling logs failures but doesn't impact core functionality
- Feature flag allows complete system disable

### Data Format Conversion
```typescript
function finalsToBundle(finals: Finals): Bundle {
  const bundle: Bundle = {};
  
  if (finals.DS) {
    bundle.DS = {
      id: "DS:current",
      kind: "DS",
      slug: "current", 
      title: "Data Sheet",
      sections: [],
      raw: JSON.stringify(finals.DS.text, null, 2)
    };
  }
  
  // Similar for SP, X, M...
  return bundle;
}
```

**Purpose**: Convert from internal Finals format to selector Bundle format
**Approach**: JSON stringify for content analysis, stable IDs for consistency
**Benefits**: Isolates graph logic from core document structures

## GraphQL Schema Implementation

### Neo4j GraphQL Integration
```typescript
import { Neo4jGraphQL } from "@neo4j/graphql";

const typeDefs = /* GraphQL */ `
  type Document {
    id: ID!
    kind: String!
    slug: String!
    title: String!
    updatedAt: String
    components: [Component!]! @relationship(type: "CONTAINS", direction: OUT)
    references: [Document!]! @relationship(type: "REFERENCES", direction: OUT)
    derivedFrom: [Document!]! @relationship(type: "DERIVED_FROM", direction: OUT)
  }

  type Component {
    id: ID!
    type: String!
    title: String!
    anchor: String
    order: Int
    score: Int
    parent: Document! @relationship(type: "CONTAINS", direction: IN)
  }

  type Query {
    document(where: DocumentWhereOne!): Document
    documents(where: DocumentWhere): [Document!]!
    searchComponents(q: String!, limit: Int = 20): [Component!]!
      @cypher(
        statement: """
        MATCH (c:Component)
        WHERE toLower(c.title) CONTAINS toLower($q)
        RETURN c LIMIT $limit
        """
      )
  }
`;
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

**Benefits**:
- Direct Cypher execution for performance
- Case-insensitive search across component titles
- Configurable result limits
- Returns components with parent document context

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

### Performance Metrics
```typescript
// Emitted during mirror operations
{
  "at": "graph_mirror",
  "result": "success|failure", 
  "docs": 4,
  "comps": 8,
  "refs": 3,
  "derived": 2,
  "ms": 1250,
  "selection_v": "1.0.0"
}
```

### Validation Endpoint
```typescript
// Test selection logic without writing: /api/v1/graph/validate
export async function POST(req: NextRequest) {
  const { bundle } = await req.json();
  const sel = selectForMirror(bundle, cfg);
  return NextResponse.json({
    docs: sel.docs.map(d => d.id),
    keepByDoc: sel.keepByDoc,
    components: sel.components.map(c => ({ id: c.id, docId: c.docId }))
  });
}
```

## Backfill and Migration

### Backfill Script
```typescript
// scripts/backfill-graph-from-files.ts
async function backfillFromFiles() {
  const driver = getDriver();
  await ensureConstraints(driver);

  const files = await fs.readdir(ROOT);
  const docFiles = files.filter(f => f.endsWith(".md"));
  
  for (const f of docFiles) {
    const kind = determineKind(f);
    const doc = await loadDoc(path.join(ROOT, f), kind);
    const bundle = { [kind]: doc };
    const sel = selectForMirror(bundle, cfg);
    const payload = { selection_v: cfg.selection_v, ...sel };

    if (!DRY_RUN) {
      await mirrorGraph(payload);
    }
  }
}
```

**Features**:
- Processes existing markdown files
- Supports dry-run mode for testing
- Batch processing with progress tracking
- Timestamp filtering for incremental updates

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

1. **Selective Mirroring**: Only high-value components based on rule-based scoring
2. **Relationship Tracking**: Cross-references, lineage, and dependencies
3. **Stable Operations**: Idempotent sync with proper cleanup and cycle protection
4. **Security**: Bearer token auth, CORS, query depth protection
5. **Observability**: Health checks, validation endpoints, performance metrics
6. **Operational Tools**: Backfill scripts, environment validation, error recovery

The system enhances document discoverability while maintaining the simplicity and reliability of file-based storage as the primary source of truth.

---

*Implementation details reflect the actual metadata-only graph mirror system deployed in chirality-ai-app*