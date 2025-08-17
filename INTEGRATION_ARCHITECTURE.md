# Integration Architecture - Graph Mirror with Selected Components

*System architecture for integrating document generation with metadata-only graph mirroring and read-only GraphQL access*

## Overview

This document defines the architecture for the hybrid approach where files remain the source of truth for complete document bodies, while Neo4j serves as a metadata-rich mirror for selected components with relationship tracking. The integration provides enhanced discoverability and relationship analysis without duplicating full content.

## Architecture Principles

### Files as Source of Truth
- **Complete Document Bodies**: Full DS/SP/X/M documents stored in `store/state.json`
- **Atomic Operations**: File writes use atomic operations ensuring consistency
- **Primary Workflows**: All document generation, editing, and core functionality operates on files
- **Backup and Recovery**: Files provide simple, portable backup and migration
- **Zero Dependencies**: Core functionality requires no external services

### Graph as Metadata Mirror
- **Selected Components Only**: Rule-based algorithm selects high-value sections for mirroring
- **Relationship Mapping**: Cross-references, document lineage, and dependencies tracked
- **Enhanced Discovery**: Search and exploration capabilities beyond file-based access
- **Read-Only Access**: Graph provides query interface, never modifies source documents
- **Async Non-Blocking**: Graph updates happen after file writes, never blocking core operations

## System Components

### Document Generation Layer
```
┌─────────────────────────┐
│  Two-Pass Generation    │
│                         │
│  DS → SP → X → M        │ ← Pass 1: Sequential
│  ↓                      │
│  DS' → SP' → X' → M'    │ ← Pass 2: Cross-referential 
│  ↓                      │
│  X'' (final resolution) │ ← Final: Integrated solution
└─────────────────────────┘
           ↓
     File Write to
   store/state.json
           ↓
    mirrorAfterWrite()
           ↓ (async, non-blocking)
┌─────────────────────────┐
│  Component Selection    │
│                         │
│  • Score sections       │
│  • Apply thresholds     │
│  • Enforce caps         │
│  • Generate stable IDs  │
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│  Neo4j Mirror Sync     │
│                         │
│  • Idempotent upserts   │
│  • Stale cleanup        │
│  • Relationship updates │
│  • Constraint handling  │
└─────────────────────────┘
```

### Integration Flow

#### 1. Document Generation (Source of Truth)
```typescript
// Main generation endpoint: /api/core/orchestrate
async function twoPassGeneration() {
  // Pass 1: Sequential generation
  const pass1 = await generateSequentially(problem);
  
  // Pass 2: Cross-referential refinement  
  const pass2 = await refineWithCrossRefs(pass1);
  
  // Final resolution
  const finalX = await resolveWithAll(pass2);
  
  // Atomic file write (source of truth)
  writeState({ finals: pass2 });
  
  // Async graph mirror (non-blocking)
  mirrorAfterWrite(pass2);
  
  return { pass1, pass2, logs };
}
```

#### 2. Component Selection Algorithm
```typescript
// Rule-based selection: lib/graph/selector.ts
export function selectForMirror(bundle: Bundle, cfg: SelCfg) {
  const out = {
    docs: [],
    components: [],
    references: [],
    derived: [],
    keepByDoc: {}
  };

  for (const doc of bundle.docs) {
    // Parse document sections
    const sections = parseSections(doc.raw);
    
    // Score each section
    const scored = sections
      .map(s => ({ s, score: scoreSection(doc, s, cfg) }))
      .filter(x => x.score >= cfg.threshold)  // Threshold: 3
      .sort((a,b) => b.score - a.score)
      .slice(0, cfg.topKPerDoc);              // Cap: 12 per doc
    
    // Generate stable component IDs
    for (const { s, score } of scored) {
      const id = stableComponentId(doc.id, s.anchor);
      out.components.push({
        id, 
        props: { type: s.heading.split(/\s+/)[0], title: s.heading, anchor: s.anchor, order: s.order, score },
        docId: doc.id
      });
    }
  }
  
  // Enforce global cap: 50 total nodes
  if (out.docs.length + out.components.length > cfg.maxNodesPerRun) {
    out.components.splice(cfg.maxNodesPerRun - out.docs.length);
  }
  
  return out;
}

// Scoring algorithm
function scoreSection(doc: Doc, section: Section, cfg: SelCfg): number {
  let score = 0;
  
  // Cross-references: +3 points for 2+ refs to other documents
  const refs = extractDocRefs(section.content).filter(r => r !== doc.id);
  if (refs.length >= 2) score += 3;
  
  // Keywords: +2 points for headings starting with high-value indicators
  const kwRe = new RegExp(`^(${cfg.keywords.join("|")})`, "i");
  if (kwRe.test(section.heading)) score += 2;
  
  // Size penalty: -2 points for large sections with few references
  if (section.content.length > cfg.largeSectionCharLimit && refs.length < 3) score -= 2;
  
  return score;
}
```

#### 3. Mirror Synchronization
```typescript
// Idempotent mirror operations: lib/graph/mirror.ts
export async function mirrorGraph(payload: MirrorPayload) {
  if (process.env.FEATURE_GRAPH_ENABLED !== "true") return;
  
  const session = driver.session();
  
  await session.executeWrite(async tx => {
    // Upsert documents and components
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

    // Remove stale components using set difference
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

    // Update document references
    await tx.run(`
      UNWIND $refs AS r
      MATCH (s:Document {id:r.src})
      MERGE (t:Document {id:r.dst})
      MERGE (s)-[:REFERENCES]->(t)
    `, { refs: payload.references });

    // Update lineage with cycle protection
    await tx.run(`
      UNWIND $derived AS e
      MATCH (s:Document {id:e.src}), (t:Document {id:e.dst})
      WHERE NOT (t)-[:DERIVED_FROM*1..]->(s)
      MERGE (s)-[:DERIVED_FROM]->(t)
    `, { derived: payload.derived });
  });
}
```

### GraphQL API Layer

#### Schema Definition
```graphql
type Document {
  id: ID!
  kind: String!           # DS, SP, X, M
  slug: String!
  title: String!
  updatedAt: String
  components: [Component!]! @relationship(type: "CONTAINS", direction: OUT)
  references: [Document!]! @relationship(type: "REFERENCES", direction: OUT)
  derivedFrom: [Document!]! @relationship(type: "DERIVED_FROM", direction: OUT)
}

type Component {
  id: ID!
  type: String!           # Section type (API, Decision, etc.)
  title: String!          # Section heading
  anchor: String          # URL anchor
  order: Int              # Order within document  
  score: Int              # Selection score
  parent: Document! @relationship(type: "CONTAINS", direction: IN)
}

type Query {
  document(where: DocumentWhereOne!): Document
  documents(where: DocumentWhere): [Document!]!
  searchComponents(q: String!, limit: Int = 20): [Component!]!
}
```

#### API Endpoints
```typescript
// GraphQL endpoint: /api/v1/graph/graphql
export async function POST(req: NextRequest) {
  if (process.env.FEATURE_GRAPH_ENABLED !== "true") {
    return NextResponse.json({ error: "Graph disabled" }, { status: 503 });
  }
  
  // Bearer token authentication
  const auth = req.headers.get("authorization") || "";
  const ok = auth === `Bearer ${process.env.GRAPHQL_BEARER_TOKEN}`;
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, variables, operationName } = await req.json();
  const schema = await getSchema();

  // Simple depth guard
  if (typeof query === "string" && (query.match(/\{/g)?.length || 0) > 20) {
    return NextResponse.json({ error: "Query too deep" }, { status: 400 });
  }

  const result = await graphql({ schema, source: query, variableValues: variables, operationName });
  return NextResponse.json(result);
}

// Health monitoring: /api/v1/graph/health
export async function GET() {
  const driver = getDriver();
  const session = driver.session();
  
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
}

// Validation endpoint: /api/v1/graph/validate
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

## Configuration and Deployment

### Environment Configuration
```bash
# Core configuration
FEATURE_GRAPH_ENABLED=true
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# API security
GRAPHQL_BEARER_TOKEN=your-secure-token
GRAPHQL_CORS_ORIGINS=http://localhost:3000

# Selection parameters in config/selection.json
{
  "selection_v": "1.0.0",
  "threshold": 3,                    # Minimum score for inclusion
  "topKPerDoc": 12,                  # Max components per document
  "maxNodesPerRun": 50,              # Global cap per mirror operation
  "keywords": ["API", "Dependency", "Integration", "Decision", "Risk", "Metric"],
  "largeSectionCharLimit": 10000     # Size penalty threshold
}
```

### Database Setup
```bash
# Start Neo4j
docker compose -f docker-compose.neo4j.yml up -d

# Initialize constraints
npm run tsx scripts/init-graph-constraints.ts

# Validate environment
npm run tsx scripts/validate-graph-env.ts

# Backfill existing documents
npm run tsx scripts/backfill-graph-from-files.ts --root=content
```

## Integration Points

### Single Call Site Integration
```typescript
// In document generation endpoints
async function saveAndMirror(finals: Finals) {
  // 1. Save to files (source of truth)
  writeState({ finals });
  
  // 2. Mirror to graph (async, non-blocking)
  mirrorAfterWrite(finals);
}

// Integration function
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

### Query Examples
```bash
# Get document with components and relationships
curl -X POST http://localhost:3001/api/v1/graph/graphql \
  -H "Authorization: Bearer dev-super-secret" \
  -d '{
    "query": "query GetDoc($id: ID!) { 
      document(where: {id: $id}) { 
        id title kind 
        components { id title anchor score }
        references { id title kind }
        derivedFrom { id title kind }
      } 
    }",
    "variables": {"id": "DS:current"}
  }'

# Search components by keyword
curl -X POST http://localhost:3001/api/v1/graph/graphql \
  -H "Authorization: Bearer dev-super-secret" \
  -d '{
    "query": "query Search($q: String!) {
      searchComponents(q: $q, limit: 10) {
        id title type score
        parent { id title kind }
      }
    }",
    "variables": {"q": "API"}
  }'
```

## Operational Considerations

### Performance Characteristics
- **File Operations**: Sub-second response times with atomic file locking
- **Graph Mirroring**: 2-5 seconds for component selection and Neo4j sync
- **GraphQL Queries**: <1 second response time for typical relationship queries
- **Memory Usage**: Minimal impact - selection algorithm processes one document at a time

### Monitoring and Observability
```typescript
// Metrics emitted during mirror operations
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

### Error Handling and Recovery
- **Graph Unavailable**: Core functionality continues unimpacted
- **Mirror Failures**: Logged but don't block document generation
- **Stale Data**: Set difference approach ensures consistent cleanup
- **Schema Evolution**: Version tracking via `selection_v` field

### Security Model
- **Authentication**: Bearer token required for all GraphQL operations
- **Authorization**: Read-only access to mirrored metadata only
- **CORS**: Configurable allowed origins
- **Query Limits**: Depth and complexity guards prevent abuse
- **Feature Flags**: Complete system can be disabled via environment

## Benefits and Trade-offs

### Benefits
- **Zero Impact**: Core workflows never blocked by graph operations
- **Enhanced Discovery**: Rich relationship querying capabilities
- **Consistent Data**: Idempotent operations ensure graph accuracy
- **Operational Simplicity**: Files remain primary, graph is additive
- **Performance**: Selective mirroring keeps graph size manageable

### Trade-offs  
- **Eventual Consistency**: Graph updates are asynchronous
- **Partial Data**: Only selected components mirrored, not full documents
- **Additional Complexity**: More moving parts for deployment
- **Resource Usage**: Neo4j requires additional infrastructure

## Future Evolution

### Planned Enhancements
- **User-Driven Selection**: Chat commands for manual component selection
- **AI-Assisted Selection**: LLM-guided selection with effectiveness tracking
- **Frontend Integration**: React components for graph exploration
- **Advanced Analytics**: Usage patterns and document quality metrics
- **Vector Integration**: Semantic similarity search combined with graph relationships

### Migration Paths
- **Scale Up**: Transition to dedicated graph database for large deployments
- **Multi-User**: Document isolation and sharing via graph relationships
- **Real-Time**: WebSocket subscriptions for live graph updates
- **Hybrid Search**: Vector embeddings + graph traversal for enhanced discovery

---

*This architecture provides a foundation for rich semantic discovery while maintaining the simplicity and reliability of file-based document storage.*