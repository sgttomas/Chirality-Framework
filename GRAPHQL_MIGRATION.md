# GraphQL Migration Guide

> **Note**: The chat interface now lives in a separate repository. This guide covers the GraphQL service setup and integration between the two repositories.

## Polyrepo Architecture

- **Chirality-Framework** (this repo): Core semantic engine, GraphQL service, Python CLI
- **[Chirality-chat](https://github.com/sgttomas/Chirality-chat)**: Modern chat interface with streaming AI

## Phase 1: Setup & Deployment

### 1. GraphQL Service Setup (Chirality-Framework)

```bash
cd graphql-service
cp .env.example .env
# Edit .env with your Neo4j credentials
npm install
npm run db:apply  # Apply Neo4j constraints & indexes
npm run dev      # Start GraphQL service at http://localhost:8080/graphql
```

### 2. Chat UI Setup (Chirality-chat Repository)

```bash
# Clone the chat interface
git clone https://github.com/sgttomas/Chirality-chat.git
cd Chirality-chat

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with:
# - OPENAI_API_KEY
# - NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
# - GraphQL service URL (http://localhost:8080/graphql)

npm install
npm run dev      # Start chat interface at http://localhost:3000
```

### 3. Verify Setup

1. Visit http://localhost:8080/graphql (GraphiQL interface)
2. Test basic query:
```graphql
query TestConnection {
  components(pagination: { take: 5 }) {
    id
    name
    station
  }
}
```
3. Visit http://localhost:3000/matrices-example to test client integration

## Phase 2: Migration Steps

### Quick Sanity Checklist

After running the setup:

1. **Neo4j Constraints**:
```cypher
SHOW CONSTRAINTS;
SHOW INDEXES;
```

2. **GraphQL API Health**:
- GraphiQL loads at http://localhost:8080/graphql
- Test queries return expected data

3. **Chat UI Integration**:
- Matrix rendering shows correct row/col labels
- Cells display `resolved` content
- No transpose/orientation bugs

### UI Render Invariants

Add these assertions to your matrix components:
```typescript
// In matrix render component
console.assert(c.axes === c.shape.length, "Axes/shape mismatch");
console.assert(c.rowLabels.length === c.shape[0], "Row labels mismatch");
console.assert(c.colLabels.length === c.shape[1], "Col labels mismatch");
```

### Semantic Integrity Surfacing

- **Default**: Show `resolved` by default
- **Debug Toggle**: Add dev toggle to reveal `intermediate` and `rawTerms`
- **Audit Trail**: Use `rawTerms` for provenance, `intermediate` for debugging

## Performance Baselines

Record these SLOs before migration:
- **Component list**: Median/p95 response time
- **3×4 matrix fetch**: Full matrix load time  
- **Chat message + refs**: Message render with component previews

## Feature Flag Implementation

Use environment variable to toggle GraphQL vs REST:
```typescript
const useGraphQL = process.env.NEXT_PUBLIC_USE_GRAPHQL === 'true';

// In data layer
if (useGraphQL) {
  return apolloClient.query(/* GraphQL query */);
} else {
  return fetch('/api/neo4j/query', /* REST request */);
}
```

## Migration Phases

### Phase 1: Read-Only Migration ✅
- [x] GraphQL service with normalized cells
- [x] Apollo Client setup with codegen
- [x] Matrix rendering from GraphQL
- [ ] Feature flag for gradual rollout

### Phase 2: Navigation & References
- [ ] Station-based queries via GraphQL
- [ ] Chat message component references
- [ ] Component preview cards

### Phase 3: Performance & Polish  
- [ ] Query optimization and caching
- [ ] Error boundaries and fallbacks
- [ ] Load testing vs legacy API

### Phase 4: Deprecation
- [ ] Mark `/api/neo4j/*` deprecated with Sunset header
- [ ] Remove legacy endpoints after stable release

## Troubleshooting

### Common Issues

1. **Schema Misalignment**: Run `npm run codegen` after schema changes
2. **CORS Errors**: Check `ALLOWED_ORIGINS` in GraphQL service
3. **Auth Issues**: Verify JWT setup if using authentication
4. **Matrix Transpose**: Use explicit `rowLabels`/`colLabels`, not heuristics

### Performance Issues

1. **Query Depth**: Adjust `MAX_QUERY_DEPTH` if hitting limits
2. **Page Size**: Tune `MAX_PAGE_SIZE` for optimal performance
3. **Connection Pool**: Monitor `NEO4J_MAX_POOL` under load

## Success Criteria

- [ ] Chat UI reads all data from GraphQL
- [ ] Matrix rendering works with normalized cells
- [ ] No semantic integrity regressions (resolved/rawTerms/intermediate)
- [ ] Performance at or better than legacy API
- [ ] Feature flag allows safe rollback