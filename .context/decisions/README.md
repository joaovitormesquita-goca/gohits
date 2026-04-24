# Architectural Decision Records (ADRs)

Record of significant technical decisions in this project.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [001](001-nextjs15-supabase-stack.md) | Next.js 15 + Supabase as Full-Stack Foundation | Accepted |
| [002](002-four-step-ai-pipeline.md) | 4-Step Sequential AI Pipeline for Hit Replication | Accepted |
| [003](003-external-references-anti-endogamy.md) | External References Module to Prevent Creative Endogamy | Accepted |
| [004](004-brand-config-registry.md) | Brand Config Registry Pattern for Multi-Brand Isolation | Accepted |

## Template

To create a new ADR, use the template below and save as `NNN-title-slug.md`:

```markdown
# ADR-NNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Version:** 1.0

## Context

[Why was this decision needed?]

## Decision

[What was decided?]

## Consequences

- **Positive:** ...
- **Negative:** ...

## History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | YYYY-MM-DD | Initial decision |
```

## Conventions

- **Numbering:** Sequential, 3 digits with leading zeros (001, 002, ...)
- **Filename:** `NNN-title-in-slug.md`
- **Status:**
  - `Proposed` - Under discussion
  - `Accepted` - Approved and in use
  - `Deprecated` - Still works but not recommended
  - `Superseded` - Replaced by another ADR (link it)

## Adding Decisions

In Claude Code, use the interactive command:
```
/add-decision
```

This will ask clarifying questions and populate the ADR with context.
