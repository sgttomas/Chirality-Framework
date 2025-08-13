# CF14 → Neo4j Implementation

## Description
This project implements the CF14 semantic framework in a Neo4j graph database using a hybrid architecture:
- Python CLI generates matrices/components in JSON.
- Next.js API handles ingestion and querying.
- Neo4j stores data as a graph with components, cells, stations, and terms.

## Quick Start
### Install Dependencies
```bash
npm install
source .venv/bin/activate && pip install -r requirements.txt
```

### Configure Environment Variables
In `.env`:
```bash
OPENAI_API_KEY=your-openai-api-key
NEO4J_URI=neo4j+s://<your-instance>.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j
```

### Run the API
```bash
npm run dev
```

## Folder Structure
- `/api/neo4j` - Ingestion and query routes
- `/cli` - Python CLI scripts
- `/ui` - Frontend pages

## How to Contribute
1. Fork repository
2. Create feature branch
3. Submit PR

## License
MIT
