# GraphQL Service - Chirality Framework Backend

[![Service Status](https://img.shields.io/badge/Status-Production_Ready-success)](#)
[![GraphQL](https://img.shields.io/badge/GraphQL-Yoga-purple)](#)
[![Neo4j](https://img.shields.io/badge/Database-Neo4j-green)](#)

## 🧠 Chirality Framework Integration

This GraphQL service serves as the backend data layer for the **Chirality Framework** - a meta-ontological methodology for generating reliable knowledge about generating reliable knowledge through systematic 12-station semantic valley progression.

**Framework Role**: Provides persistent graph storage and semantic matrix operations for the framework's constructive architecture, where LLMs serve as **semantic interpolation engines** within human-designed semantic operations.

## 🎯 Service Purpose

The GraphQL service provides backend support for:
- **Semantic Matrix Persistence**: Storage of 12-station semantic valley operations (A*B=C, J*C=F, A+F=D)
- **Direct Neo4j Integration**: Schema-first GraphQL development with @neo4j/graphql
- **Real-time Operations**: Live matrix generation with progress tracking
- **Type-safe Queries**: Complete GraphQL schema with code generation support
- **Performance Optimization**: Efficient graph traversal and query optimization


## 🏗️ Split-Apps Architecture

This GraphQL service is part of the Chirality Framework's **Split-Apps Architecture**:

- **Frontend Applications**: Independent Next.js applications (chirality-ai-app, chirality-chat)
- **Backend Services**: This GraphQL service + Admin orchestrator service
- **Framework Core**: Semantic operations engine (chirality-semantic-framework)

**Integration Points**:
- LLMs perform semantic interpolation through `semmul.py` operations
- Matrix persistence via Neo4j for semantic valley progression
- RESTful and GraphQL APIs for frontend consumption

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Neo4j Aura account or local Neo4j 5.x instance
- Proper environment configuration

### Installation & Setup

```bash
cd graphql-service
npm install
```

### Environment Configuration

Create `.env` in the graphql-service directory:

```env
# Neo4j Configuration
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-aura-password
NEO4J_DATABASE=neo4j

# Service Configuration
PORT=8080
NODE_ENV=development
```

### Running the Service

```bash
# Development mode with hot reload
npm run dev

# Production build and start
npm run build
npm start
```

Service will be available at: http://localhost:8080/graphql

## 🛠️ Development Status & Roadmap

### ✅ Completed Features
- GraphQL Yoga server with Neo4j integration
- Basic schema definitions and resolvers
- Component and matrix query operations
- Neo4j connection management

### 🔄 In Progress

**High Priority Backend Development Tasks:**

1. **Health Check Endpoints**
   - Add `/health` and `/ready` endpoints for monitoring
   - Database connectivity validation
   - Service dependency health checks

2. **Request Logging & Monitoring**
   - Implement structured request/response logging
   - Add performance metrics collection
   - Integration with observability tools

3. **Performance Metrics Collection**
   - Query execution time tracking
   - Database connection pool monitoring
   - Memory usage and resource utilization

### 🎯 Upcoming Enhancements

**High Priority:**
- **Rate Limiting Protection**: Implement request throttling for production use
- **Query Optimization**: Enhance Neo4j query performance for large datasets
- **Error Handling**: Standardize error responses and add comprehensive error recovery

**Medium Priority:**
- **Caching Layer**: Add Redis or in-memory caching for frequently accessed data
- **Schema Validation**: Enhanced input validation and type checking
- **Batch Operations**: Support for bulk matrix operations and parallel processing

**Low Priority:**
- **GraphQL Subscriptions**: Real-time updates for matrix generation progress
- **API Versioning**: Support for multiple schema versions
- **Load Balancing**: Multi-instance deployment support

## 📊 Current Architecture

```
┌─────────────────────┐    ┌─────────────────┐
│  GraphQL Yoga      │────│  Neo4j Driver   │
│  (localhost:8080)  │    │  (@neo4j/graphql)│
└─────────────────────┘    └─────────────────┘
          │                          │
    ┌─────┴─────┐              ┌─────┴─────┐
    │  Schema   │              │  Graph    │
    │ Resolvers │              │ Database  │
    └───────────┘              └───────────┘
```

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build for production
npm run start           # Start production server

# Testing & Quality
npm run test            # Run test suite
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking

# Database
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed development data
```

## 📡 GraphQL Schema

### Core Types
- `Component`: Semantic framework components (A, B, C, F, D matrices)
- `Cell`: Individual matrix cells with semantic content
- `Station`: Framework stations in the semantic valley
- `Term`: UFO ontology terms and definitions

### Key Queries
```graphql
# Get all components at a station
components(station: String!): [Component!]!

# Get specific matrix by ID
component(id: ID!): Component

# Query cells with filtering
cells(station: String, row: Int, col: Int): [Cell!]!

# Health check
health: HealthStatus!
```

### Mutations
```graphql
# Create new component
createComponent(input: ComponentInput!): Component!

# Update cell content
updateCell(id: ID!, content: String!): Cell!

# Batch operations
bulkUpdateCells(operations: [CellUpdateInput!]!): [Cell!]!
```

## 🏗️ Backend Integration Points

The GraphQL service integrates with:

1. **Python CLI Tools** (`chirality_cli.py`)
   - Matrix generation operations
   - Semantic multiplication and addition
   - Component persistence

2. **Admin UI** (`chirality-admin/`)
   - Real-time operation monitoring
   - Cell inspection and editing
   - Pipeline orchestration

3. **Chat Interface** (`Chirality-chat` repo)
   - Knowledge graph queries
   - Contextual information retrieval
   - Semantic relationship exploration

## 🔍 Monitoring & Debugging

### Health Endpoints (Coming Soon)
```bash
# Service health
curl http://localhost:8080/health

# Database connectivity
curl http://localhost:8080/ready

# Metrics endpoint
curl http://localhost:8080/metrics
```

### Development Tools
- **GraphQL Playground**: Available at `/graphql` for interactive query testing
- **Schema Introspection**: Full schema documentation via GraphQL introspection
- **Debug Logging**: Configurable log levels for development and production

## 🚀 Production Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=8080
NEO4J_URI=neo4j+s://production-cluster.databases.neo4j.io
NEO4J_USER=production_user
NEO4J_PASSWORD=secure_password
LOG_LEVEL=info
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=900000
```

### Performance Considerations
- **Connection Pooling**: Optimized Neo4j driver configuration
- **Query Optimization**: Efficient Cypher query patterns
- **Memory Management**: Proper resource cleanup and monitoring
- **Error Recovery**: Graceful handling of database disconnections

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/graphql-enhancement`
3. Follow the development setup above
4. Implement changes with tests
5. Submit pull request with clear description

### Code Standards
- TypeScript with strict type checking
- ESLint configuration for consistent code style
- Comprehensive test coverage for new features
- GraphQL schema-first development approach

---

**Next Steps**: Complete health check implementation, add performance monitoring, and enhance error handling for production readiness.