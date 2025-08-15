# ADR-002: GraphQL as Primary Data Layer

## Status

Accepted

## Context

The Chirality Framework requires a robust data access layer that can:

1. **Serve Multiple Clients**: Admin UI, Chat Interface, CLI tools, and potential future applications
2. **Handle Complex Graph Queries**: Neo4j data naturally forms a graph structure with components, cells, stations, and relationships
3. **Provide Type Safety**: Strong typing to prevent runtime errors and improve developer experience
4. **Enable Real-time Operations**: Support for subscriptions and live updates during matrix generation
5. **Scale Efficiently**: Handle concurrent requests from multiple frontend and backend services

Initial options considered:
- **Direct Neo4j Access**: Each service connects directly to Neo4j
- **REST API Layer**: Traditional REST endpoints for all operations
- **GraphQL Service Layer**: Unified GraphQL service with @neo4j/graphql integration
- **Hybrid Approach**: Mix of GraphQL and REST based on use case

## Decision

We chose to implement **GraphQL as the primary data layer** with the following architecture:

### Core Service
- **GraphQL Yoga Server**: Main GraphQL engine at `localhost:8080`
- **@neo4j/graphql Integration**: Direct GraphQL-to-Cypher translation
- **Schema-First Development**: GraphQL schema defines the data contract
- **Type Generation**: Automated TypeScript types from schema

### Service Responsibilities
```
┌─────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Client Apps       │────│  GraphQL Yoga   │────│  Neo4j Database │
│  (Admin UI, Chat)  │    │  Service Layer  │    │  (Graph Storage)│
└─────────────────────┘    └─────────────────┘    └─────────────────┘
         │                           │                       │
    ┌────┴────┐                ┌────┴────┐              ┌────┴────┐
    │GraphQL  │                │@neo4j/  │              │Auto-    │
    │Queries  │                │graphql  │              │generated│
    │Types    │                │Resolvers│              │Cypher   │
    └─────────┘                └─────────┘              └─────────┘
```

### GraphQL Schema Structure
- **Component**: Semantic framework matrices (A, B, C, F, D)
- **Cell**: Individual matrix cells with semantic content
- **Station**: Framework stations in the semantic valley
- **Term**: UFO ontology terms and definitions

### REST Endpoints (Limited)
- Health checks (`/health`, `/ready`)
- Metrics (`/metrics`)
- File uploads (when needed)

## Consequences

### Positive Consequences

1. **Unified Data Access**: Single endpoint for all graph operations
2. **Type Safety**: Full TypeScript integration with generated types
3. **Query Flexibility**: Clients can request exactly the data they need
4. **Performance**: @neo4j/graphql generates optimized Cypher queries
5. **Real-time Capabilities**: Built-in subscription support for live updates
6. **Developer Experience**: GraphQL Playground for interactive development
7. **Automatic Optimization**: Query complexity analysis and N+1 problem prevention
8. **Schema Documentation**: Self-documenting API through introspection

### Negative Consequences

1. **Learning Curve**: Team members need GraphQL knowledge
2. **Caching Complexity**: More complex than REST caching strategies
3. **Query Complexity**: Risk of expensive queries if not properly limited
4. **Debugging**: GraphQL queries can be harder to debug than simple REST calls
5. **Tooling Overhead**: Additional GraphQL-specific tooling and monitoring needed
6. **File Upload Limitations**: GraphQL not ideal for file uploads

### Mitigation Strategies

1. **Query Complexity Analysis**: Implement query depth and complexity limits
2. **Performance Monitoring**: Track query execution times and optimize slow queries
3. **DataLoader Pattern**: Implement DataLoader for efficient batch loading
4. **Caching Strategy**: Use Redis for query result caching where appropriate
5. **Rate Limiting**: Protect against query abuse with rate limiting
6. **Training and Documentation**: Comprehensive GraphQL training and examples

## Implementation Notes

### Technology Stack
- **GraphQL Yoga**: Modern GraphQL server with built-in features
- **@neo4j/graphql**: Official Neo4j GraphQL library
- **TypeScript**: Full type safety across the stack
- **Code Generation**: Automatic type generation from schema

### Schema Design Principles
```graphql
# Example schema structure
type Component {
  id: ID!
  name: String!
  station: String!
  shape: [Int!]!
  cells: [Cell!]! @relationship(type: "HAS_CELL", direction: OUT)
  createdAt: DateTime! @timestamp(operations: [CREATE])
  updatedAt: DateTime! @timestamp(operations: [UPDATE])
}

type Cell {
  id: ID!
  i: Int!
  j: Int!
  resolved: String
  rawTerms: [String!]!
  intermediate: [String!]!
  component: Component! @relationship(type: "HAS_CELL", direction: IN)
}

type Query {
  components(station: String, limit: Int = 20): [Component!]!
  component(id: ID!): Component
  searchCells(query: String!, limit: Int = 10): [Cell!]!
}

type Mutation {
  createComponent(input: ComponentInput!): Component!
  updateCell(id: ID!, content: String!): Cell!
  bulkUpdateCells(updates: [CellUpdateInput!]!): [Cell!]!
}
```

### Performance Optimizations
1. **Query Depth Limiting**: Maximum query depth of 10 levels
2. **Field-Level Caching**: Cache frequently accessed read-only data
3. **Batch Loading**: Use DataLoader for N+1 query prevention
4. **Connection Pooling**: Optimize Neo4j driver configuration
5. **Query Whitelisting**: Production query approval process for safety

### Migration Strategy
1. **Phase 1**: Basic GraphQL service with core types (Completed)
2. **Phase 2**: Full CRUD operations and relationships (In Progress)
3. **Phase 3**: Advanced features (subscriptions, caching, monitoring)
4. **Phase 4**: Performance optimization and production hardening

### Client Integration Patterns
```typescript
// Example client usage (Admin UI)
const GET_COMPONENTS = gql`
  query GetComponents($station: String) {
    components(station: $station) {
      id
      name
      station
      shape
      cells {
        i
        j
        resolved
      }
    }
  }
`;

// Mutation example
const UPDATE_CELL = gql`
  mutation UpdateCell($id: ID!, $content: String!) {
    updateCell(id: $id, content: $content) {
      id
      resolved
      updatedAt
    }
  }
`;
```

### Error Handling Strategy
- **Standardized Error Codes**: Consistent error format across all operations
- **Input Validation**: Schema-level validation with custom directives
- **Database Error Translation**: Convert Neo4j errors to user-friendly messages
- **Rate Limiting**: Return 429 errors with retry-after headers

## References

- [GraphQL Specification](https://spec.graphql.org/) - Official GraphQL specification
- [@neo4j/graphql Documentation](https://neo4j.com/docs/graphql-manual/current/) - Neo4j GraphQL library
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) - GraphQL server documentation
- [Schema-First Development](https://www.apollographql.com/blog/frontend/schema-design-for-graphql/) - GraphQL best practices
- [Query Complexity Analysis](https://github.com/slicknode/graphql-query-complexity) - Performance considerations