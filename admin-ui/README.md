# Chirality Framework - Admin UI

A complete backend admin interface for the Chirality Framework Phase-1 canonical pipeline.

## Features

### 🗺️ Matrix Explorer
- Visual grid of cells showing stage completion
- Color-coded stage indicators (axiom → context_loaded → product → sum → interpretation → final_resolved)
- Row/column selectors with live refresh
- One-click drill into Cell Inspector

### 🔍 Cell Inspector
- Complete stage timeline for any cell
- Prompt hash, model ID, latency tracking
- Ontology context (station/matrix/cell level)
- Retry individual stages or rebuild entire cell
- UFO proposal integration

### 🚀 Pipeline Console
- Run any CLI command (push-axioms, generate-c/f/d, verify-stages)
- Live log streaming with structured JSON events
- Dry-run support and stop-on-error
- Real-time statistics (success rate, avg latency, dedupe count)

### 🎯 UFO Claims Desk *(Coming Soon)*
- View all proposed UFO claims
- Adjudicate with Accept/Reject/Supersede
- Evidence viewer with LLM output traces
- Confidence scoring and relationship types

### 📝 Prompt Studio
- View canonical system prompt with version hash
- Preview user prompts with live context
- Temperature and model configuration display
- Template library reference

## Quick Start

1. **Install dependencies:**
   ```bash
   cd admin-ui
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Set your GraphQL endpoint (defaults to localhost:8080)
   export NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/graphql
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to `http://localhost:3001`

## Architecture

### Frontend Stack
- **Next.js 14** - React framework with API routes
- **Apollo Client** - GraphQL client with caching
- **Ant Design** - UI components and layout
- **TypeScript** - Type safety

### Backend Integration
- **GraphQL Queries** - Direct connection to your `graphql-service`
- **REST Orchestrator** - Shells out to `chirality_cli.py` for pipeline runs
- **Server-Sent Events** - Live log streaming during operations

### Data Flow
```
UI → Apollo → GraphQL Service → Neo4j
UI → REST API → Python CLI → GraphQL Service → Neo4j
```

## Key Components

### Matrix Explorer (`/components/MatrixExplorer.tsx`)
- Fetches cell previews via `CELL_PREVIEW` query
- Renders grid with stage colors and labels
- Opens Cell Inspector modals

### Cell Inspector (`/components/CellInspector.tsx`)
- Uses `CELL_INSPECTOR` query for rich cell data
- Timeline view of all stages with trace metadata
- Retry and rebuild buttons that call orchestrator

### Pipeline Console (`/components/PipelineConsole.tsx`)
- Form builder for CLI arguments
- POST to `/api/orchestrate/run` to start jobs
- SSE connection to `/api/orchestrate/logs/:jobId` for live output

### Orchestrator API (`/pages/api/orchestrate/`)
- `run.ts` - Spawns Python CLI processes safely
- `logs/[jobId].ts` - Streams process output via SSE
- Job management with in-memory store (use Redis in production)

## Configuration

### Environment Variables
```bash
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/graphql
```

### GraphQL Schema Requirements
The UI expects these queries to be available:
- `pullCell(station, matrix, row, col, includeOntologies)`
- `ufoClaims(status, minConfidence, first)`
- `proposeUFOClaim(input)`
- `adjudicateUFOClaim(id, status, note)`

### CLI Integration
The orchestrator expects `chirality_cli.py` to be in the parent directory:
```
project/
├── admin-ui/          # This UI
├── chirality_cli.py   # Main CLI
├── chirality_graphql.py
├── semmul_cf14.py
└── ...
```

## Security & Production

### RBAC (To Implement)
- **Viewer** - Read-only access to Matrix Explorer and Cell Inspector
- **Operator** - Can run pipelines and retry stages
- **Curator** - Can adjudicate UFO claims
- **Architect** - Can modify prompts and model settings

### Production Considerations
- Replace in-memory job store with Redis
- Add authentication middleware
- Rate limiting on orchestrator endpoints
- Audit logging for all manual actions
- Error monitoring and alerting

## Valley Metaphor Integration

The UI preserves the semantic valley metaphor throughout:
- Valley summary banner on every page: "Semantic Valley: Problem Statement → [Requirements] → Objectives → Solution Objectives"
- Current station shown in brackets
- Row/column labels displayed as "rowLabel × colLabel"
- Ontology CURIEs shown as clickable chips with definitions
- All prompts maintain valley context

## Development

### Adding New Pages
1. Create component in `/components/`
2. Add to menu in `/pages/index.tsx`
3. Update routing logic

### GraphQL Schema Changes
1. Update queries in `/lib/queries.ts`
2. Regenerate types if using codegen
3. Update component props accordingly

### New CLI Commands
1. Add to whitelist in `/pages/api/orchestrate/run.ts`
2. Update form options in `PipelineConsole.tsx`
3. Handle new log events in UI

This UI provides complete visibility and control over your Chirality Framework pipeline while preserving the semantic fidelity and valley metaphor of your backend.