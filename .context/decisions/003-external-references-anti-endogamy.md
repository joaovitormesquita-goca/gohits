# ADR-003: External References Module to Prevent Creative Endogamy

**Status:** Accepted — Implementation deferred to v2
**Date:** 2026-04-24
**Version:** 1.1

## Context

If the AI pipeline only references internal brand hits when generating replications, it risks "creative endogamy" — a feedback loop where the system only remixes its own output, degrading creative quality and diverging from actual market trends over time.

## Decision

Implement a dedicated **External References** module (Tab 5 — "Referências") where users input market inspiration via spreadsheet. These references are stored in Supabase and **injected into the prompts of Steps 1 and 2** of every pipeline run.

- References are sourced externally (competitor content, trending formats, platform benchmarks)
- Users manage references via the Referências tab (add, tag, archive)
- Pipeline fetches top-N relevant references at runtime and includes them as context

## Consequences

- **Positive:** Keeps output grounded in actual market trends. Reduces creative drift. Gives the team a structured way to feed inspiration into the system.
- **Negative:** Requires users to actively maintain the references library. Stale or low-quality references will degrade output. Prompt size increases with injected references — monitor token usage.

## History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-24 | Initial decision |
| 1.1 | 2026-04-24 | MVP execution (PRP 20260424-gohit-project-base): external_references table created in schema but injection into pipeline prompts deferred to v2. UI tab (Aba 5) also deferred. |
