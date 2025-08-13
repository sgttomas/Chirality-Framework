# CF14 → Neo4j Help Guide

## Overview
This guide explains how to operate and troubleshoot the CF14 → Neo4j implementation.

## Environment Setup
### Prerequisites
- Node.js 18+
- Python 3.10+
- Neo4j Aura account or local instance

### Install Dependencies
```bash
npm install
source .venv/bin/activate && pip install -r requirements.txt
```

### Environment Variables
In `.env`:
```bash
OPENAI_API_KEY=your-openai-api-key
NEO4J_URI=neo4j+s://<your-instance>.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j
```

## Ingestion Workflow
1. Generate a matrix with the Python CLI.
```bash
source .venv/bin/activate
python chirality_cli.py matrix-grid --grid C_grid.csv --title "Matrix C" --rows_name "Row Labels" --cols_name "Column Labels" --out matrix_c.json
```
2. CLI posts JSON to `/api/neo4j/ingest`.
3. API stores components, cells, stations, and terms.

## Query Workflow
```bash
curl http://localhost:3000/api/neo4j/query?station=3
```

## Data Model Reference
Nodes:
- `Station`
- `Component`
- `Cell`
- `Term`

Relationships:
- `(:Component)-[:AT_STATION]->(:Station)`
- `(:Component)-[:HAS_CELL]->(:Cell)`
- `(:Cell)-[:RESOLVES_TO]->(:Term)`

## Troubleshooting
- Check API logs if ingestion fails.
- Verify Neo4j credentials in `.env`.
- Run `scripts/neo4j_init.cypher` to reinitialize schema.

## Maintenance Tips
- Use `npm audit fix` to update packages.
- For local Neo4j: `brew services start neo4j`.
