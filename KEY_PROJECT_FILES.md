# Key Project Files

Essential files for understanding, using, and contributing to the Chirality Framework.

**Status Last Updated**: August 23, 2025 at 21:28h
**Note**: Always ask user for current date/time when updating status - AI doesn't have real-time access

## 🚀 Getting Started

### For Users
- **[README.md](README.md)** - Project overview, installation, and basic usage 
- **[API.md](API.md)** - Complete interface documentation (CLI, Python SDK, GraphQL)
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions 

### For Developers  
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and technical implementation 
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development guidelines and semantic operation patterns
- **[.env.example](.env.example)** - Environment configuration template 

## 📋 Project Status & Planning

### Current State
- **[CURRENT_STATUS.md](CURRENT_STATUS.md)** - Running development timeline and active experiments 
- **[VERSION.md](VERSION.md)** - Version tracking (currently CF14.3.0.0) 
- **[CHANGELOG.md](CHANGELOG.md)** - Detailed change history 

### Decision Making
- **[KEY_DECISIONS.md](KEY_DECISIONS.md)** - Major architectural choices using CF14 decision dialectics 
- **[SPECULATIVE_CLAIMS.md](SPECULATIVE_CLAIMS.md)** - Honest assessment of capabilities vs potential
### Future Planning
- **[ROADMAP.md](ROADMAP.md)** - Development plans and research directions 

## 🔧 Core Implementation

### Framework Engine
- **[chirality/core/types.py](chirality/core/types.py)** - Matrix, Cell, Operation data structures
- **[chirality/core/ops.py](chirality/core/ops.py)** - Semantic operations (multiply, interpret, elementwise)
- **[chirality/core/stations.py](chirality/core/stations.py)** - S1→S2→S3 processing pipeline

### Key Components
- **[chirality/core/cell_resolver.py](chirality/core/cell_resolver.py)** - LLM integration and resolver strategies
- **[chirality/adapters/neo4j_adapter.py](chirality/adapters/neo4j_adapter.py)** - Graph database persistence
- **[chirality/exporters/neo4j_cf14_exporter.py](chirality/exporters/neo4j_cf14_exporter.py)** - CF14 semantic matrix export to Neo4j 
- **[chirality/cli.py](chirality/cli.py)** - Command-line interface

### Configuration
- **[chirality/cf14_spec.json](chirality/cf14_spec.json)** - Framework specification and station definitions
- **[chirality/normative_spec.txt](chirality/normative_spec.txt)** - Core methodology specification

## 🎯 Specialized Documentation

### For AI Integration
- **[AGENTS.md](AGENTS.md)** - LLM role guidance and semantic interpolation focus 
- **Project structure** - See [KEY_PROJECT_FILES.md](KEY_PROJECT_FILES.md) (this document) 

### Process Documents
- **[CONTINUOUS_IMPROVEMENT_PLAN.md](CONTINUOUS_IMPROVEMENT_PLAN.md)** - Systematic documentation quality maintenance
- **[CONSOLIDATED_IMPROVEMENT_PLAN.md](CONSOLIDATED_IMPROVEMENT_PLAN.md)** - Current iteration of improvement roadmap 
- **[COMMIT_HOOKS.md](COMMIT_HOOKS.md)** - Git workflow integration for documentation review cycles
- **[AGENTS.md](AGENTS.md)** - AI agent workflows for automated documentation maintenance 

### Historical Context
- **[devhistory/Chirality-Framework-9.1.1-Implementation-GPT-o1-pro.txt](devhistory/Chirality-Framework-9.1.1-Implementation-GPT-o1-pro.txt)** - Complete semantic valley execution trace 

## 🧪 Testing & Examples

### Axiomatic Matrices
- **[chirality/tests/fixtures/A.json](chirality/tests/fixtures/A.json)** 
- **[chirality/tests/fixtures/B.json](chirality/tests/fixtures/B.json)** 

### Test Results
- **[canonical-test/](canonical-test/)** - Canonical semantic valley execution results
- **[echo-test/](echo-test/)** - Echo resolver test outputs
- **[openai-validated/](openai-validated/)** - OpenAI resolver validated results

## 📝 Configuration Templates

### Environment Setup
- **[.env.example](.env.example)** - Complete environment variable template
- **[requirements.txt](requirements.txt)** - Python dependencies
- **[.gitignore](.gitignore)** - Comprehensive ignore patterns

### Legal & Licensing
- **[LICENSE](LICENSE)** - MIT License terms

## 🔍 Quick Navigation by Use Case

### "I want to understand what CF14 does"
1. [README.md](README.md) - Overview
2. [SPECULATIVE_CLAIMS.md](SPECULATIVE_CLAIMS.md) - Honest capabilities
3. [devhistory/Chirality-Framework-9.1.1-Implementation-GPT-o1-pro.txt](devhistory/Chirality-Framework-9.1.1-Implementation-GPT-o1-pro.txt) - See it in action

### "I want to use CF14"
1. [README.md](README.md) - Installation
2. [API.md](API.md) - Usage patterns
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - When things go wrong

### "I want to contribute to CF14"
1. [CONTRIBUTING.md](CONTRIBUTING.md) - Guidelines
2. [ARCHITECTURE.md](ARCHITECTURE.md) - System design
3. [KEY_DECISIONS.md](KEY_DECISIONS.md) - Understand choices made

### "I want to understand the current state"
1. [CONSOLIDATED_IMPROVEMENT_PLAN.md](CONSOLIDATED_IMPROVEMENT_PLAN.md) - What we're currently working on
2. [ROADMAP.md](ROADMAP.md) - Where we're going

### "I want to integrate with CF14"
1. [API.md](API.md) - All interface options
2. [ARCHITECTURE.md](ARCHITECTURE.md) - How it all fits together
3. [.env.example](.env.example) - Configuration options

### "I'm an LLM working with this project"
1. [CLAUDE.md](CLAUDE.md) - Your role and focus
2. [KEY_PROJECT_FILES.md](KEY_PROJECT_FILES.md) - Project structure and file reference
3. [chirality/core/](chirality/core/) - Core implementation files

## 📊 File Importance Matrix

### Critical (Project won't work without these)
- chirality/core/types.py, ops.py, stations.py
- chirality/cli.py
- requirements.txt

### Important (Project functionality)
- README.md
- API.md
- ARCHITECTURE.md
- chirality/core/cell_resolver.py
- chirality/core/validate.py
- .env.example

### Valuable (Project quality/usability)
- CONTRIBUTING.md,
- TROUBLESHOOTING.md
- ROADMAP.md

### Reference (Historical/organizational)
- CHANGELOG.md, 
- KEY_DECISIONS.md

---

*This file serves as a navigation hub for the project's essential components, organized by user need and file importance.*
