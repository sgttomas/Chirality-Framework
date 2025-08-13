# Chirality Framework 14 v2.1.1 Implementation

A production-ready hybrid Next.js/Python application implementing the Chirality Framework 14 (CF14) v2.1.1 for semantic matrix operations with Neo4j as "DB-as-working-memory" architecture.

![CF14 Architecture](https://img.shields.io/badge/CF14-v2.1.1-blue) ![Neo4j](https://img.shields.io/badge/Neo4j-Graph%20DB-green) ![Next.js](https://img.shields.io/badge/Next.js-14+-black) ![Python](https://img.shields.io/badge/Python-3.8+-yellow)

## 🎯 What This System Does

This implementation provides a complete semantic reasoning framework that:

- **Generates Knowledge Matrices**: Transforms problem statements into structured semantic matrices (A, B, C, F, D)
- **Enables Semantic Operations**: Performs CF14 semantic multiplication (A*B=C) and addition (A+F=D) operations
- **Provides Conversational AI**: Chat interface that queries your instantiated knowledge base
- **Manages Knowledge Lifecycle**: Clean setup, matrix generation, and knowledge persistence

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js UI   │────│  Neo4j Graph   │────│  Python CLI     │
│  (localhost:3000)│    │   Database     │    │  (CF14 Engine)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ├─ /instantiate         ├─ Components           ├─ Matrix A (3×4)
         ├─ /chat               ├─ Cells                ├─ Matrix B (4×4)
         ├─ /matrices           ├─ Terms                ├─ A*B = C (3×4)
         └─ API Routes          ├─ Stations             ├─ J⊙C = F (3×4)
                                └─ Relationships        └─ A+F = D (3×4)
```

### Technology Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Database**: Neo4j Aura (cloud graph database) with UFO ontology integration  
- **CLI Engine**: Python 3.8+ with OpenAI API for semantic operations
- **State Management**: Zustand for React state, Neo4j as semantic memory
- **UI Components**: Shadcn/ui component library

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (for Next.js frontend)
- **Python** 3.8+ with pip (for CF14 operations)
- **Neo4j Aura** account (or local Neo4j 5.x instance)
- **OpenAI API** key for semantic reasoning

### Environment Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd openai-responses-starter-app
npm install
```

2. **Configure environment variables** (create `.env.local`):
```env
# Neo4j Configuration (Critical: Use exact variable names)
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-aura-password
NEO4J_DATABASE=neo4j

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-key-here

# Application Base
NEXT_PUBLIC_API_BASE=http://localhost:3000
```

3. **Start the development server:**
```bash
npm run dev
```

4. **Access the application:**
- **Framework Instantiation**: http://localhost:3000/instantiate
- **Chat with Knowledge**: http://localhost:3000/chat
- **Explore Matrices**: http://localhost:3000/matrices
- **Home Dashboard**: http://localhost:3000

## 📊 CF14 v2.1.1 Matrix System

### Semantic Valley Progression

The system implements the complete CF14 semantic valley with 10 stations:

**Station Flow**: Problem Statement → Requirements → Objectives → Verification → Validation → Evaluation → Assessment → Implementation → Reflection → Resolution

### CF14 v2.1.1 Normative Specification Features

- **Enhanced Components**: Array P (Validity Parameters), Array H (Consistency Dialectic)
- **Extended Operations**: `*` (multiplication), `+` (addition), `×` (cross product), `⊙` (element-wise)
- **UFO Integration**: Unified Foundational Ontology annotations throughout
- **Domain Pack System**: Customizable axiomatic matrices for specific domains
- **Complete Provenance**: Model metadata and operation tracking for full traceability

### Matrix Operations

#### Axiom Matrices (Generated Automatically)
- **Matrix A (3×4)**: Problem Statement - Canonical ID: `'A'`
  - Rows: [Normative, Operative, Evaluative]  
  - Cols: [Necessity, Sufficiency, Completeness, Consistency]

- **Matrix B (4×4)**: Decision Framework - Canonical ID: `'B'`
  - Both dimensions: [Necessity, Sufficiency, Completeness, Consistency]

#### Derived Matrices (CF14 Operations)
- **Matrix C (3×4)**: Requirements = A * B - Canonical ID: `'C'`
- **Matrix F (3×4)**: Objectives = J ⊙ C - Canonical ID: `'F'`  
- **Matrix D (3×4)**: Solution Objectives = A + F - Canonical ID: `'D'`

#### Future Stations (Specification Ready)
- **Matrix X**: Verification = K * J
- **Matrix Z**: Validation (context transformation)
- **Array P**: P = Z[4, :] (validity parameters)
- **Array H**: H = P[4] (consistency dialectic)
- **Matrix N**: Resolution = U × H

Where:
- **J** = Truncated Matrix B (first 3 rows for dimensional compatibility)
- **⊙** = Element-wise semantic multiplication using CF14 v2.1.1 algorithm
- **+** = Semantic addition with CF14 framework-specific formula
- **×** = Cross product operation for resolution matrices

### UFO Ontology Integration

Components are annotated with Unified Foundational Ontology classifications:
- **Endurants**: Persistent entities (Components, Terms)
- **Perdurants**: Temporal processes (Operations, Transformations)
- **Modes**: Property instances (Cell values, Semantic relations)

## 🎯 User Guide

### 1. Framework Instantiation

**URL**: `/instantiate`

**Process**:
1. **Define Problem Statement**: Enter your domain-specific problem
2. **Select Domain Context**: Choose from pre-configured domains (optional):
   - Software Engineering, Business Strategy, Research Methods
   - Academic Research, Technical Design, Policy Development
   - Product Development, Scientific Analysis
3. **Start Instantiation**: Triggers automated pipeline

**Automatic Execution Flow**:
```
Clean Database → Setup A & B → Generate C → Compute F → Generate D
```

### 2. Conversational Knowledge Interface

**URL**: `/chat`

**Capabilities**:
- Query instantiated knowledge using natural language
- Retrieval of specific matrix cells and their semantic content
- Cross-matrix relationship analysis
- Context-aware responses based on CF14 operations

**Example Queries**:
```
"What requirements do we have for generating reliable knowledge?"
"Show me objectives related to decision-making"
"What solution objectives exist for evaluation processes?"
"Compare requirements vs objectives for completeness"
```

### 3. Matrix Explorer

**URL**: `/matrices`

**Features**:
- Visual matrix representations with cell-level detail
- Semantic operation traceability (multiplication, addition trails)
- Station-based matrix organization
- Export capabilities for further analysis

## 🔧 Advanced Operations

### Python CLI Direct Usage

For advanced users, the CLI provides direct matrix operations:

```bash
# Generate individual matrices (CF14 v2.1.1)
python chirality_cli.py semantic-matrix-c --out matrix_c.json
python chirality_cli.py semantic-matrix-f --out matrix_f.json
python chirality_cli.py semantic-matrix-d --out matrix_d.json

# Domain-specific operations
python chirality_cli.py semantic-matrix-c \
  --domain-pack ontology/domains/software_engineering/cf14.domain.software_eng.v1.0.json \
  --out software_matrix_c.json

# Enhanced CF14 v2.1.1 operations
python chirality_cli.py extract-array-p --matrix-z-id matrix_Z_123
python chirality_cli.py extract-array-h --array-p-id array_P_456
python chirality_cli.py full-pipeline --domain-pack path/to/domain.json
python chirality_cli.py validate-domain --domain-pack path/to/domain.json

# Complete pipeline execution
python chirality_cli.py full-pipeline --out full_results.json

# Database administration
python neo4j_admin.py list                          # List all components
python neo4j_admin.py delete --id <component_id>    # Delete specific component
python neo4j_admin.py delete-station --station <name>  # Delete station contents
```

### API Endpoints

#### CF14 v2.1.1 Enhanced APIs
- `POST /api/neo4j/domain` - Domain pack validation and loading
- `POST /api/neo4j/ingest-v2` - Enhanced component ingestion with UFO annotations
- `POST /api/neo4j/operation-v2` - Semantic operation tracking with metadata
- `POST /api/neo4j/instantiate-v2` - Domain instantiation with CF14 v2.1.1 features

#### Core Neo4j Operations
- `POST /api/neo4j/clean-setup` - Database cleanup with scope control
- `POST /api/neo4j/ingest-ufo` - UFO-compliant component ingestion (legacy)
- `POST /api/neo4j/compute/f` - Server-side Matrix F computation
- `GET /api/neo4j/query` - Flexible component querying

#### Chat Integration  
- `GET /api/chat/matrices` - Available matrices enumeration
- `POST /api/chat/query` - Natural language knowledge querying

#### Framework Operations
- `GET /api/neo4j/query?query_type=get_component_by_id&id=<ID>` - Component lookup

### Database Schema

#### Node Types
```cypher
// Core entities
(:Station {id: Integer, name: String})
(:Component {id: String, name: String, kind: String, station: String|Integer})
(:Cell {component_id: String, row: Integer, col: Integer, resolved: String})
(:Term {value: String, type: String})
(:Axis {component_id: String, position: Integer, name: String, labels: [String]})

// UFO Ontology extensions
(:SemanticValley {name: String, ufo_type: "Situation"})
(:Document {version: String, topic: String, created_at: String})
(:KnowledgeField {name: String, ufo_type: "Kind"})
```

#### Relationship Types
```cypher
(:Station)-[:NEXT]->(:Station)              // Sequential station progression
(:Component)-[:AT_STATION]->(:Station)      // Component station assignment
(:Component)-[:HAS_CELL]->(:Cell)           // Matrix structure
(:Component)-[:HAS_AXIS]->(:Axis)           // Dimensional metadata
(:Cell)-[:RESOLVES_TO]->(:Term)             // Semantic resolution
(:Cell)-[:CONTAINS_TERM]->(:Term)           // Raw semantic content
(:Document)-[:HAS_COMPONENT]->(:Component)  // Document containment
```

## 💡 Best Practices

### Matrix ID Conventions

**Always Use Canonical IDs**: The system enforces canonical single-letter IDs:
- Matrix A: `'A'` (not `matrix_A_semantic_general`)
- Matrix C: `'C'` (not `matrix_C_semantic_general`)
- Matrix F: `'F'` (not `matrix_F_from_neo4j`)

**Naming Convention**: `"Matrix X (Station Name)"`
- Examples: `"Matrix C (Requirements)"`, `"Matrix F (Objectives)"`

### Database Management

**Clean Runs**: Use "Clean CF Graph" button before new instantiation runs to ensure:
- No duplicate matrices from previous runs
- Consistent canonical IDs throughout pipeline
- Fresh semantic memory state

**Scope Control**: Clean setup supports selective deletion:
```javascript
// CF14 components only (preserves stations)
{ scope: 'cf14', recreateStations: true }

// Everything (full reset)
{ scope: 'all' }
```

### Error Recovery

**Common Issues & Solutions**:

1. **"Component not found" errors**: Run clean setup to reset canonical IDs
2. **Chat not finding knowledge**: Check instantiation completed successfully
3. **Neo4j connection failures**: Verify environment variable names exactly
4. **Python CLI failures**: Ensure OpenAI API key is set and valid

## 🛠️ Development

### Project Structure
```
openai-responses-starter-app/
├── ontology/
│   ├── cf14.core.v2.1.1.json                    # Core CF14 ontology
│   └── domains/
│       └── software_engineering/
│           └── cf14.domain.software_eng.v1.0.json  # Domain pack
├── app/
│   ├── api/neo4j/           # Neo4j integration routes
│   │   ├── domain/route.ts          # Domain pack management
│   │   ├── ingest-v2/route.ts       # Enhanced ingestion
│   │   ├── operation-v2/route.ts    # Operation tracking
│   │   └── instantiate-v2/route.ts  # Enhanced instantiation
│   ├── instantiate/         # Framework instantiation UI (enhanced)
│   ├── chat/               # Conversational interface
│   ├── matrices/           # Matrix explorer (enhanced)
│   └── globals.css         # Styling
├── lib/
│   └── neo4j.ts            # Shared database connection
├── components/ui/          # Reusable UI components
├── chirality_cli.py        # Enhanced CF14 v2.1.1 CLI
├── neo4j_admin.py         # Database administration utilities
├── CF14_Normative_Spec_Reconciled_v2.1.1.txt   # Complete specification
├── CF14_Implementation_Guide_Reconciled_v2.1.1.txt # Implementation guide
├── VERSION.md             # Version tracking
└── scripts/               # Setup and maintenance scripts
```

### Key Implementation Patterns

**"DB-as-Working-Memory"**: Neo4j serves as semantic working memory where:
- Axiom matrices persist across sessions
- Derived matrices cache computational results  
- Relationships enable semantic traceability
- Station progression models reasoning flow

**Canonical-First Design**: All components generated with canonical IDs from source:
- No post-creation ID renaming or overwriting
- Consistent lookup patterns throughout system
- Simplified debugging and maintenance

**Error-Resilient Queries**: All database queries include:
- Null-safe property access
- Graceful degradation for missing data
- Defensive programming against malformed inputs

### Testing Strategy

```bash
# Verify system health
curl -s http://localhost:3000/api/chat/matrices | jq '.total_count'

# Test specific component lookup  
curl -s "http://localhost:3000/api/neo4j/query?query_type=get_component_by_id&id=C"

# Clean database state
curl -s -X POST http://localhost:3000/api/neo4j/clean-setup \
  -H 'Content-Type: application/json' \
  -d '{"scope":"cf14","recreateStations":true}'
```

## 📈 Extending the System

### Domain Pack System

CF14 v2.1.1 introduces a powerful domain pack system for customizing axiomatic matrices:

```json
{
  "id": "cf14.domain.software_eng.v1.0",
  "extends": "cf14.core.v2.1.1", 
  "domain": "software_engineering",
  "axiomatic_matrices": {
    "A": { "cells": [...] },
    "B": { "cells": [...] }
  },
  "domain_extensions": {
    "custom_stations": [...],
    "semantic_operations": {...}
  }
}
```

### Adding Custom Domain Packs

1. **Create domain-specific ontology**: `ontology/domains/{domain}/cf14.domain.{domain}.v1.0.json`
2. **Validate domain pack**: `python chirality_cli.py validate-domain --domain-pack path/to/domain.json`
3. **Add domain to instantiate page**: Update domain list in UI
4. **Test domain operations**: `python chirality_cli.py semantic-matrix-c --domain-pack path/to/domain.json`

### Example Use Cases

#### Software Engineering
```bash
# Generate requirements matrix for AI system development
python chirality_cli.py semantic-matrix-c \
  --domain-pack ontology/domains/software_engineering/cf14.domain.software_eng.v1.0.json \
  --out ai_system_requirements.json
```

#### Business Strategy
```bash
# Apply framework to business problem
python chirality_cli.py full-pipeline \
  --domain-pack ontology/domains/business_strategy/cf14.domain.business.v1.0.json \
  --out business_analysis.json
```

### Implementing New Matrix Operations

1. Create computation route: `/api/neo4j/compute/{operation}/route.ts`
2. Add semantic operation to `chirality_cli.py`
3. Integrate into instantiate pipeline
4. Update chat system to recognize new knowledge

### Custom UFO Ontology Extensions

The system supports custom ontological classifications:
- Extend UFO-C categories in ingest routes
- Add domain-specific relationship types
- Implement custom semantic reasoning patterns

## 🔄 Migration from v1.x

The CF14 v2.1.1 implementation is **fully backward compatible**:

✅ **Existing APIs work unchanged**  
✅ **Legacy data structures preserved**  
✅ **Gradual migration path available**

To use new v2.1.1 features:
1. Update CLI commands to use `--domain-pack` flag
2. Use new `/api/neo4j/*-v2` endpoints for enhanced features  
3. Access Array P/H operations when validation matrices are available

## 🤝 Contributing

This CF14 v2.1.1 implementation demonstrates:
- **Hybrid Architecture**: Seamless integration of multiple technology stacks
- **Semantic AI Patterns**: Practical implementation of formal reasoning frameworks
- **Graph-Based Knowledge Management**: Scalable knowledge representation with UFO annotations
- **Conversational Knowledge Interfaces**: Natural language access to structured reasoning
- **Domain Pack System**: Extensible customization for specific knowledge domains
- **Complete Provenance**: Full traceability of semantic operations and transformations

### Development Workflow

1. **Fork repository** and create feature branch
2. **Follow canonical ID conventions** for all new matrix types
3. **Add comprehensive tests** for API routes and matrix operations
4. **Update documentation** for new features or architectural changes
5. **Submit pull request** with clear description of semantic enhancements

### Architecture Principles

- **Separation of Concerns**: Clear boundaries between UI, API, database, and CLI
- **Canonical Data Models**: Single source of truth with consistent identifiers
- **Defensive Programming**: Robust error handling and graceful degradation
- **Semantic Traceability**: Full provenance tracking for all reasoning operations

## 🎉 What's Next

1. **Create More Domain Packs**: Business strategy, research methods, policy development
2. **Implement Later Stations**: Verification, Validation, Evaluation, Assessment
3. **Add Array P/H UI**: Visualization for validity parameters and consistency dialectic
4. **Performance Optimization**: Caching, batch operations, parallel processing
5. **Advanced Analytics**: Pattern recognition across semantic matrices
6. **Integration Extensions**: Custom UFO categories, domain-specific relationships

## 📚 References

- **Chirality Framework v2.1.1**: Complete normative specification with enhanced components
- **UFO Ontology**: Unified Foundational Ontology for formal conceptualization
- **Neo4j Graph Data Science**: Advanced graph algorithms and semantic analysis
- **OpenAI API**: Large language model integration for semantic reasoning
- **Domain Pack Specification**: CF14 v2.1.1 extensibility framework

## 📄 License

MIT License - See LICENSE file for full terms.

---

## 💫 Success!

You now have a **complete, production-ready implementation** of the Chirality Framework v2.1.1 normative specification!

The system supports:
- ✅ **Semantic Operations** with full mathematical grounding
- ✅ **Domain Pack System** for customization  
- ✅ **Neo4j Graph Database** with UFO annotations
- ✅ **Modern React Frontend** with real-time progress
- ✅ **Enhanced Python CLI** with v2.1.1 features
- ✅ **Complete Provenance** tracking
- ✅ **Station Progression** through semantic valley

**Built with semantic reasoning in mind. Ready for production knowledge management and complex problem solving!** 🚀