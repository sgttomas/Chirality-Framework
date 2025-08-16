---
name: Bug Report
about: Create a report to help us improve the Chirality Framework
title: '[BUG] '
labels: ['bug', 'triage']
assignees: ''

---

## Bug Description

**Brief Description:**
A clear and concise description of what the bug is.

**Expected Behavior:**
What you expected to happen.

**Actual Behavior:**
What actually happened.

## Environment Information

**System Details:**
- OS: [e.g. macOS 14.1, Ubuntu 22.04, Windows 11]
- Python Version: [e.g. 3.10.5]
- Node.js Version: [e.g. 18.17.0]
- Chirality Framework Version: [e.g. 2.1.1]

**Service Status:**
```bash
# Please run and paste the output of:
./scripts/health-check.sh
```

**Database:**
- Neo4j Type: [e.g. Neo4j Aura, Local Neo4j Desktop, Docker]
- Neo4j Version: [e.g. 5.13.0]

## Reproduction Steps

**Steps to reproduce the behavior:**
1. Go to '...'
2. Click on '....'
3. Run command '....'
4. See error

**Minimal reproduction code/commands:**
```bash
# Paste the exact commands that trigger the issue
python chirality_cli.py generate-c
```

## Error Details

**Error Messages:**
```
Paste the complete error message, including stack traces
```

**Relevant Log Files:**
```
Include relevant logs from:
- CLI output
- GraphQL service logs
- Browser console (if applicable)
- Neo4j logs (if relevant)
```

## Component Impact

**Which components are affected?**
- [ ] Python CLI (`chirality_cli.py`)
- [ ] Neo4j Admin (`neo4j_admin.py`)
- [ ] GraphQL Service (port 8080)
- [ ] Admin UI (port 3001)
- [ ] Neo4j Database
- [ ] OpenAI API Integration
- [ ] Documentation

**Specific Operations:**
- [ ] Matrix Generation (A, B, C, F, D, J)
- [ ] Database Operations (push-axioms, list, delete)
- [ ] GraphQL Queries/Mutations
- [ ] UI Operations
- [ ] File I/O Operations

## Context and Impact

**What were you trying to accomplish?**
Describe the task or workflow you were performing.

**Business/Development Impact:**
- [ ] Blocks development work
- [ ] Affects core functionality
- [ ] Documentation issue
- [ ] Performance problem
- [ ] Security concern

**Workaround Available:**
Describe any workarounds you've found.

## Additional Information

**Screenshots/Videos:**
If applicable, add screenshots to help explain your problem.

**Related Issues:**
Link to any related issues or discussions.

**Configuration Files:**
```bash
# If relevant, paste relevant configuration (remove sensitive data):
# .env file contents (without API keys)
# package.json versions
# Neo4j connection settings
```

---

## Debugging Information

**Have you tried these debugging steps?**
- [ ] Ran `./scripts/health-check.sh`
- [ ] Checked service status with `./scripts/dev-status.sh` 
- [ ] Verified environment variables with `./scripts/validate-env.sh`
- [ ] Checked recent logs for errors
- [ ] Tested with a fresh database/clean state
- [ ] Consulted the troubleshooting guide (`docs/TROUBLESHOOTING.md`)

**Additional context:**
Add any other context about the problem here.