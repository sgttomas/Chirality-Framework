# ADR-001: Split-Apps Architecture for Framework/Interface Separation

## Status

Accepted

## Context

The original Chirality Framework was implemented as a monolithic repository containing both frontend (chat interface) and backend (semantic engine, GraphQL service, CLI tools) components. This created several challenges:

1. **Development Complexity**: Frontend and backend changes required coordination and could block each other
2. **Deployment Coupling**: Chat interface updates required redeploying the entire system
3. **Contributor Confusion**: New contributors had difficulty understanding which parts of the codebase were relevant to their interests
4. **Technology Stack Conflicts**: Frontend dependencies (React, Next.js) mixed with backend dependencies (Python, Neo4j) in the same repository
5. **Scaling Issues**: Different components had different scaling requirements and deployment patterns

The team needed to decide between:
- Keeping the monolithic structure with better tooling
- Moving to a split-apps architecture with clear separation
- Adopting a monorepo approach with workspace separation

## Decision

We chose to implement a **split-apps architecture** with the following separation:

### Primary Repository (Chirality-Framework)
- **Purpose**: Core semantic engine and backend services
- **Contains**: 
  - GraphQL service (`graphql-service/`)
  - Python CLI tools (`chirality_cli.py`, `neo4j_admin.py`)
  - Admin UI for backend operations (`chirality-admin/`)
  - Core API routes (`src/app/api/`)
  - Testing and benchmarking tools

### Secondary Repository (Chirality-chat)
- **Purpose**: User-facing chat interface
- **Contains**:
  - Modern Next.js chat interface
  - Matrix visualization components
  - MCP integration
  - Streaming AI responses

### Connection Pattern
- Chat interface connects to backend via GraphQL service at `localhost:8080`
- Both repositories can be developed and deployed independently
- Shared protocols defined through GraphQL schema and REST API contracts

## Consequences

### Positive Consequences

1. **Clear Separation of Concerns**: Frontend and backend teams can work independently
2. **Independent Deployment**: Chat interface can be updated without affecting core semantic operations
3. **Technology Optimization**: Each repository can optimize for its specific technology stack
4. **Contributor Onboarding**: New contributors can focus on either frontend or backend without setup overhead
5. **Scaling Flexibility**: Backend services can scale independently from chat interface
6. **Reduced Complexity**: Smaller, focused repositories are easier to understand and maintain

### Negative Consequences

1. **Coordination Overhead**: API changes require coordination between repositories
2. **Documentation Duplication**: Some documentation needs to exist in both places
3. **Development Setup**: Developers working on full-stack features need to set up both repositories
4. **Dependency Management**: Shared dependencies (like GraphQL schema) need careful versioning
5. **Integration Testing**: End-to-end testing requires both repositories to be running

### Mitigation Strategies

1. **GraphQL Schema as Contract**: Use schema-first development to define clear API contracts
2. **Comprehensive Documentation**: Maintain clear setup instructions in both repositories
3. **Docker Compose**: Provide docker-compose setup for full-stack development
4. **CI/CD Integration**: Automated testing that validates repository integration
5. **Semantic Versioning**: Use semantic versioning for API compatibility

## Implementation Notes

### Migration Process
1. **Phase 1**: Extract chat interface to separate repository (Completed)
2. **Phase 2**: Reorganize backend code structure (Completed)
3. **Phase 3**: Establish clear API contracts and documentation (In Progress)
4. **Phase 4**: Optimize deployment and CI/CD for polyrepo structure

### Directory Structure Changes
```
Before (Monolithic):
chirality-framework/
├── frontend/          # Chat interface
├── backend/           # Semantic engine
├── graphql/           # GraphQL service
└── shared/            # Shared utilities

After (Split-Apps):
chirality-framework/   # This repository
├── graphql-service/   # Standalone GraphQL service
├── chirality-admin/   # Backend admin UI
├── src/app/api/       # REST API routes
└── scripts/           # CLI tools and utilities

chirality-chat/        # Separate repository
├── src/               # Chat interface
├── components/        # UI components
└── lib/               # Frontend utilities
```

### Framework Boundary Management
- **Chirality Framework**: Meta-ontological methodology (human-designed)
- **LLM Role**: Semantic interpolation engine only
- **API Contracts**: GraphQL schema serves as the primary contract
- **Constructive vs Generative**: Clear separation maintained across repositories
- Schema changes are versioned and documented
- Breaking changes require coordination between repositories
- Health check endpoints ensure service compatibility

### Development Workflow
1. Backend changes are developed and tested in isolation
2. API contracts are updated and documented
3. Frontend adapts to new APIs in separate development cycle
4. Integration testing validates end-to-end functionality

## References

- [Conway's Law](https://en.wikipedia.org/wiki/Conway%27s_law) - Organizations design systems that mirror their communication structure
- [Microservices Architecture](https://microservices.io/) - Patterns for service decomposition
- [GraphQL Schema-First Development](https://www.apollographql.com/blog/frontend/schema-design-for-graphql/) - API contract management
- Original discussion: Backend/Frontend Separation Planning (internal)