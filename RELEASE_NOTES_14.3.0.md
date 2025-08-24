# Chirality Semantic Framework v14.3.0
 
## CF14 Neo4j Integration Release

This release introduces specialized CF14 semantic matrix export capabilities, enabling seamless integration with the chirality-ai-app document generation system.

### New Features
- New flag: `--write-cf14-neo4j` for CF14 export
- Graph schema: `:CFMatrix` and `:CFNode` labels
- Stable IDs: SHA1-based idempotent writes
- GraphQL-ready for chirality-ai-app

### CLI Example
```bash
python -m chirality.cli run \
  --thread "demo:test" \
  --A chirality/tests/fixtures/A.json \
  --B chirality/tests/fixtures/B.json \
  --resolver echo --write-cf14-neo4j
```

### Compatibility
- Python 3.9+, Neo4j 5+
- Backward compatible with legacy `--write-neo4j`

### Files Modified
- chirality/exporters/neo4j_cf14_exporter.py
- chirality/cli.py
- README.md, CLAUDE.md, KEY_PROJECT_FILES.md

MIT License
