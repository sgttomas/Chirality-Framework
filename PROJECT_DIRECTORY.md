# PROJECT_DIRECTORY.md
*Machine-readable project structure for Claude/LLM navigation*

## CORE_IMPLEMENTATION
```
chirality/
├── __init__.py                 # Package entry point, version CF14.3.0.0
├── cli.py                      # Command-line interface, matrix operations
├── cf14_spec.json             # Framework specification, station definitions
├── normative_spec.txt         # Core methodology specification
├── core/
│   ├── types.py               # Matrix, Cell, Operation dataclasses
│   ├── ops.py                 # Semantic operations: multiply, interpret, elementwise
│   ├── stations.py            # S1Runner, S2Runner, S3Runner pipeline
│   ├── cell_resolver.py       # OpenAIResolver, EchoResolver strategy pattern
│   ├── validate.py            # Matrix validation, dimensional checking
│   ├── ids.py                 # Content-based deterministic ID generation
│   ├── serialize.py           # Matrix JSON serialization/deserialization
│   ├── prompts.py             # LLM prompt templates for semantic operations
│   └── provenance.py          # Operation tracking and lineage
├── adapters/
│   └── neo4j_adapter.py       # Graph database persistence and lineage
└── tests/
    ├── test_ops.py            # Semantic operation testing
    ├── test_validate.py       # Matrix validation testing
    ├── test_ids.py            # ID generation testing
    └── fixtures/
        ├── A.json             # Test matrix A (problem axioms)
        └── B.json             # Test matrix B (decision basis)
```

## ACTIVE_DOCUMENTATION
```
README.md                      # Project overview, setup instructions
ARCHITECTURE.md               # System design, technical implementation
API.md                        # CLI, Python SDK, GraphQL interface docs
CONTRIBUTING.md               # Development guidelines, semantic operation patterns
TROUBLESHOOTING.md            # Common issues, debugging techniques
SPECULATIVE_CLAIMS.md         # Honest capability assessment vs potential
CLAUDE.md                     # LLM role guidance, semantic interpolation focus
```

## PROJECT_MANAGEMENT
```
VERSION.md                    # CF14.3.0.0 version tracking and numbering
CHANGELOG.md                  # Standard format change tracking
CURRENT_STATUS.md             # Running development timeline updates
KEY_DECISIONS.md              # Major choices using CF14 decision dialectics
ROADMAP.md                    # Future development plans and research directions
KEY_PROJECT_FILES.md          # Essential file reference guide
```

## CONFIGURATION
```
requirements.txt              # Python dependencies: openai, neo4j, pytest
setup.py                     # Package installation configuration
.env.example                 # Environment variable template
.gitignore                   # Comprehensive ignore patterns
LICENSE                      # MIT License
```

## DEPRECATED_DOCS
```
MATHEMATICAL_FOUNDATIONS.md  # ⚠️ DEPRECATED: Theoretical framing
CATEGORICAL_IMPLEMENTATION.md # ⚠️ DEPRECATED: Theoretical architecture  
THEORETICAL_SIGNIFICANCE.md  # ⚠️ DEPRECATED: Overstated claims
```

## OPERATION_ARTIFACTS
```
output/                      # CLI operation results
canonical-test/              # Canonical semantic valley execution
echo-test/                   # Echo resolver test results
openai-validated/            # OpenAI resolver validated results
```

## DEVELOPMENT_HISTORY
```
devhistory/
├── Chirality-Framework-9.1.1-Implementation-GPT-o1-pro.txt  # Semantic valley execution trace
├── Chirality Framework * Chirality_-_Reasonflux * 4 Documents Workflow.txt  # Integration notes
└── detailed-analysis-chirality-semantic-framework.txt       # Codebase analysis
```


