# Chirality AI Backend Services

Backend services for the **Chirality Framework** - a meta-ontological methodology for generating reliable knowledge about generating reliable knowledge through systematic 12-station semantic valley progression.

## 🧠 Framework Integration

These backend services support the Chirality Framework's **Split-Apps Architecture** by providing:

- **Persistent Storage**: Neo4j graph database for semantic matrix operations
- **API Layer**: GraphQL and REST endpoints for frontend applications
- **Orchestration**: Admin services for managing semantic operations
- **Data Processing**: Backend support for LLM semantic interpolation operations

**LLM Role**: Large Language Models serve as **semantic interpolation engines** that resolve abstract word pairings within the framework's constructive architecture.

## 🏗️ Services Overview

### GraphQL Service (`/graphql`)

Primary data layer providing:
- Direct Neo4j integration for semantic matrices
- Type-safe GraphQL schema with code generation
- Real-time matrix generation operations
- Efficient graph traversal and queries

**Port**: `localhost:8080`
**Endpoint**: `http://localhost:8080/graphql`

### Admin Service (`/admin`)

Orchestration layer providing:
- Backend administration interface
- Process management for CLI operations
- Health monitoring and metrics
- API wrapper for Python CLI tools

**Port**: `localhost:3001`
**Endpoints**: RESTful API for admin operations

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ and npm
- Neo4j Aura account or local instance

### Start All Services

```bash
# From the parent directory with docker-compose.yml
docker compose up -d

# Services will be available at:
# - GraphQL: http://localhost:8080/graphql
# - Admin: http://localhost:3001
# - Neo4j Browser: http://localhost:7474
```

### Development Mode

```bash
# Start GraphQL service
cd graphql
npm install
npm run dev

# Start Admin service (separate terminal)
cd admin
npm install
npm run dev
```

## 🔧 Environment Configuration

Required environment variables:

```env
# Neo4j Configuration
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

# Service Configuration
GRAPHQL_PORT=8080
ADMIN_PORT=3001
NODE_ENV=development

# OpenAI Configuration (for semantic operations)
OPENAI_API_KEY=sk-proj-your-api-key
```

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                Frontend Applications                     │
│  ┌─────────────────┐    ┌─────────────────┐           │
│  │ chirality-ai-app│    │  chirality-chat │           │
│  └─────────────────┘    └─────────────────┘           │
└─────────────┬───────────────────┬───────────────────────┘
              │                   │
              ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                Backend Services                         │
│  ┌─────────────────┐    ┌─────────────────┐           │
│  │  GraphQL API    │    │  Admin Service  │           │
│  │  (port 8080)    │    │  (port 3001)    │           │
│  └─────────────────┘    └─────────────────┘           │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│                    Neo4j Database                       │
│        Semantic Matrix Storage & Graph Operations       │
└─────────────────────────────────────────────────────────┘
```

## 🔗 Integration with Framework Components

### With Semantic Framework

- **Python CLI Tools**: Backend calls to `chirality_cli.py` for matrix operations
- **Semantic Operations**: Support for A*B=C, J*C=F, A+F=D matrix transformations
- **LLM Integration**: Provides infrastructure for semantic interpolation operations

### With Frontend Applications

- **GraphQL Queries**: Type-safe data access for matrix visualization
- **REST APIs**: Admin operations and health monitoring
- **Real-time Updates**: WebSocket support for live matrix generation

## 🤝 Contributing

This backend supports the framework's meta-learning integrity by:

1. **Preserving Semantic Boundaries**: Clear separation between constructive and generative operations
2. **Supporting LLM Role**: Infrastructure for semantic interpolation, not decision-making
3. **Maintaining Framework Structure**: Backend operations preserve 12-station semantic valley

See individual service READMEs for specific development guidelines:
- [GraphQL Service](./graphql/README.md)
- [Admin Service](./admin/README.md)

## 📄 License

Part of the Chirality Framework project. See main repository for licensing information.

---

*These backend services implement the data and orchestration layer for the Chirality Framework's meta-ontological methodology, ensuring reliable knowledge generation through systematic semantic operations.*