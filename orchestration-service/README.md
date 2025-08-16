# Chirality Framework Orchestration Service

**Salvaged from chirality-ai-backend** - A Node.js/Express service for orchestrating Chirality Framework operations.

## Purpose

This service provides:
- REST API wrapper for Python CLI tools
- Job management and tracking
- Secure CLI command execution
- Health monitoring endpoints

## Key Components

- `src/routes/orchestrate.ts` - Matrix generation workflows
- `src/routes/cli.ts` - Secure Python CLI integration
- `src/routes/health.ts` - Service health monitoring
- `src/utils/logger.ts` - Structured logging

## Usage

```bash
npm install
npm run dev  # Development mode on port 3001
npm run build && npm start  # Production mode
```

## API Endpoints

- `POST /orchestrate/matrix/:type` - Generate semantic matrices
- `POST /cli/execute` - Execute allowed CLI commands
- `GET /health` - Service health status

## Security

Only allows whitelisted CLI commands:
- `semantic-matrix-c`
- `semantic-matrix-f` 
- `semantic-matrix-d`
- `full-pipeline`
- `semantic-init`
- `semantic-iv`

## Integration

This service is designed to work with:
- Main Chirality Framework Python CLI
- Neo4j database for persistence
- Frontend applications via REST API

---

*Salvaged on: August 16, 2025*
*Original source: chirality-ai-backend/admin/*