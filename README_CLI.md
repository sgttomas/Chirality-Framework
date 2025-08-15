# Chirality CLI - Backend Development Guide

[![CLI Status](https://img.shields.io/badge/Status-Production_Ready-success)](#)
[![Python](https://img.shields.io/badge/Python-3.8+-yellow)](#)
[![CF14](https://img.shields.io/badge/CF14-v2.1.1-blue)](#)

This document describes the Phase 1 CLI for the Chirality Semantic Framework and ongoing backend development improvements.

## 📍 Purpose

The CLI exists to generate the canonical Chirality Framework components — cell-by-cell, with all intermediate semantic stages persisted to Neo4j — from the normative specification (NORMATIVE_Chirality_Framework_14.2.1.1.txt).

**Primary Users:**
- Human operators running manual CLI commands
- chirality-admin UI orchestrator API for automated pipeline execution
- Development and testing workflows

**Key Features:**
- Phase 1 canonical framework generation (no domain-specific content)
- Cell-by-cell semantic operations with full provenance
- Neo4j persistence and GraphQL integration
- Real-time progress tracking and error recovery

## 🛠️ Development Status & Roadmap

### ✅ Current Implementation
- Complete CF14 v2.1.1 command set (push-axioms, generate-c, generate-f, generate-d, verify-stages)
- Neo4j integration via GraphQL API
- Basic error handling and process management
- Integration with chirality-admin UI

### 🔄 Active Development Tasks

**High Priority Improvements:**

1. **JSON Output Format** - Add `--json-output` flag for structured responses
   ```bash
   # Current: Human-readable text output
   chirality-cli generate-c --matrix C
   
   # Planned: Structured JSON output
   chirality-cli generate-c --matrix C --json-output
   ```

2. **Enhanced Error Messages** - Actionable error reporting with suggestions
   ```bash
   # Current: Generic error messages
   Error: Failed to connect to Neo4j
   
   # Planned: Actionable suggestions
   Error: Failed to connect to Neo4j at bolt://localhost:7687
   Suggestions:
   - Check if Neo4j is running: systemctl status neo4j
   - Verify credentials in .env file
   - Test connection: curl http://localhost:7474/browser/
   ```

3. **Progress Reporting** - Real-time operation progress for long-running tasks
   ```bash
   # Planned: Live progress updates
   Generating Matrix C [████████████████████████████████] 100% (12/12 cells)
   Cell (2,3) completed: Requirements.Systematic.ProcessOptimization ✓
   ```

4. **Operation Resumption** - Resume interrupted operations from checkpoint
   ```bash
   # Planned: Resume capability
   chirality-cli generate-c --resume-from-checkpoint
   ```

**Medium Priority Enhancements:**

1. **Batch Operations** - Bulk matrix management commands
2. **Health Checks** - Database and service connectivity validation
3. **Performance Optimization** - Faster semantic operations and reduced API calls
4. **Configuration Management** - Improved environment variable handling

### 📋 Technical Debt Items

- Remove hardcoded file paths in CLI operations
- Standardize error response format across all commands  
- Add comprehensive input validation
- Implement proper logging with configurable levels
- Add operation timeout handling

⸻

⚙️ Commands

Command	Description	Matrix/Stage Impacted
push-axioms	Initialize matrices A, B, J from the normative spec	A, B, J
generate-c	Generate Requirements matrix C cell-by-cell (using semantic multiplication/addition rules)	C
generate-f	Generate Objectives matrix F cell-by-cell (from J and C)	F
generate-d	Generate Solution Objectives matrix D (from A and F)	D
verify-stages	Verify that all intermediate stages exist and match expected structure in Neo4j	All


⸻

📦 Installation

This CLI lives in the chirality-semantic-framework repo.

pip install -e .


⸻

🔑 Required Environment

Create a .env in the backend root:

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-nano
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=yourpassword


⸻

🖥️ Usage

Syntax

chirality-cli {push-axioms|generate-c|generate-f|generate-d|verify-stages} [options]


⸻

1) Push Axioms

Load matrices A, B, and J into Neo4j from the normative spec.

chirality-cli push-axioms \
  --api_base http://localhost:8080 \
  --spec NORMATIVE_Chirality_Framework_14.2.1.1.txt


⸻

2) Generate C

Build Requirements matrix C cell-by-cell.
Each cell: pull (i,j) context → generate → push stage → pull to verify.

chirality-cli generate-c \
  --api_base http://localhost:8080 \
  --matrix C \
  --rows all \
  --cols all


⸻

3) Generate F

Generate Objectives matrix F from J and C.

chirality-cli generate-f \
  --api_base http://localhost:8080 \
  --matrix F


⸻

4) Generate D

Generate Solution Objectives matrix D from A and F.

chirality-cli generate-d \
  --api_base http://localhost:8080 \
  --matrix D


⸻

5) Verify Stages

Ensure each cell in all matrices has its complete semantic stage history in Neo4j.

chirality-cli verify-stages \
  --api_base http://localhost:8080


⸻

🔄 Cell-Level Push/Pull Pattern

All generation commands follow the same cell-level loop:
	1.	Pull cell context: (station, valley, row_label, col_label)
	2.	Generate semantic stage via LLM (system + context prompts)
	3.	Push to Neo4j via GraphQL mutation
	4.	Pull immediately to verify
	5.	Iterate to next (i,j)

No whole-matrix shuttling — keeps functions predictable and composable.

⸻

📡 GraphQL Integration

CLI calls the backend’s GraphQL API (implemented in chirality_graphql.py) for:
	•	Pull cell context:

query {
  cell(station: "C", i: 0, j: 1) {
    station
    valley { id name layout }
    rowLabel
    colLabel
    stages { name content timestamp }
  }
}

	•	Push new stage:

mutation {
  pushCellStage(
    station: "C",
    i: 0,
    j: 1,
    stageName: "product",
    content: "..."
  ) { success }
}


⸻

🛠️ Admin UI Coupling

The chirality-admin orchestrator calls the CLI via /api/orchestrate/run, passing:

{
  "cmd": "generate-c",
  "args": {
    "api_base": "http://localhost:8080",
    "matrix": "C",
    "rows": "all",
    "cols": "all"
  }
}

Pipeline Console maps UI actions → CLI commands exactly, so operators don’t have to memorize syntax.

⸻

## 🔧 Backend Development Workflow

### Development Environment Setup

1. **Install CLI in Development Mode**
   ```bash
   pip install -e .
   ```

2. **Environment Configuration**
   ```bash
   # Required in .env file
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4.1-nano
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=yourpassword
   ```

3. **Backend Service Dependencies**
   ```bash
   # Start GraphQL service
   cd graphql-service && npm run dev
   
   # Start Neo4j (if running locally)
   systemctl start neo4j
   ```

### 🧪 Testing & Quality Assurance

**Testing Commands:**
```bash
# Run CLI health checks
python chirality_cli.py health-check

# Test Neo4j connectivity
python chirality_cli.py test-connection

# Validate semantic operations
python chirality_cli.py validate-operations

# Run integration tests
python -m pytest tests/test_cli_integration.py
```

**Quality Checks:**
```bash
# Code formatting
black chirality_cli.py

# Type checking
mypy chirality_cli.py

# Linting
flake8 chirality_cli.py
```

### 🔍 Backend Integration Points

**Key Backend Files:**
- `chirality_prompts.py` - Prompt construction logic for semantic stages
- `chirality_graphql.py` - GraphQL interface for Neo4j operations
- `semmul_cf14.py` - Semantic multiplier utilities (cell-by-cell ops)
- `chirality_cli.py` - Main CLI orchestration (keep minimal and composable)

**Admin UI Integration:**
The chirality-admin orchestrator calls CLI via `/api/orchestrate/run`:
```json
{
  "cmd": "generate-c",
  "args": {
    "api_base": "http://localhost:8080",
    "matrix": "C",
    "rows": "all",
    "cols": "all"
  }
}
```

### 📊 Performance Monitoring

**Planned Monitoring Features:**
- Operation execution time tracking
- Neo4j query performance metrics
- Memory usage monitoring during large matrix operations
- API call frequency and response time analysis

**Current Bottlenecks:**
- Cell-by-cell operations can be slow for large matrices
- GraphQL API round-trips for each cell update
- OpenAI API rate limiting during semantic operations

### 🚀 Deployment Considerations

**Production Environment:**
- Ensure sufficient OpenAI API credits and rate limits
- Configure Neo4j connection pooling for concurrent operations
- Set appropriate timeout values for long-running matrix generation
- Monitor disk space for temporary files and logs

**Scaling Considerations:**
- Consider batch operations for large matrix generation
- Implement operation queuing for concurrent CLI usage
- Add horizontal scaling support for multi-instance deployments

📜 Development Notes
	•	Keep prompts in chirality_prompts.py so UI + CLI are in sync.
	•	All cell context and stage persistence go through chirality_graphql.py.
	•	Use semmul_cf14.py for semantic operations (product, sum, interpretation).
	•	The CLI is orchestrated in chirality_cli.py; keep it minimal and composable.
	•	Follow fail-fast semantics - prefer explicit errors over silent failures.
	•	Maintain backward compatibility with existing command interfaces.

⸻
