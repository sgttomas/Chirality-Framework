# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the Chirality Framework project. ADRs document important architectural decisions, their context, and consequences to help current and future developers understand why certain choices were made.

## ADR Format

We follow the format popularized by Michael Nygard with the following sections:

- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: What is the issue that we're seeing that is motivating this decision or change?
- **Decision**: What is the change that we're proposing or have agreed to implement?
- **Consequences**: What becomes easier or more difficult to do and any risks introduced by this change?

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-split-apps-architecture.md) | Split-Apps Architecture for Frontend/Backend Separation | Accepted | 2025-01-15 |
| [002](002-graphql-service-layer.md) | GraphQL as Primary Data Layer | Accepted | 2025-01-15 |
| [003](003-cli-integration-pattern.md) | CLI Integration Pattern for Admin UI | Accepted | 2025-01-15 |
| [004](004-semantic-operation-boundary.md) | Chirality Boundary for Semantic Operations | Accepted | 2025-01-15 |
| [005](005-neo4j-as-working-memory.md) | Neo4j as Persistent Working Memory | Accepted | 2025-01-15 |
| [006](006-structured-cli-output.md) | Structured JSON Output for CLI Tools | Proposed | 2025-01-15 |
| [007](007-health-check-standardization.md) | Health Check and Monitoring Standards | Proposed | 2025-01-15 |

## Creating New ADRs

When creating a new ADR:

1. Copy the [template](template.md)
2. Number it sequentially (next available number)
3. Use a descriptive kebab-case filename
4. Update this index
5. Submit for review before marking as "Accepted"

## ADR Lifecycle

- **Proposed**: Initial draft, under discussion
- **Accepted**: Agreed upon and implemented/being implemented
- **Deprecated**: No longer recommended, but still in use
- **Superseded**: Replaced by a newer ADR (reference the replacing ADR)

---

For questions about ADRs or to propose new ones, see the [CONTRIBUTING.md](../../CONTRIBUTING.md) guide.