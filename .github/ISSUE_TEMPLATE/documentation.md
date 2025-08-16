---
name: Documentation Issue
about: Report missing, incorrect, or unclear documentation
title: '[DOCS] '
labels: ['documentation', 'triage']
assignees: ''

---

## Documentation Issue

**Type of Issue:**
- [ ] Missing documentation
- [ ] Incorrect/outdated information
- [ ] Unclear or confusing content
- [ ] Broken links or references
- [ ] Code examples don't work
- [ ] Formatting or presentation issues

**Documentation Location:**
- [ ] README.md files
- [ ] CLAUDE*.md files (Claude Code guidance)
- [ ] API Reference (`docs/API_REFERENCE.md`)
- [ ] Troubleshooting Guide (`docs/TROUBLESHOOTING.md`)
- [ ] Development Workflow (`docs/DEVELOPMENT_WORKFLOW.md`)
- [ ] Architecture Decision Records (`docs/adr/`)
- [ ] CLI Help (`chirality_cli_HELP.md`)
- [ ] GraphQL Service (`graphql-service/README.md`)
- [ ] Getting Started (`GETTING_STARTED.md`)
- [ ] Contributing Guidelines (`CONTRIBUTING.md`)
- [ ] Security Policy (`SECURITY.md`)
- [ ] Other: _______________

**Specific File/Section:**
Provide the exact file path and section where the issue exists.

## Issue Description

**Current Documentation:**
Quote or describe the current documentation that has issues.

**Problem:**
Clearly describe what's wrong, missing, or confusing.

**Expected Documentation:**
Describe what the documentation should say or include.

## Context and Impact

**User Journey:**
What were you trying to accomplish when you encountered this issue?

**Experience Level:**
- [ ] New to Chirality Framework
- [ ] Familiar with the framework
- [ ] Advanced user/developer
- [ ] Contributing developer

**Impact:**
- [ ] Blocks getting started
- [ ] Prevents completing a task
- [ ] Causes confusion or delays
- [ ] Minor improvement opportunity

## Suggested Content

**Proposed Fix:**
If you have suggestions for how to fix or improve the documentation:

```markdown
<!-- Provide your suggested documentation content here -->
```

**Additional Information Needed:**
What additional information should be included?

**Code Examples:**
If code examples are needed or broken, provide working examples:

```bash
# Working CLI commands
python chirality_cli.py generate-c --ontology-pack ./ontology/cf14.core.v2.1.1.json
```

```typescript
// Working API usage
const result = await client.query({
  query: GET_COMPONENTS_QUERY,
  variables: { station: "Requirements" }
});
```

## Related Components

**Technical Areas:**
- [ ] CLI Usage and Commands
- [ ] GraphQL API and Schema
- [ ] Neo4j Database Operations
- [ ] OpenAI Integration
- [ ] Domain Pack System
- [ ] UFO Ontology Integration
- [ ] Admin UI Workflows
- [ ] Development Setup
- [ ] Deployment and Production
- [ ] Troubleshooting and Debugging

**Audience:**
- [ ] End users (running CLI commands)
- [ ] Frontend developers (using GraphQL API)
- [ ] Backend developers (contributing to framework)
- [ ] DevOps/System administrators
- [ ] Claude Code users
- [ ] New contributors

## Additional Context

**Environment:**
If relevant, provide system details where you encountered the issue.

**Related Issues:**
Link to any related issues or discussions.

**Screenshots:**
If applicable, add screenshots showing the documentation issue.

**External References:**
Any external documentation or resources that might be helpful.

---

## Documentation Improvement Ideas

**Structural Improvements:**
- [ ] Add table of contents
- [ ] Add cross-references
- [ ] Improve navigation
- [ ] Add quick reference section
- [ ] Create visual diagrams

**Content Improvements:**
- [ ] Add more examples
- [ ] Include common use cases
- [ ] Add troubleshooting steps
- [ ] Include best practices
- [ ] Add performance considerations
- [ ] Include security considerations

**Format Improvements:**
- [ ] Better code highlighting
- [ ] Consistent formatting
- [ ] Add badges or status indicators
- [ ] Improve readability
- [ ] Add interactive elements

## Priority and Impact

**Priority:**
- [ ] Critical (blocks users from getting started)
- [ ] High (significantly impacts user experience)
- [ ] Medium (improvement that would help users)
- [ ] Low (minor enhancement)

**Frequency:**
How often do you think users encounter this issue?
- [ ] Very frequently (most users)
- [ ] Often (many users)
- [ ] Sometimes (some users)
- [ ] Rarely (few users)

**Scope:**
- [ ] Affects new users getting started
- [ ] Affects daily development workflow
- [ ] Affects advanced/production usage
- [ ] Affects specific component or feature