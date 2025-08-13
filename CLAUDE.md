# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an active hybrid Next.js/Python project combining an OpenAI Responses API chat interface with a sophisticated Chirality Framework implementation for semantic matrix operations. Both systems are actively used and tightly integrated through Neo4j.

### Architecture

**Next.js Frontend (Active Chat Interface)**
- Main chat interface at `/` with Assistant and ToolsPanel components for conversational AI
- Instantiate page at `/instantiate` for additional functionality
- API routes in `app/api/` serve dual purpose: OpenAI Responses API + Neo4j bridge for Python tools
- Uses Zustand for state management (`stores/useConversationStore.ts`, `stores/useToolsStore.ts`)
- Configuration centralized in `config/constants.ts` (model: gpt-4.1-nano)

**Python CLI Tools (Active Chirality Framework)**
- `chirality_cli.py`: Main CLI for generating semantic matrices using Chirality Framework
- `neo4j_admin.py`: Database administration utility for component management  
- `conversation.py`: Simple OpenAI API demonstration
- Multiple semantic matrix operations (A*B=C, J*C=F, A+F=D) with Neo4j persistence
- All Python tools are actively used for semantic matrix generation and analysis

**Critical Integration**
- Python CLI tools depend on Next.js server running on `localhost:3000`
- Next.js API routes (`/api/neo4j/*`) act as essential proxy between Python tools and Neo4j
- Neo4j serves as shared data store accessible to both systems
- Both frontend chat and Python CLI workflows are part of active development process

## Development Commands

**Next.js Development**
```bash
npm install          # Install dependencies
npm run dev         # Start development server (localhost:3000)
npm run build       # Build for production
npm start          # Start production server
npm run lint       # Run ESLint (uses next/core-web-vitals + TypeScript rules)
```

**Python Chirality Operations**
```bash
# Generate semantic matrices from Chirality Framework
python chirality_cli.py semantic-matrix-c --out matrix_c.json
python chirality_cli.py semantic-matrix-f --out matrix_f.json
python chirality_cli.py semantic-matrix-d --out matrix_d.json

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
- Matrix D (3x4): Solution Objectives = A(i,j) + F(i,j) (semantic addition with framework formula)

**Neo4j Integration**
- Components stored with stations: Requirements, Objectives
- Query operations via `/api/neo4j/query` endpoint
- Ingest operations via `/api/neo4j/ingest-ufo` endpoint
- Each matrix has ID, name, station, shape, and cell data with resolved/raw_terms

**OpenAI API Usage**
- Frontend uses Responses API with function calling and streaming
- Python semantic operations use standard chat completions
- Requires OPENAI_API_KEY environment variable
- Model configured as gpt-4.1-nano in constants

## Essential Environment Setup

1. Set `OPENAI_API_KEY` in `.env` file or system environment
2. **CRITICAL**: Always run `npm run dev` first - Python CLI tools depend on Next.js server at localhost:3000
3. Ensure Neo4j database is accessible (all Python tools route through /api/neo4j/* endpoints)
4. Python semantic operations require API key: call `ensure_api_key()` from semmul module
5. Both systems (frontend chat + Python CLI) are actively used - don't disable either