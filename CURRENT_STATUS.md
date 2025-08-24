# Current Status

Concise, current-only snapshot of what’s verified to work now. For plans and future work, see links at bottom.

## Verified Working Now
- Semantic operations: multiply, interpret, elementwise; end-to-end S1→S2→S3
- Two-pass generation: DS→SP→X→M with cross-referential refinement
- File SoT with graph mirror: async, selective Neo4j mirroring enabled by flag
- APIs: `/api/core/*` orchestration; Graph API v1 with Bearer auth and CORS
- Reasoning traces: provenance captured; validation of matrix dimensions and content

## Environment Baseline
- Dev server runs locally; quick start verified under documented defaults
- Graph features optional; requires `FEATURE_GRAPH_ENABLED=true` and `NEO4J_*`

## Where to Find Details
- Architecture and principles: ARCHITECTURE.md
- API contracts, examples, configuration: API.md
- Neo4j model and selection rules: NEO4J_SEMANTIC_INTEGRATION.md

## Roadmap and Claims
- Future plans and validation timelines: ROADMAP.md
- What’s speculative vs proven: SPECULATIVE_CLAIMS.md
