# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains the core Chirality Framework implementation, including the semantic engine, GraphQL service, and Python CLI tools. The chat interface has been separated into its own repository at [Chirality-chat](https://github.com/sgttomas/Chirality-chat).

### Polyrepo Architecture

**Chirality-Framework (this repo)**
- GraphQL service at `graphql-service/` for Neo4j graph operations
- Python CLI tools (`chirality_cli.py`, `neo4j_admin.py`) for semantic matrix generation
- Core API routes in `src/app/api/` for framework operations
- Testing and benchmarking tools in `scripts/` and `bench/`

**Chirality-chat (separate repo)**
- Modern Next.js chat interface with OpenAI Responses API
- Matrix visualization and MCP integration
- Connects to this repo's GraphQL service at localhost:8080

### Key Services

**GraphQL Service (localhost:8080)**
- Built with GraphQL Yoga and @neo4j/graphql
- Direct Neo4j integration for graph operations
- Schema-first development with codegen support
- Accessible at http://localhost:8080/graphql

**Python CLI Tools**
- `chirality_cli.py`: Main CLI for generating semantic matrices using Chirality Framework
- `neo4j_admin.py`: Database administration utility for component management  
- Multiple semantic matrix operations (A*B=C, J*C=F, A+F=D) with Neo4j persistence
- Domain pack support for customized ontologies

**Neo4j Integration**
- Components stored with stations: Requirements, Objectives
- Direct access via GraphQL or REST APIs
- Each matrix has ID, name, station, shape, and cell data with resolved/raw_terms

## Development Commands

**GraphQL Service**
```bash
cd graphql-service
npm install          # Install dependencies
npm run dev         # Start GraphQL server (localhost:8080)
npm run build       # Build for production
```

**Testing & Benchmarking**
```bash
npm run smoke:rest  # Test REST API endpoints
npm run smoke:gql   # Test GraphQL endpoints
npm run bench       # Run performance benchmarks
npm run test        # Run Jest test suite
```

**Python Chirality Operations**
```bash
# Generate semantic matrices from Chirality Framework
python chirality_cli.py semantic-matrix-c --out matrix_c.json
python chirality_cli.py semantic-matrix-f --out matrix_f.json
python chirality_cli.py semantic-matrix-d --out matrix_d.json

# Enhanced operations with ontology packs
python chirality_cli.py semantic-matrix-c --ontology-pack ./ontology/cf14.core.v2.1.1.json --run-interpretations --out matrix_c.json

# Database management
python neo4j_admin.py list                    # List all components
python neo4j_admin.py delete --id <comp_id>   # Delete specific component
python neo4j_admin.py delete-station --station <name>  # Delete all at station
```

## Key Implementation Details

**Semantic Matrix Operations**
- Matrix A (3x4): Problem Statement (axiomatic)
- Matrix B (4x4): Decisions (axiomatic) 
- Matrix C (3x4): Requirements = A * B (semantic multiplication)
- Matrix J (3x4): Truncated Decisions (first 3 rows of B)
- Matrix F (3x4): Objectives = J(i,j) * C(i,j) (element-wise semantic multiplication)
- Matrix D (3x4): Solution Objectives = A(i,j) + F(i,j) (semantic addition)

**GraphQL Schema**
- Type-safe queries and mutations
- Neo4j graph integration via @neo4j/graphql
- Code generation with @graphql-codegen
- See `schema.graphql` for complete type definitions

**OpenAI API Usage**
- Python semantic operations use standard chat completions
- Requires OPENAI_API_KEY environment variable
- Chat interface (in Chirality-chat repo) uses Responses API with streaming

## UFO Ontology Alignment

**UFO alignment note**: In this project, "modality" means analysis lens (Systematic, Process, Epistemic, Alethic). This is not UFO's "Mode." We align as follows: Systematic ↔ UFO-C Normative Descriptions; Process ↔ UFO-B Perdurants; Epistemic ↔ UFO-C Information Objects & UFO-A Modes (beliefs/skills); Alethic ↔ logical constraints on Descriptions/Processes. We do not introduce new UFO categories; we annotate UFO-typed elements with modal constraints when needed.

## Chirality Boundary Implementation

**IMPORTANT**: The codebase maintains strict separation between constructive (deterministic) and generative (LLM-based) operations to preserve "chirality of knowledge":

**Constructive Operations (No LLM)**:
- Matrix mechanics (multiplication, addition, truncation)
- Data extraction from Neo4j
- String concatenation for semantic addition
- Label propagation and ontology management

**Generative Operations (LLM via semmul.py)**:
- Semantic multiplication only (`semantic_multiply()` function)
- All interpretation is prepared as `interpretation_inputs` in `Cell.intermediate` for future processing

**New CLI Flags**:
- `--ontology-pack PATH`: Load ontology meanings from JSON pack
- `--run-interpretations`: Mark intent for downstream interpretation (no LLM execution)
- `--include-station-context`: Include station names in interpretation inputs

## Essential Environment Setup

1. Set `OPENAI_API_KEY` in `.env` file or system environment
2. Start GraphQL service: `cd graphql-service && npm run dev`
3. Ensure Neo4j database is accessible with proper credentials
4. Python semantic operations require API key: call `ensure_api_key()` from semmul module
5. For chat interface, clone and run Chirality-chat repository separately

## Project Structure

```
graphql-service/        # GraphQL service with Neo4j integration
src/                    # Core application code
  app/api/             # REST API routes
  lib/                 # Shared libraries
  graphql/queries/     # GraphQL query definitions
scripts/               # Testing and smoke tests
bench/                 # Performance benchmarking
ontology/              # CF14 domain packs
chirality_cli.py       # Main Python CLI
neo4j_admin.py        # Database administration
```

## Migration Notes

If migrating from the monolithic version:
1. Frontend code has moved to Chirality-chat repository
2. GraphQL service is now standalone in graphql-service/
3. API routes have moved from app/ to src/app/
4. Test files are now in scripts/ and src/__tests__/
5. Configuration remains backward compatible