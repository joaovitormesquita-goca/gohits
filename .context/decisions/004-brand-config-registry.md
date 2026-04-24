# ADR-004: Brand Config Registry Pattern for Multi-Brand Isolation

**Status:** Accepted
**Date:** 2026-04-24
**Version:** 1.0

## Context

The system serves three brands (Apice, Rituaria, Gocase), each with distinct tone of voice, product catalogs, visual identity, and content style. AI prompts must be brand-aware to produce relevant output. New brands may be added in the future.

## Decision

Implement a **brand config registry** in `lib/brands/` — a typed object keyed by brand slug where each brand exports:
- `toneOfVoice`: Descriptive paragraph of brand personality for prompt injection
- `products`: Array of key products/categories for grounding
- `promptModifiers`: Additional instructions for the AI (e.g., "always mention sustainability for Rituaria")
- `displayName`, `colorPalette`, etc. for UI use

Adding a new brand = adding a new file in `lib/brands/` and registering it in the index.

## Consequences

- **Positive:** Brand configs are collocated, versioned, and independently editable. Type safety prevents missing required fields. AI prompts always receive complete brand context.
- **Negative:** Config is code — brand marketing changes require a code deploy, not a database edit. Acceptable for MVP; can be migrated to DB-driven config later if needed.

## History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-24 | Initial decision |
