# ADR-002: 4-Step Sequential AI Pipeline for Hit Replication

**Status:** Accepted
**Date:** 2026-04-25
**Version:** 3.0

## Context

Hit replication requires multiple AI capabilities: evaluation of replicability, creative adaptation, image generation, and video production. These could be combined into a single mega-prompt or split into discrete steps.

## Decision

Use a **4-step sequential pipeline** with strict input/output contracts at each step boundary:

1. **Evaluate** (Claude): Score replicability (0–10) + rationale
2. **Adapt** (Claude): Generate briefing, hook, roteiro — brand-adapted
3a. **Image** (GPT-image-1.5 via `images.edit`): Anúncio gerado a partir de 1–3 imagens de referência do produto enviadas pelo usuário, com o hook como texto sobreposto
3b. **Video** (ElevenLabs + FFmpeg): Synthesized narration over fixed MP4 template
4. **Package**: Assemble "Ligar no Play" bundle

### Step 3a — Geração de Imagem (detalhe)

- **Modelo:** `gpt-image-1.5` (default no SDK `openai@^6.34.0`). Endpoint usado: `images.edit` (não `images.generate`), pois aceita imagens de referência como input.
- **Input obrigatório:** 1 a 3 imagens de referência do produto (PNG/JPG/WEBP, ≤10MB cada). Refs ficam persistidas no Storage do Supabase em `suggestions/{suggestionId}/references/{uuid}.{ext}`.
- **Persistência das refs:** Apenas no Storage (não há registro no banco). Listagem futura usa `storage.list()`.
- **Prompt:** Simplificado, sem cenário/contexto verboso — confiando que as refs visuais carregam essa informação:
  ```
  Gere um anúncio usando o hook "{hook}" como texto sobreposto na imagem,
  ao lado do(s) produto(s) anexado(s).
  ```
- **Bloqueio de regeneração:** Uma vez gerada (i.e., `content_suggestions.image_url` populado), a geração fica fixa. Para regerar, o PM precisa rejeitar a sugestão e gerar uma nova pauta. Endpoint retorna `409 Conflict` se chamado em sugestão que já tem `image_url`.
- **Limitação conhecida:** O modelo pode renderizar texto em PT-BR com erros ortográficos. Sem retry automático — toast mostra erro e usuário reenvia/ajusta o hook.
- **Disparo:** On-demand via botão "Gerar Imagem" no card da aba `/planejamento` (não roda no pipeline batch automático).

## Consequences

- **Positive:** Each step is independently testable and swappable. Failures are isolated — a bad image generation doesn't invalidate the script. Steps can be retried individually.
- **Negative:** Sequential execution adds latency vs. a parallel approach. Steps 3a/3b could theoretically run in parallel but are kept sequential for simplicity in MVP.
- **Positive (v3.0):** Refs visuais reais do produto melhoram a fidelidade da imagem gerada vs. descrições textuais puras.
- **Negative (v3.0):** Bloqueio de regeneração reduz iteração rápida — workaround é gerar nova pauta. Aceitável para MVP; reavaliar se virar gargalo.

## History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-24 | Initial decision |
| 2.0 | 2026-04-24 | Step 3b (ElevenLabs + FFmpeg) desativado temporariamente. Pipeline simplificado: Evaluate → Adapt → Image. Foco em validação de CTR via Meta Ads com imagens geradas por GPT-image-1. Reativar quando fase de vídeo for retomada. |
| 3.0 | 2026-04-25 | Step 3a refeito: troca para `gpt-image-1.5` via `images.edit` aceitando 1–3 refs de produto; prompt simplificado focado em "hook sobreposto + produto anexado"; bloqueio de regeneração após primeira geração; refs persistidas só no Storage. Disparo on-demand pelo card de `/planejamento` (PRP `20260425-image-generation-pauta-references`). |
