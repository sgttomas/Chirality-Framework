# Backend Development Guide - Chirality Framework

[![Backend Status](https://img.shields.io/badge/Backend-In_Development-orange)](#)
[![Python](https://img.shields.io/badge/Python-3.8+-yellow)](#)
[![GraphQL](https://img.shields.io/badge/GraphQL-Ready-purple)](#)
[![Neo4j](https://img.shields.io/badge/Neo4j-Integrated-green)](#)

Comprehensive guide for backend developers working on the Chirality Framework infrastructure. This document provides roadmaps, priorities, and technical specifications for backend development tasks.

**Note**: This repository is part of the split-apps architecture. The chat interface has been moved to a separate `chirality-chat` repository, and this framework can work independently or connect to shared backend services via Docker Compose.

## 🎯 Backend Development Overview

The Chirality Framework backend consists of several interconnected services:

- **Python CLI Tools** (`chirality_cli.py`, `neo4j_admin.py`) - Core semantic operations
- **GraphQL Service** (`graphql-service/`) - Neo4j integration and API layer  
- **Admin UI Backend** (`chirality-admin/pages/api/`) - UI orchestration and management
- **Database Layer** (Neo4j) - Persistent semantic memory and graph operations

## 🚧 Current Development Status

### ✅ Completed Work
- **CLI Integration**: Real CLI commands integrated into admin UI replacing mock functions
- **GraphQL Foundation**: Basic GraphQL service with Neo4j integration operational
- **Process Management**: CLI process lifecycle management with output streaming
- **Core Operations**: All CF14 v2.1.1 semantic operations implemented

### 🔄 Active Development Areas

#### High Priority Backend Tasks

1. **Complete CLI Integration** (`chirality-admin/pages/api/phase1/step.ts`)
   - Add remaining CLI commands: `generate-f`, `generate-d`, `verify-stages`
   - Implement robust error handling for CLI process failures
   - Add timeout handling for long-running operations
   - Stream real-time CLI output to frontend

2. **GraphQL Service Enhancements** (`graphql-service/src/index.ts`)
   - Add health check endpoints (`/health`, `/ready`)
   - Implement structured request logging and monitoring
   - Add performance metrics collection
   - Optimize Neo4j query performance
   - Add rate limiting protection

3. **Python CLI Improvements** (`chirality_cli.py`)
   - Add `--json-output` flag for structured responses
   - Improve error messages with actionable suggestions
   - Add progress reporting for long operations
   - Implement operation resumption capability

#### Medium Priority Tasks

4. **Database Administration Enhancements** (`neo4j_admin.py`)
   - Add bulk operations for matrix management
   - Implement database health checks
   - Add data integrity validation commands
   - Create backup/restore functionality

5. **Backend Monitoring & Logging**
   - Create `backend_monitor.py` for system health monitoring
   - Implement `operation_logger.py` for structured logging
   - Add `performance_tracker.py` for operation timing and metrics

6. **Error Handling & Recovery**
   - Standardize error response format across all backend APIs
   - Add retry logic for transient failures
   - Implement graceful degradation for partial failures
   - Add operation rollback capability

## 📋 Development Roadmap

### Phase 1: Core Infrastructure (Current)
**Timeline: Current development cycle**

**Objectives:**
- Complete CLI integration in admin API routes
- Establish robust error handling across all services
- Implement basic monitoring and health checks

**Key Deliverables:**
- All CLI commands integrated into admin UI
- Standardized error handling middleware
- Health check endpoints for all services
- Basic performance monitoring

### Phase 2: Production Readiness
**Timeline: Next development cycle**

**Objectives:**
- Optimize performance for production workloads
- Implement comprehensive monitoring and alerting
- Add advanced error recovery and resilience

**Key Deliverables:**
- Database connection pooling and optimization
- Advanced monitoring and alerting systems
- Automated backup and recovery procedures
- Load testing and performance benchmarks

### Phase 3: Advanced Features
**Timeline: Future development**

**Objectives:**
- Scale backend for enterprise deployments
- Add advanced semantic operations
- Implement multi-tenancy and access controls

**Key Deliverables:**
- Horizontal scaling support
- Advanced semantic reasoning capabilities
- Enterprise security and compliance features
- Multi-tenant architecture support

## 🏗️ Backend Architecture

### Current Architecture
```
┌─────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Admin UI (Next.js) │────│  GraphQL Service│────│  Neo4j Graph   │
│  API Routes         │    │  (Port 8080)    │    │   Database     │
└─────────────────────┘    └─────────────────┘    └─────────────────┘
         │                           │                       │
    ┌────┴────┐                ┌────┴────┐              ┌────┴────┐
    │CLI Exec │                │@neo4j/  │              │Components│
    │Process  │                │graphql  │              │Cells+UFO │
    │Management│               │Apollo   │              │Terms     │
    └─────────┘                │Yoga     │              │Stations  │
                               └─────────┘              │Provenance│
┌─────────────────┐                                     └─────────┘
│Enhanced Python  │                                           │
│   CLI v2.1.1    │───────────────────────────────────────────┘
│  Semantic Ops   │
└─────────────────┘
```

### Target Architecture (Phase 2)
```
┌─────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Admin UI (Next.js) │────│  GraphQL Gateway│────│  Neo4j Cluster │
│  Load Balanced      │    │  (Health Checks)│    │   (Primary/    │
└─────────────────────┘    └─────────────────┘    │   Replicas)    │
         │                           │             └─────────────────┘
    ┌────┴────┐                ┌────┴────┐              ┌────┴────┐
    │CLI Queue│                │Rate     │              │Backup & │
    │Manager  │                │Limiting │              │Recovery │
    └─────────┘                │Monitoring│             │Services │
                               └─────────┘              └─────────┘
┌─────────────────┐                                           │
│Enhanced Python  │                                     ┌────┴────┐
│   CLI Cluster   │─────────────────────────────────────│Monitoring│
│  Auto-scaling   │                                     │& Alerts │
└─────────────────┘                                     └─────────┘
```

## 🔧 Development Environment Setup

### Prerequisites
- Python 3.8+ with pip
- Node.js 18+ with npm
- Neo4j Aura account or local Neo4j 5.x instance
- OpenAI API key with sufficient credits

### Quick Setup
```bash
# 1. Clone and setup main repository
git clone <repository-url>
cd chirality-semantic-framework

# 2. Install Python dependencies
pip install -e .
pip install click openai requests pydantic neo4j python-dotenv

# 3. Setup GraphQL service
cd graphql-service
npm install

# 4. Setup admin UI
cd ../chirality-admin
npm install

# 5. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Neo4j and OpenAI credentials
```

### Development Workflow
```bash
# Start all services for development
# Terminal 1: Neo4j (if local)
neo4j start

# Terminal 2: GraphQL service
cd graphql-service && npm run dev

# Terminal 3: Admin UI
cd chirality-admin && npm run dev

# Terminal 4: CLI testing
python chirality_cli.py health-check
```

## 📊 Performance Targets

### Current Performance Baselines
- **Matrix Generation**: 3x4 matrix (12 cells) in ~2-3 minutes
- **GraphQL Queries**: <100ms for simple component queries
- **CLI Operations**: <30s for individual cell operations
- **Database Operations**: <50ms for single cell updates

### Target Performance Goals
- **Matrix Generation**: 3x4 matrix (12 cells) in <90 seconds
- **GraphQL Queries**: <50ms for complex graph traversals
- **CLI Operations**: <10s for individual cell operations
- **Database Operations**: <20ms for batch cell updates

### Performance Monitoring
- Track operation execution times
- Monitor memory usage during large operations
- Measure API response times and throughput
- Database query performance analysis

## 🧪 Testing Strategy

### Testing Levels
1. **Unit Tests**: Individual function and method testing
2. **Integration Tests**: Cross-service communication testing
3. **End-to-End Tests**: Complete workflow testing
4. **Performance Tests**: Load and stress testing
5. **Smoke Tests**: Basic functionality verification

### Testing Commands
```bash
# Python CLI tests
python -m pytest tests/test_cli.py

# GraphQL service tests
cd graphql-service && npm test

# Admin UI API tests
cd chirality-admin && npm run test:api

# Integration tests
npm run test:integration

# Performance benchmarks
npm run bench
```

## 🔍 Monitoring & Observability

### Current Monitoring
- Basic health checks
- CLI operation logging
- GraphQL request logging

### Planned Monitoring Infrastructure
- **Metrics Collection**: Prometheus-compatible metrics
- **Log Aggregation**: Structured logging with correlation IDs
- **Health Dashboards**: Real-time service status monitoring
- **Alert Management**: Automated incident detection and notification
- **Performance Tracking**: Operation timing and resource utilization

### Key Metrics to Track
- CLI operation success/failure rates
- GraphQL query response times
- Neo4j connection pool utilization
- Memory usage during semantic operations
- OpenAI API usage and rate limiting

## 🚀 Deployment Strategy

### Development Deployment
- Local development with Docker Compose
- Shared development Neo4j instance
- Local GraphQL and CLI services

### Staging Deployment
- Containerized services with Docker
- Staging Neo4j cluster
- CI/CD pipeline integration
- Automated testing and validation

### Production Deployment
- Kubernetes orchestration
- High-availability Neo4j cluster
- Load balancing and auto-scaling
- Monitoring and alerting systems
- Backup and disaster recovery

## 🤝 Contributing to Backend Development

### Getting Started
1. Review this guide and related documentation
2. Set up development environment following setup instructions
3. Choose a development task from the current priorities
4. Follow the development workflow and testing procedures

### Code Standards
- Python: Follow PEP 8 style guidelines
- TypeScript: Use strict type checking and ESLint configuration
- GraphQL: Schema-first development approach
- Testing: Maintain comprehensive test coverage for new features

### Pull Request Process
1. Fork the repository and create feature branch
2. Implement changes with appropriate tests
3. Ensure all tests pass and code meets quality standards
4. Submit pull request with clear description and rationale
5. Address code review feedback and merge when approved

### Key Development Resources
- **Main README**: `/README.md` - Project overview and setup
- **CLI Development**: `/README_CLI.md` - Python CLI development guide
- **GraphQL Service**: `/graphql-service/README.md` - GraphQL service documentation
- **CLAUDE.md**: `/CLAUDE.md` - Project instructions and architecture

---

**Next Steps for New Contributors:**
1. Complete development environment setup
2. Run health checks and smoke tests
3. Review current work in progress items
4. Select a development task matching your skills and interests
5. Join development discussions and coordinate with the team

**For questions or support**: Review existing documentation, run health checks, and engage with the development community through issues and discussions.