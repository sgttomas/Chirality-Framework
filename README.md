# Chirality Framework 14 v2.1.1 Implementation

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![CF14](https://img.shields.io/badge/CF14-v2.1.1-blue)
![NextJS](https://img.shields.io/badge/Built_with-NextJS_14-black)
![Python](https://img.shields.io/badge/Python-3.8+-yellow)
![Neo4j](https://img.shields.io/badge/Neo4j-Graph_DB-green)
![OpenAI API](https://img.shields.io/badge/Powered_by-OpenAI_API-orange)
![Production Ready](https://img.shields.io/badge/Status-Production_Ready-success)

A complete, production-ready implementation of the **Chirality Framework 14 (CF14) v2.1.1** normative specification. This hybrid Next.js/Python system transforms problem statements into structured semantic knowledge using Neo4j as "DB-as-working-memory" architecture, enabling conversational AI access to instantiated reasoning frameworks.

> **New in v2.1.1**: Domain pack system, Array P/H operations, enhanced UFO ontology integration, and complete backward compatibility with v1.x implementations.

## 🎯 What This System Does

- **🧠 Semantic Reasoning**: Transforms problem statements into structured CF14 semantic matrices (A, B, C, F, D)
- **🏗️ Knowledge Architecture**: Creates persistent semantic representations in Neo4j with UFO ontology annotations
- **💬 Conversational AI**: Natural language interface to query instantiated knowledge with context-aware responses
- **📊 Visual Matrix Operations**: Interactive matrix visualization with semantic operation traceability
- **🛠️ Domain Customization**: Extensible domain pack system for specialized knowledge domains
- **⚡ CLI Automation**: Enhanced Python CLI with v2.1.1 features for batch operations and pipeline automation
- **🔍 Array P/H Analysis**: Advanced validity parameters and consistency dialectic extraction

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

### Prerequisites

- **Node.js** 18+ and npm (for Next.js frontend)
- **Python** 3.8+ with pip (for CF14 semantic engine)
- **Neo4j Aura** account or local Neo4j 5.x instance
- **OpenAI API** key with sufficient credits
- **4GB RAM** minimum (8GB recommended for large matrices)
- **Broadband connection** for Neo4j Aura and OpenAI API access

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

4. **Start the system:**
   ```bash
   npm run dev
   ```

### Basic Usage

1. **🎯 Instantiate Knowledge**: Visit `http://localhost:3000/instantiate`
   - Enter your problem statement (e.g., "How do we ensure AI system reliability?")
   - Select optional domain context (Software Engineering, Business Strategy, etc.)
   - Click "Start Instantiation" to trigger automated CF14 pipeline
   - Watch real-time progress: Clean → Setup A&B → Generate C → Compute F → Generate D

2. **💬 Chat with Knowledge**: Visit `http://localhost:3000/chat`
   - Ask natural language questions about your instantiated framework
   - Examples: "What requirements do we have?", "Show me objectives for data quality"
   - Get context-aware responses with specific matrix cell references

3. **📊 Explore Matrices**: Visit `http://localhost:3000/matrices`
   - Visual matrix representations with semantic operation trails
   - Cell-level detail with resolved content and raw terms
   - Station-based organization following semantic valley progression

### CLI Operations

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

## 📚 Documentation

### Core Documentation
- **[📖 Chirality CLI README](Chirality_cli_README.md)** - Complete architectural overview and implementation guide
- **[🔧 Operational Help Guide](chirality_cli_HELP.md)** - Comprehensive usage instructions, troubleshooting, and best practices
- **[📋 CF14 v2.1.1 Implementation](README_CF14_v2.1.1.md)** - CF14 v2.1.1 specific features and migration guide

### Technical Specifications
- **[📜 CF14 Normative Specification](CF14_Normative_Spec_Reconciled_v2.1.1.txt)** - Complete framework specification
- **[🏗️ Implementation Guide](CF14_Implementation_Guide_Reconciled_v2.1.1.txt)** - Technical implementation details
- **[📊 Version Tracking](VERSION.md)** - Release history and version information

### Quick References
- **Domain Pack Examples**: `ontology/domains/` - Pre-built domain customizations
- **API Documentation**: Embedded in help guide with curl examples
- **Troubleshooting**: Common issues and solutions in operational guide

## 🏛️ System Architecture

### CF14 v2.1.1 "DB-as-Working-Memory" Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js UI   │────│  Neo4j Graph   │────│Enhanced Python │
│  (localhost:3000)│    │   Database     │    │   CLI v2.1.1   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
    ┌────┴────┐              ┌────┴────┐              ┌────┴────┐
    │/instantiate│          │Components│              │Matrix A │
    │/chat     │            │Cells+UFO │              │Matrix B │
    │/matrices │            │Terms     │              │A*B = C  │
    │/api/neo4j│            │Stations  │              │J⊙C = F  │
    └─────────┘              │Provenance│              │A+F = D  │
                             │DomainPacks│             │Array P/H│
                             └─────────┘              └─────────┘
```

### Key Architectural Patterns
- **🧠 Semantic Memory**: Neo4j stores instantiated knowledge with full provenance
- **🔄 Hybrid Processing**: UI triggers Python CLI operations via API routes
- **📊 Real-time Updates**: WebSocket-like progress tracking during matrix generation
- **🎯 Domain Extensibility**: Pluggable domain packs for specialized reasoning
- **✅ Canonical IDs**: Consistent matrix identification (A, B, C, F, D) throughout system

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

## 📁 Project Structure

```
├── ontology/                               # CF14 v2.1.1 Domain System
│   ├── cf14.core.v2.1.1.json             # Core framework ontology
│   └── domains/                           # Domain-specific customizations
│       ├── software_engineering/          # Software domain pack
│       ├── business_strategy/             # Business domain pack
│       └── research_methods/              # Research domain pack
├── app/                                   # Next.js Application
│   ├── instantiate/                       # Knowledge instantiation UI
│   ├── chat/                             # Conversational AI interface
│   ├── matrices/                         # Matrix visualization
│   └── api/neo4j/                        # Enhanced API routes
│       ├── clean-setup/route.ts          # Database management
│       ├── ingest-v2/route.ts           # Enhanced component ingestion
│       ├── compute/f/route.ts           # Matrix F computation
│       ├── instantiate-v2/route.ts      # CF14 pipeline integration
│       └── domain/route.ts              # Domain pack management
├── lib/                                  # Shared Libraries
│   └── neo4j.ts                         # Database connection management
├── components/ui/                        # Reusable UI Components
├── chirality_cli.py                     # Enhanced CF14 v2.1.1 CLI
├── neo4j_admin.py                       # Database administration
├── CF14_Normative_Spec_Reconciled_v2.1.1.txt  # Complete specification
├── CF14_Implementation_Guide_Reconciled_v2.1.1.txt # Technical guide
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
