# ADR-002: 4-Step Sequential AI Pipeline for Hit Replication

**Status:** Accepted
**Date:** 2026-04-24
**Version:** 2.0

## Context

Hit replication requires multiple AI capabilities: evaluation of replicability, creative adaptation, image generation, and video production. These could be combined into a single mega-prompt or split into discrete steps.

## Decision

Use a **4-step sequential pipeline** with strict input/output contracts at each step boundary:

1. **Evaluate** (Claude): Score replicability (0–10) + rationale
2. **Adapt** (Claude): Generate briefing, hook, roteiro — brand-adapted
3a. **Image** (GPT-image-1): Reference visual
3b. **Video** (ElevenLabs + FFmpeg): Synthesized narration over fixed MP4 template
4. **Package**: Assemble "Ligar no Play" bundle

## Consequences

- **Positive:** Each step is independently testable and swappable. Failures are isolated — a bad image generation doesn't invalidate the script. Steps can be retried individually.
- **Negative:** Sequential execution adds latency vs. a parallel approach. Steps 3a/3b could theoretically run in parallel but are kept sequential for simplicity in MVP.

## History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-24 | Initial decision |
| 2.0 | 2026-04-24 | Step 3b (ElevenLabs + FFmpeg) desativado temporariamente. Pipeline simplificado: Evaluate → Adapt → Image. Foco em validação de CTR via Meta Ads com imagens geradas por GPT-image-1. Reativar quando fase de vídeo for retomada. |
