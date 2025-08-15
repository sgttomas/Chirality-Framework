# Chirality Framework 14 v2.1.1 Implementation

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![CF14](https://img.shields.io/badge/CF14-v2.1.1-blue)
![NextJS](https://img.shields.io/badge/Built_with-NextJS_14-black)
![Python](https://img.shields.io/badge/Python-3.8+-yellow)
![Neo4j](https://img.shields.io/badge/Neo4j-Graph_DB-green)
![OpenAI API](https://img.shields.io/badge/Powered_by-OpenAI_API-orange)
![Production Ready](https://img.shields.io/badge/Status-Production_Ready-success)

A complete, production-ready implementation of the **Chirality Framework 14 (CF14) v2.1.1** normative specification. This repository contains the core semantic engine, GraphQL service, and framework APIs. The chat interface is now available as a separate application at [Chirality-chat](https://github.com/sgttomas/Chirality-chat).

> **New in v2.1.1**: Domain pack system, Array P/H operations, enhanced UFO ontology integration, and complete backward compatibility with v1.x implementations.

## 📦 Repository Organization

This project is now organized as a **polyrepo architecture**:

- **[Chirality-Framework](https://github.com/sgttomas/Chirality-Framework)** (this repo): Core semantic engine, GraphQL service, Python CLI tools
- **[Chirality-chat](https://github.com/sgttomas/Chirality-chat)**: Modern chat interface with streaming AI responses, matrix visualization, and MCP integration

This separation enables:
- Independent deployment and scaling of frontend and backend
- Cleaner separation of concerns
- Easier contribution and maintenance
- Multiple frontend implementations using the same core framework

## 🎯 What This System Does

- **🧠 Semantic Reasoning**: Transforms problem statements into structured CF14 semantic matrices (A, B, C, F, D)
- **🏗️ Knowledge Architecture**: Creates persistent semantic representations in Neo4j with UFO ontology annotations
- **💬 Conversational AI**: Natural language interface to query instantiated knowledge with context-aware responses
- **📊 Visual "Semanti Matrix Operations"**: Interactive matrix visualization with computational semantic operation traceability
- **🛠️ Domain Customization**: Extensible domain pack system for specialized knowledge domains
- **⚡ CLI Automation**: Enhanced Python CLI with v2.1.1 features for batch operations and pipeline automation
- **🔍 Array P/H Analysis**: Advanced validity parameters and consistency dialectic extraction

### 📐 Two-Phase Framework Flow

The Chirality Framework operates in two distinct phases:

- **Phase 1 (Initialization)**: At system boot-up, the framework constructs a canonical, model-agnostic, and abstract version of the Chirality Framework. This phase is entirely independent of any specific problem or user context, and serves as the normative reference implementation for all subsequent instantiations.
- **Phase 2 (Instantiation)**: When a concrete problem is presented, the canonical abstract framework is instantiated in the context of that specific problem. This involves semantic transformation of the framework’s components, one cell at a time, to reflect the meaning and requirements of the problem domain.

## 🏗️ Core Features

### CF14 v2.1.1 Normative Specification
- ✅ **10-Station Semantic Valley**: Problem Statement → Requirements → Objectives → ... → Resolution
- ✅ **Enhanced Components**: Array P (Validity Parameters), Array H (Consistency Dialectic)
- ✅ **Semantic Operations**: `*` (multiplication), `+` (addition), `×` (cross product), `⊙` (element-wise)
- ✅ **Complete Provenance**: Full operation tracking with metadata preservation

### Domain Pack System
- 🎯 **Customizable Axioms**: Domain-specific Matrix A and B definitions
- 🎯 **Extensible Ontologies**: Custom UFO categories and semantic operations
- 🎯 **Validation Framework**: Built-in domain pack validation and testing
- 🎯 **Pre-built Domains**: Software engineering, business strategy, research methods

### Production Architecture
- 🏛️ **Hybrid Design**: Next.js frontend + Enhanced Python CLI + Neo4j backend
- 🏛️ **DB-as-Working-Memory**: Neo4j serves as persistent semantic reasoning context
- 🏛️ **Real-time Operations**: Live matrix generation with progress tracking
- 🏛️ **Backward Compatibility**: Full support for v1.x APIs and data structures

## 🚀 Quick Start

> **Note**: This repository now focuses on the core framework and GraphQL service. For the chat interface, please visit [Chirality-chat](https://github.com/sgttomas/Chirality-chat).

### Prerequisites

- **Node.js** 18+ and npm (for GraphQL service and API)
- **Python** 3.8+ with pip (for CF14 semantic engine)
- **Neo4j Aura** account or local Neo4j 5.x instance
- **OpenAI API** key with sufficient credits
- **4GB RAM** minimum (8GB recommended for large matrices)
- **Broadband connection** for Neo4j Aura and OpenAI API access

⚠️ The framework requires a valid `OPENAI_API_KEY` for all semantic operations; if the key is missing, the process will exit rather than fallback to join-only.

### Environment Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd chirality-semantic-framework
   ```

2. **Install dependencies:**
   ```bash
   npm install
   pip install click openai requests pydantic neo4j python-dotenv
   ```

3. **Configure environment variables:**
   
   Create `.env.local` with exact variable names:
   ```env
   # Neo4j Configuration (Critical: Use NEO4J_USER not NEO4J_USERNAME)
   NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-aura-password
   NEO4J_DATABASE=neo4j
   
   # OpenAI Configuration
   OPENAI_API_KEY=sk-proj-your-api-key
   
   # Application Settings
   NEXT_PUBLIC_API_BASE=http://localhost:3000
   
   # CF14 v2.1.1 Features (optional)
   CF14_VERSION=2.1.1
   CF14_ENABLE_ARRAY_PH=true
   CF14_LEGACY_API_SUPPORT=true
   ```

4. **Start the GraphQL service:**
   ```bash
   # Start GraphQL service
   cd graphql-service
   npm install
   npm run dev  # Runs on http://localhost:8080/graphql
   ```

5. **For the chat interface:**
   ```bash
   # Clone and run the Chirality-chat application
   git clone https://github.com/sgttomas/Chirality-chat.git
   cd Chirality-chat
   npm install
   npm run dev  # Runs on http://localhost:3000
   ```

### Basic Usage

#### Using the Chat Interface (via Chirality-chat repo)
1. **🎯 Instantiate Knowledge**: Visit `http://localhost:3000` 
   - Enter your problem statement
   - Provide a knowledge domain or additionl context
   - The python prompt-based semantic kernel will generate a constrained set of categories related to the problem
   - This is sent to Neo4j database in real time.

#### Using the GraphQL Service (http://localhost:8080/graphql)
- Query the chat interface about your problem
- semantic matrices and components are the seeds from which the topic and problem statement will sprout information within the context of that unique cell
- Execute CF14 operations all still in the Python CLI
- Access Neo4j knowledge graph directly for working memory of the semantic operations
- Output the contextual information in JSON format (contract in the code will be developed but functions)

#### Using the Chat Interface (via Chirality-chat repo)
1. **🎯 Receive solution statement: Visit `http://localhost:3000` 
   - Python backend receives the JSON output from the working memory and this is used as an addition to a system prompt to the LLM Chat bot
   - If part of structured workflows the set of answers will be constrained further (maybe in a good way as each instance becomes more accurate but narrow minded)
   - Chat with the AI about Chirality Framework concepts
   - Latency will be noticeable, but this is more of an agentic framework than a basic chat experience

2. **📊 Matrix Operations**: Visit `http://localhost:3000/matrix`
   - View stored matrices from Neo4j
   - Explore semantic relationships
   - Navigate the knowledge graph 

### CLI Operations

#### Phase 1 / Phase 2 Commands
```bash
# Phase 1 – Canonical initialization (abstract form)
python chirality_cli.py semantic-init --model gpt-5 --out cf14_abstract.json

# Phase 2 – Context-specific instantiation
python chirality_cli.py semantic-iv --problem-statement "..." --domain-pack ontology/domains/software_engineering/cf14.domain.software_eng.v1.0.json --out cf14_instance.json
```

#### CF14 v2.1.1 Enhanced Commands
```bash
# Generate matrices with domain packs
python chirality_cli.py semantic-matrix-c \
  --domain-pack ontology/domains/software_engineering/cf14.domain.software_eng.v1.0.json \
  --out software_matrix_c.json

# Complete pipeline with domain customization
python chirality_cli.py full-pipeline \
  --domain-pack ontology/domains/business_strategy/cf14.domain.business.v1.0.json \
  --out business_analysis.json

# Domain pack validation
python chirality_cli.py validate-domain \
  --domain-pack ontology/domains/custom_domain/cf14.domain.custom.v1.0.json

# Advanced CF14 v2.1.1 operations
python chirality_cli.py extract-array-p --matrix-z-id matrix_Z_validation
python chirality_cli.py extract-array-h --array-p-id array_P_validity
```

#### Legacy Commands (Still Supported)
```bash
# Basic matrix generation
python chirality_cli.py semantic-matrix-c --out matrix_c.json
python chirality_cli.py full-pipeline --out results.json

# Database administration
python neo4j_admin.py list                    # List components
python neo4j_admin.py delete --id C          # Delete specific matrix
python neo4j_admin.py delete-station --station Requirements
```

## UFO Ontology Alignment

**UFO alignment note**: In this project, "modality" means analysis lens (Systematic, Process, Epistemic, Alethic). This is not UFO's "Mode." We align as follows: Systematic ↔ UFO-C Normative Descriptions; Process ↔ UFO-B Perdurants; Epistemic ↔ UFO-C Information Objects & UFO-A Modes (beliefs/skills); Alethic ↔ logical constraints on Descriptions/Processes. We do not introduce new UFO categories; we annotate UFO-typed elements with modal constraints when needed.

## 📚 Documentation

### Core Documentation
- **[🔧 Operational Help Guide](chirality_cli_HELP.md)** - Comprehensive usage instructions, troubleshooting, and best practices
- **[📋 CF14 v2.1.1 Implementation](README.md)** - The meaning and significance of the Chirality Framework in human-ai knowledge generation

### Technical Specifications
- **[📊 Version Tracking](VERSION.md)** - Release history and version information

### Quick References
- **Domain Pack Examples**: `ontology/domains/` - Pre-built domain customizations
- **API Documentation**: Embedded in help guide with curl examples
- **Troubleshooting**: Common issues and solutions in operational guide

## 🏛️ System Architecture

### CF14 v2.1.1 Polyrepo Architecture
```
┌──────────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chirality-chat     │────│  GraphQL Service│────│  Neo4j Graph   │
│  (separate repo)    │    │  (localhost:8080)│    │   Database     │
│  localhost:3000     │    └─────────────────┘    └─────────────────┘
└──────────────────────┘             │                       │
         │                      ┌────┴────┐              ┌────┴────┐
    ┌────┴────┐                │@neo4j/   │              │Components│
    │Chat UI  │                │graphql   │              │Cells+UFO │
    │Matrix Viz│               │Apollo    │              │Terms     │
    │MCP Tools│                │Yoga      │              │Stations  │
    └─────────┘                └──────────┘              │Provenance│
                                                         │DomainPacks│
┌─────────────────┐                                     └─────────┘
│Enhanced Python │                                           │
│   CLI v2.1.1   │───────────────────────────────────────────┘
│  "Semmul"  Ops │
└─────────────────┘
```

> **Phase 1 is now supported via an Admin Workbench UI (backend only) for developers to run and review the canonical abstract framework before instantiation. No semantics are provided by humans in Phase 1 — all operations follow the normative CF14 construction rules.**

### Key Architectural Patterns
- **📁 Semantic Memory**: Neo4j stores instantiated knowledge with full provenance
- **🔄 Hybrid Processing**: UI triggers Python CLI operations via API routes
- **📊 Real-time Updates**: WebSocket-like progress tracking during matrix generation
- **🎯 Domain Extensibility**: Procedural generation of problem-specific semantics for specialized reasoning
- **✅ Canonical IDs**: Consistent semantic framework components (cells, arrays, matrices, tensors) used as an ontology for constraining thoughts
- **🧠 and easy identification of discrete strings in a specified semantic context for reasoning traces used in reinforcement learning

## 🔧 Technology Stack

### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS with shadcn/ui components
- **State**: Zustand for UI state, Neo4j for semantic memory
- **API**: RESTful routes with enhanced v2.1.1 endpoints

### Database (Neo4j)
- **Platform**: Neo4j Aura (cloud) or local 5.x instance
- **Ontology**: Unified Foundational Ontology (UFO) annotations
- **Schema**: Components, Cells, Terms, Stations with relationships
- **Features**: ACID transactions, Cypher queries, graph algorithms

### Backend (Python)
- **Version**: Python 3.8+ with CF14 v2.1.1 enhancements
- **AI Integration**: OpenAI API for semantic reasoning
- **Libraries**: Click (CLI), Pydantic (validation), Neo4j driver
- **Features**: Domain pack system, Array P/H operations, provenance tracking

### Development Tools
- **Package Management**: npm (Node.js), pip (Python)
- **Version Control**: Git with semantic commit messages
- **Environment**: Docker-ready, supports local and cloud deployment
- **Testing**: Built-in validation, health checks, API testing suite

## Project Structure

```
├── graphql-service/                       # GraphQL Service (New)
│   ├── src/index.ts                      # GraphQL server with Neo4j integration
│   ├── neo4j/schema.cql                  # Neo4j schema definitions
│   └── dist/                             # Compiled GraphQL service
├── src/                                   # Core Application (Refactored)
│   ├── app/                              # Next.js App Router
│   │   ├── api/neo4j/                   # REST API routes
│   │   │   ├── clean-setup/route.ts     # Database management
│   │   │   ├── ingest-v2/route.ts      # Enhanced component ingestion
│   │   │   ├── compute/f/route.ts      # Matrix F computation
│   │   │   └── domain/route.ts         # Domain pack management
│   │   └── test-integrity/              # Testing pages
│   ├── lib/                             # Shared Libraries
│   │   ├── neo4j.ts                    # Database connection
│   │   └── apollo.ts                   # GraphQL client
│   └── graphql/queries/                 # GraphQL query definitions
├── scripts/                              # Testing & Benchmarking (New)
│   ├── smoke-rest.mjs                   # REST API smoke tests
│   ├── smoke-gql.mjs                    # GraphQL smoke tests
│   └── test-matrix.mjs                  # Matrix operation tests
├── bench/                                # Performance Benchmarking (New)
│   └── bench.ts                         # Benchmark suite
├── ontology/                            # CF14 v2.1.1 Domain System
│   ├── cf14.core.v2.1.1.json          # Core framework ontology
│   └── domains/                        # Domain-specific customizations
├── chirality_cli.py                    # Enhanced CF14 v2.1.1 CLI
├── neo4j_admin.py                      # Database administration
├── schema.graphql                      # GraphQL schema definition
└── codegen.ts                          # GraphQL code generation config
├── VERSION.md                           # Version tracking
├── Chirality_cli_README.md             # Architectural documentation
├── chirality_cli_HELP.md               # Operational guide
└── README_CF14_v2.1.1.md              # v2.1.1 features overview
```

## 🤝 Contributing

This is a **production-ready implementation** of the Chirality Framework 14 v2.1.1 normative specification. We welcome contributions that enhance the framework's capabilities:

### Areas for Contribution
- **🎯 Domain Packs**: Create specialized domain ontologies (healthcare, finance, education, etc.)
- **🏗️ Station Extensions**: Implement remaining semantic valley stations (Assessment, Implementation, Reflection)
- **📊 Array P/H UI**: Build visualization for validity parameters and consistency dialectic
- **⚡ Performance**: Optimize semantic operations, caching, and database queries
- **🔧 Integrations**: Add support for other graph databases, LLM providers, or export formats

### Development Guidelines
- Follow canonical ID conventions (A, B, C, F, D)
- Maintain backward compatibility with v1.x APIs
- Include comprehensive tests for new features
- Update documentation for architectural changes
- Use semantic commit messages

### Getting Started
1. Fork the repository
2. Create feature branch: `git checkout -b feature/domain-pack-healthcare`
3. Follow development setup in operational guide
4. Submit pull request with clear description of enhancements

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🎉 Production Status

This implementation is **complete and production-ready** with:

✅ **Full CF14 v2.1.1 Specification**: All normative requirements implemented  
✅ **Domain Pack System**: Extensible customization framework  
✅ **Hybrid Architecture**: Scalable Next.js + Python + Neo4j design  
✅ **Complete Documentation**: Architectural guides and operational procedures  
✅ **Backward Compatibility**: Seamless migration from v1.x implementations  
✅ **Production Deployment**: Ready for enterprise knowledge management  

**Ready to apply the Chirality Framework to solve complex knowledge problems!** 🚀

---

### 📞 Support & Resources

- **📖 Getting Started**: Follow the quick start guide above
- **🔧 Troubleshooting**: See [operational help guide](chirality_cli_HELP.md)
- **🏗️ Architecture**: Review [implementation overview](Chirality_cli_README.md)
- **🐛 Issues**: Report problems via GitHub issues
- **💡 Discussions**: Share ideas and use cases

**Built with semantic reasoning in mind. Transforming problem statements into structured knowledge since 2024.**

## Semantic Integrity Contract (CF14)

**Why this matters** — The Chirality Framework requires a strict, auditable flow from construction to interpretation so each cell is a true "semantic anchor," not a guess or a fallback. We enforce fail-fast semantics rather than silently accepting gibberish or arbitrary string conversions.

### Core Principles
1. **Order of operations is normative**: always do semantic **multiplication** first, then **addition**. Applies to C (A×B), F (J×C), and all later matrices. (CF14: Order of Operations.)  
2. **Two-lens interpretation**: after construction, interpret each element through the **column ontology** then the **row ontology**, and synthesize a final narrative. (CF14: C/F/D interpretation steps.)
3. **Axioms are canonical**: Matrices **A** and **B** are serialized with full `cells`, row/col labels, and ontology metadata; downstream steps must not recompute or transpose them.
4. **Fail-fast semantics**: if a value isn't a semantic structure, we don't coerce it to a string. We return an explicit fallback label (e.g., `F(1,4)`) or raise, rather than pass meaningless content.
5. **Cell model invariants**:
   - `resolved`: the final narrative (post-interpretation when applicable).
   - `intermediate`: ordered trace of transformation (e.g., `["A(1,1) * B(1,1)", "… + …"]`).
   - `raw_terms`: only the original terms supplied to the semantic operation. For non-semantic data matrices (manual grids), leave `raw_terms` empty.
6. **Label & orientation invariants**: render `cells[i][j]` against the component's own `row_labels`/`col_labels`. Never auto-transpose.
7. **Determinism & auditability**: prefer in-memory products for immediate follow-ups (e.g., D consumes the in-memory **F**), then persist. Include a version tag and operation metadata.

### Operational Playbook
- **Regenerate from clean state**: clear old components in Neo4j, then run A/B/C/F/D generation to avoid stale labels.
- **Troubleshooting**
  - Wrong labels in UI: ensure the component JSON includes `row_labels`/`col_labels` and the UI prefers those over any ontology refs.
  - D shows `F(i,j)` instead of content: confirm D consumes the **in-memory** F cells and `_safe_resolved` checks `resolved → intermediate → raw_terms` (no arbitrary string conversion).

### References
- CF14: *Semantic Dot Product* and **A×B=C** definition.
- CF14: *Order of Operations* (multiply then add).
- CF14: *C, F, D interpretation steps* and D construction formula.

(This section summarizes: A×B=C, the order-of-ops, and the interpretation steps. See CF14: A×B=C; order of ops; and the C/F/D interpretation passages.)
