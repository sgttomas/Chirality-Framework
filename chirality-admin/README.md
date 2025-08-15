# Chirality Admin — Phase 1 Workbench

A clean, focused backend UI for managing **Phase 1** (structural canonization) of the Chirality Framework. This application maintains strict separation between structural choices and semantic operations.

## 🎯 Purpose

This workbench enables developers to:
- **Boot canonical seeds**: Generate domain-agnostic structural configurations via CLI
- **Review & approve**: Preview Canon JSON before persistence 
- **Canonize to Neo4j**: Store approved structural configurations for Phase 2 use
- **Maintain boundaries**: No human semantic injection—only structural choices and promotion

## 🏗️ Architecture

```
Phase 1 (Structure Only)          Phase 2 (Semantics in Context Window)
┌─────────────────────┐          ┌─────────────────────┐
│ chirality-admin     │          │ Chirality-chat      │
│ (localhost:4000)    │          │ (localhost:3000)    │
│                     │          │                     │
│ • CLI Integration   │          │ • User Questions    │
│ • Canon Review      │    ───▶  │ • IV Generation     │
│ • Approval/Persist  │          │ • Cell-by-cell LLM │
│ • Structural Only   │          │ • Semantic Memory   │
└─────────────────────┘          └─────────────────────┘
         │                                │
         └─────────── Neo4j ─────────────┘
              (Canonical Seeds)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.8+ with your `chirality_cli.py` available
- Neo4j database access
- OpenAI API key (for CLI operations)

### Setup

1. **Environment Configuration**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your paths and credentials
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev  # Runs on http://localhost:4000
   ```

4. **Access Workbench**
   - Visit: `http://localhost:4000/admin/phase1`
   - Provide path to your CF14 pack file
   - Run initialization to generate Canon
   - Review and canonize to Neo4j

## 📋 Core Features

### Canon Initialization
- Calls your existing `chirality_cli.py semantic-init` command
- Dry-run mode for safe preview
- No duplication of kernel logic

### Review & Approval
- JSON preview of generated Canon
- Diff comparison capabilities
- Manual approval before persistence

### Canon Management
- List stored Canons in Neo4j
- Detail view for individual Canons
- Metadata tracking (model, version, timestamp)

## 🔧 API Endpoints

- `POST /api/phase1/init` - Run CLI semantic-init (dry-run)
- `POST /api/phase1/canonize` - Persist Canon to Neo4j
- `GET /api/phase1/list` - List stored Canons
- `GET /api/phase1/get?id=<id>` - Get specific Canon

## 🛡️ Design Principles

### Strict Separation of Concerns
- **Phase 1**: Structure, configuration, developer approval
- **Phase 2**: Semantics, user questions, LLM context window work

### No Semantic Injection
- UI provides structural choices only
- No human editing of semantic content
- Canonical seed generation via CLI

### CLI Delegation
- Leverages existing Python kernel
- No duplication of semantic logic
- Consistent with existing workflows

## 🔗 Integration

### With Existing Stack
- Uses your current `chirality_cli.py` commands
- Stores Canons in same Neo4j instance
- Compatible with Chirality-chat Phase 2 operations

### Data Flow
1. Developer selects pack and matrix in UI
2. System calls `chirality_cli.py semantic-init --dry-run`
3. CLI returns candidate Canon JSON
4. Developer reviews and approves
5. System persists Canon to Neo4j with metadata
6. Chirality-chat can read active Canon for Phase 2

## 📊 Canon Schema

```typescript
type Canon = {
  cf_version: string;           // CF14 version
  model: string;                // LLM model used
  station_default: StationRef;  // Default station config
  matrix_default: string;       // Default matrix (e.g., "A")
  principles: string[];         // Core principles
  row_family: Lens[];          // Row ontology family
  col_family: Lens[];          // Column ontology family
  createdAt?: string;          // Timestamp
  id?: string;                 // Neo4j ID
};
```

## 🚧 Future Enhancements

### Planned Features
- **Active Canon Toggle**: Mark one Canon as currently active
- **Version Comparison**: Diff between Canon versions
- **Background Jobs**: Auto-regeneration on model/pack changes
- **MCP Integration**: Expose operations for coding agents

### Possible Extensions
- Authentication (GitHub OAuth)
- Canon validation pipeline
- Export/import capabilities
- Audit trails for canonization decisions

## 🤝 Development

### File Structure
```
├── app/admin/phase1/          # Main workbench pages
├── components/                # Reusable UI components
├── lib/                       # Core logic (CLI, Neo4j, types)
├── pages/api/phase1/          # API routes
└── public/packs/              # Optional pack storage
```

### Key Components
- **CanonInitForm**: Pack selection and CLI execution
- **CanonPreview**: JSON display with formatting
- **DiffView**: Side-by-side comparison (future)

### Adding Features
1. Follow existing patterns in `lib/` and `components/`
2. Maintain separation between structure and semantics
3. Use defensive programming for CLI and database operations
4. Test with your existing pack files

## 📄 License

MIT License - Same as parent Chirality Framework project.

---

**Ready to manage Phase 1 canonical seeds with confidence!** 🚀

This workbench respects the fundamental boundary: structure lives in the developer's domain, semantics live in the LLM's context window.