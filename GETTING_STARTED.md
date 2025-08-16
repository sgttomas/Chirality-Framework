# Getting Started

This guide will help you set up and run the Chirality Framework backend services. This repository is part of the split-apps architecture where the chat interface has been moved to a separate repository.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python** 3.8 or higher
- **Node.js** 18 or higher
- **npm** (comes with Node.js)
- **Git**

Verify your installations:
```bash
python3 --version  # Should show 3.8+
node --version     # Should show v18+
npm --version      # Should show 8+
git --version      # Any recent version
```

## Quick Start (5 minutes)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd chirality-semantic-framework
```

### 2. Set Up Environment Variables
Create a `.env` file in the project root with your credentials:

```bash
# Create .env file
cat > .env << 'EOF'
# Neo4j Database Configuration
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-your-api-key

# Optional Configuration
NEXT_PUBLIC_API_BASE=http://localhost:3000
EOF
```

**Getting Credentials:**
- **Neo4j**: Sign up for free at [Neo4j Aura](https://neo4j.com/cloud/aura-free/) or use local Neo4j
- **OpenAI**: Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)

### 3. Install Dependencies
```bash
# Install Python dependencies
pip install click openai requests pydantic neo4j python-dotenv

# Install Node.js dependencies
npm install

# Install GraphQL service dependencies
cd graphql-service
npm install
cd ..
```

### 4. Start Backend Services
```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh

# Start all services with one command
./scripts/dev-start.sh
```

This will start:
- GraphQL service on http://localhost:8080
- Admin UI on http://localhost:3001 (if available)

### 5. Verify Everything Works
```bash
# Run health check
./scripts/health-check.sh

# Or test manually
python chirality_cli.py health-check
curl http://localhost:8080/health
```

✅ **If all checks pass, you're ready to use the Chirality Framework!**

## Manual Setup (Alternative)

If you prefer to start services manually or the automated script doesn't work:

### Start GraphQL Service
```bash
# Terminal 1
cd graphql-service
npm run dev
# Service will run on http://localhost:8080
```

### Start Admin UI (Optional)
```bash
# Terminal 2
cd chirality-admin
npm install  # First time only
npm run dev
# UI will run on http://localhost:3001
```

### Verify Services
```bash
# Terminal 3
python chirality_cli.py health-check
```

## Using the Backend Services

### Available Services

| Service | Port | Purpose | Required |
|---------|------|---------|----------|
| GraphQL Service | 8080 | Primary data API, Neo4j integration | Yes |
| Admin UI | 3001 | Web interface for backend operations | No |
| Python CLI | N/A | Command-line semantic operations | Yes |
| REST API | 3000 | Legacy API endpoints | No |

### 1. Python CLI Tools 📋

#### Main CLI (`chirality_cli.py`)
```bash
python3 chirality_cli.py push-axioms      # Initialize with problem/decision matrices
python3 chirality_cli.py generate-c       # Generate Requirements matrix (A*B=C)
python3 chirality_cli.py generate-f       # Generate Objectives matrix (J*C=F)
python3 chirality_cli.py generate-d       # Generate Solution matrix (A+F=D)
python3 chirality_cli.py verify-stages    # Verify all matrix operations
```

#### Database Admin (`neo4j_admin.py`)
```bash
python3 neo4j_admin.py list                           # List all components
python3 neo4j_admin.py delete --id <component_id>     # Delete specific component
python3 neo4j_admin.py delete-station --station <name> # Delete all at station
```

### 2. GraphQL API 🌐

**Endpoint:** http://localhost:8080/graphql

#### Query Examples:
```bash
# List components
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ components { id name } }"}'

# Get cells for a component
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ components(where: {name: \"C\"}) { cells { row column content } } }"}'

# Interactive GraphQL Playground
open http://localhost:8080/graphql
```

### 3. Admin Web UI 💻

**URL:** http://localhost:3001 (optional)

#### Features:
- Visual matrix exploration
- CLI operation triggers through web interface
- Real-time operation monitoring
- Pipeline console for watching CLI output

To start: `cd chirality-admin && npm run dev`

### 4. REST API Endpoints 🔗

**Base:** http://localhost:3000/api

#### Key Endpoints:
```bash
# Health check
curl http://localhost:3000/api/healthz

# Neo4j operations
curl -X POST http://localhost:3000/api/neo4j/ping
curl -X POST http://localhost:3000/api/neo4j/query

# Matrix operations
curl -X POST http://localhost:3000/api/chat/matrices
```

### 5. Testing & Development Tools 🧪

#### Smoke Tests:
```bash
npm run smoke:rest    # Test REST endpoints
npm run smoke:gql     # Test GraphQL endpoints
npm run smoke         # Test both
```

#### Benchmarking:
```bash
npm run bench         # Performance benchmarks
npm run bench:fast    # Quick benchmark
npm run bench:heavy   # Intensive benchmark
```

#### Health Checks:
```bash
./scripts/health-check.sh    # Comprehensive health check
./scripts/validate-env.sh    # Environment validation
```

### 6. Development Scripts ⚙️

```bash
./scripts/dev-start.sh     # Start all services
./scripts/dev-stop.sh      # Stop all services  
./scripts/dev-status.sh    # Check service status
```

### Recommended Workflow

1. **Start with CLI operations** to generate semantic matrices
2. **Use GraphQL API** for querying and data exploration
3. **Try Admin UI** for visual matrix inspection (optional)
4. **Run tests** to verify everything works correctly

## Stopping Services

### Using Script
```bash
./scripts/dev-stop.sh
```

### Manual Stop
- Press `Ctrl+C` in each terminal running a service
- Or kill specific ports:
```bash
lsof -ti :8080 | xargs kill -9  # Stop GraphQL
lsof -ti :3001 | xargs kill -9  # Stop Admin UI
```

## Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Check what's using the port
lsof -i :8080

# Kill the process
lsof -ti :8080 | xargs kill -9
```

**Neo4j Connection Failed:**
```bash
# Test connection
python -c "
from neo4j import GraphDatabase
import os
driver = GraphDatabase.driver(
    os.getenv('NEO4J_URI'),
    auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD'))
)
driver.verify_connectivity()
print('Connected successfully!')
"
```

**Missing Dependencies:**
```bash
# Reinstall Python dependencies
pip install -e .

# Reinstall Node dependencies
rm -rf node_modules package-lock.json
npm install
```

For more detailed troubleshooting, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Next Steps

Now that your backend is running:

1. **For Development**: Read [CONTRIBUTING.md](CONTRIBUTING.md) to start contributing
2. **For API Usage**: See [docs/API_REFERENCE.md](docs/API_REFERENCE.md) for complete API documentation
3. **For Architecture**: Review [docs/adr/](docs/adr/) for architecture decisions
4. **For Chat Interface**: Clone the [Chirality-chat](https://github.com/sgttomas/Chirality-chat) repository

## Additional Resources

- **Development Workflow**: [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md)
- **Backend Development**: [CLAUDE_BACKEND.md](CLAUDE_BACKEND.md)
- **CLI Development**: [CLAUDE_CLI.md](CLAUDE_CLI.md)
- **GraphQL Development**: [CLAUDE_GRAPHQL.md](CLAUDE_GRAPHQL.md)

## Getting Help

If you encounter issues:

1. Run `./scripts/health-check.sh` for diagnostics
2. Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
3. Search existing GitHub issues
4. Create a new issue with:
   - Output of health check
   - Error messages
   - Steps to reproduce
   - Your environment (OS, versions)

---

**Ready to build?** The backend services are now running and ready for development or to support the Chirality chat interface!

## Split-Apps Architecture Context

This repository is part of a split-apps architecture:

### Directory Structure
```
/Users/ryan/Desktop/ai-env
├── chirality-ai/                    # Orchestrator repo (compose, desktop, docs)
│   ├── compose/                     # Docker Compose services (Neo4j, GraphQL, Admin)
│   └── desktop/                     # Future Electron wrapper
├── chirality-ai-app/               # Product frontend (Next.js)
├── chirality-ai-backend/            # Product backend (GraphQL + Admin)
├── chirality-semantic-framework/   # Independent full app (this repo)
└── chirality-chat/                 # Independent sandbox app
```

### Related Applications
- **Product App**: Use Docker Compose services from `chirality-ai/compose/`
- **Chat Interface**: Available in separate `chirality-chat` repository
- **Shared Backend**: This framework can connect to the unified backend services

### Using with Shared Backend
To use this framework with the shared backend services:

```bash
# Start shared backend services
cd ../chirality-ai/compose
docker compose up -d

# This framework will connect to:
# - Neo4j: localhost:7474 (HTTP), localhost:7687 (Bolt)
# - GraphQL: localhost:8080
# - Admin: localhost:3001
```