# Key Project Files

Essential files for understanding, using, and contributing to the Chirality Framework.

## 📊 Continuous Improvement Status

**Status Legend:**
- ✅ **CURRENT** - Document meets current standards and requirements
- 🆕 **UPDATED** - Recently improved and meets enhanced standards
- 🔄 **NEEDS_UPDATE** - Scheduled for improvement in specified phase
- ⏸️ **ON_HOLD** - Development temporarily suspended
- 📋 **PLANNED** - Future enhancement identified

**Improvement Phases:**
- **Phase 1** ✅ Technical accuracy and implementation status (COMPLETED Aug 17)
- **Phase 2** ✅ User experience and clarity improvements (COMPLETED Aug 17)
- **Phase 3** ⏸️ Cross-document consistency (DEFERRED - addressed through ongoing consistency)
- **Phase 4** ✅ Evidence strengthening and validation (COMPLETED Aug 17)
- **Phase 5** ✅ Process documentation and agentic workflow integration (COMPLETED Aug 17)

**Continuous Improvement**: All documents now tracked via [CONTINUOUS_IMPROVEMENT_PLAN.md](CONTINUOUS_IMPROVEMENT_PLAN.md)

**Status Last Updated**: August 17, 2025 at 15:56
**Note**: Always ask user for current date/time when updating status - AI doesn't have real-time access

## 🚀 Getting Started

### For Users
- **[README.md](README.md)** - Project overview, installation, and basic usage | 🆕 **UPDATED** (Aug 17 - CF14 Neo4j integration)
- **[API.md](API.md)** - Complete interface documentation (CLI, Python SDK, GraphQL) | ✅ **CURRENT** (Updated Aug 17 - Phase 2)
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions | ✅ **CURRENT**

### For Developers  
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and technical implementation | ✅ **CURRENT** (Updated Aug 17 - Phase 1)
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development guidelines and semantic operation patterns | ✅ **CURRENT**
- **[.env.example](.env.example)** - Environment configuration template | ✅ **CURRENT**

## 📋 Project Status & Planning

### Current State
- **[CURRENT_STATUS.md](CURRENT_STATUS.md)** - Running development timeline and active experiments | ✅ **CURRENT**
- **[VERSION.md](VERSION.md)** - Version tracking (currently CF14.3.0.0) | ✅ **CURRENT**
- **[CHANGELOG.md](CHANGELOG.md)** - Detailed change history | ✅ **CURRENT**

### Decision Making
- **[KEY_DECISIONS.md](KEY_DECISIONS.md)** - Major architectural choices using CF14 decision dialectics | ✅ **CURRENT**
- **[SPECULATIVE_CLAIMS.md](SPECULATIVE_CLAIMS.md)** - Honest assessment of capabilities vs potential | ✅ **CURRENT** (Updated Aug 17 - Phase 4)

### Future Planning
- **[ROADMAP.md](ROADMAP.md)** - Development plans and research directions | ✅ **CURRENT**

## 🔧 Core Implementation

### Framework Engine
- **[chirality/core/types.py](chirality/core/types.py)** - Matrix, Cell, Operation data structures
- **[chirality/core/ops.py](chirality/core/ops.py)** - Semantic operations (multiply, interpret, elementwise)
- **[chirality/core/stations.py](chirality/core/stations.py)** - S1→S2→S3 processing pipeline

### Key Components
- **[chirality/core/cell_resolver.py](chirality/core/cell_resolver.py)** - LLM integration and resolver strategies
- **[chirality/adapters/neo4j_adapter.py](chirality/adapters/neo4j_adapter.py)** - Graph database persistence
- **[chirality/exporters/neo4j_cf14_exporter.py](chirality/exporters/neo4j_cf14_exporter.py)** - CF14 semantic matrix export to Neo4j | ✅ **CURRENT** (Created Aug 17)
- **[chirality/cli.py](chirality/cli.py)** - Command-line interface

### Configuration
- **[chirality/cf14_spec.json](chirality/cf14_spec.json)** - Framework specification and station definitions
- **[chirality/normative_spec.txt](chirality/normative_spec.txt)** - Core methodology specification

## 🎯 Specialized Documentation

### For AI Integration
- **[CLAUDE.md](CLAUDE.md)** - LLM role guidance and semantic interpolation focus | 🆕 **UPDATED** (Aug 17 - CF14 export workflow)
- **[PROJECT_DIRECTORY.md](PROJECT_DIRECTORY.md)** - Machine-readable project structure | ✅ **CURRENT**

### Process Documents
- **[CONTINUOUS_IMPROVEMENT_PLAN.md](CONTINUOUS_IMPROVEMENT_PLAN.md)** - Systematic documentation quality maintenance | ✅ **CURRENT** (Created Aug 17 + Enhanced with workflow)
- **[CONSOLIDATED_IMPROVEMENT_PLAN.md](CONSOLIDATED_IMPROVEMENT_PLAN.md)** - Strategic improvement roadmap | ✅ **CURRENT** (Created Aug 17 + Enhanced with origin)
- **[COMMIT_HOOKS.md](COMMIT_HOOKS.md)** - Git workflow integration for documentation review cycles | ✅ **CURRENT** (Created Aug 17)
- **[AGENTS.md](AGENTS.md)** - AI agent workflows for automated documentation maintenance | ✅ **CURRENT** (Created Aug 17)
- **[4_DOCUMENTS_ANALYSIS.md](4_DOCUMENTS_ANALYSIS.md)** - Analysis results from 4 Documents workflow | ✅ **CURRENT** (Created Aug 17)

### Historical Context
- **[devhistory/Chirality-Framework-9.1.1-Implementation-GPT-o1-pro.txt](devhistory/Chirality-Framework-9.1.1-Implementation-GPT-o1-pro.txt)** - Complete semantic valley execution trace | ✅ **CURRENT**
- **Deprecated docs** - Mathematical and theoretical documents (marked with ⚠️ warnings) | ⏸️ **ON_HOLD**

## 🧪 Testing & Examples

### Test Matrices
- **[chirality/tests/fixtures/A.json](chirality/tests/fixtures/A.json)** - Example problem axioms matrix
- **[chirality/tests/fixtures/B.json](chirality/tests/fixtures/B.json)** - Example decision basis matrix

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
1. [CURRENT_STATUS.md](CURRENT_STATUS.md) - What's happening now
2. [VERSION.md](VERSION.md) - What version we're on
3. [ROADMAP.md](ROADMAP.md) - Where we're going

### "I want to integrate with CF14"
1. [API.md](API.md) - All interface options
2. [ARCHITECTURE.md](ARCHITECTURE.md) - How it all fits together
3. [.env.example](.env.example) - Configuration options

### "I'm an LLM working with this project"
1. [CLAUDE.md](CLAUDE.md) - Your role and focus
2. [PROJECT_DIRECTORY.md](PROJECT_DIRECTORY.md) - Project structure
3. [chirality/core/](chirality/core/) - Core implementation files

## 📊 File Importance Matrix

### Critical (Project won't work without these)
- chirality/core/types.py, ops.py, stations.py
- chirality/cli.py
- requirements.txt

### Important (Project functionality)
- README.md, API.md, ARCHITECTURE.md
- chirality/core/cell_resolver.py, validate.py
- .env.example

### Valuable (Project quality/usability)
- CONTRIBUTING.md, TROUBLESHOOTING.md
- CURRENT_STATUS.md, ROADMAP.md
- Test fixtures and examples

### Reference (Historical/organizational)
- CHANGELOG.md, VERSION.md, KEY_DECISIONS.md
- Development history files
- Deprecated documentation

---

*This file serves as a navigation hub for the project's essential components, organized by user need and file importance.*