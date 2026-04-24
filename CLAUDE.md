# maquina-de-hits-mvp

> Hub interno de replicação de hits cross-brand (Apice, Rituaria, Gocase) — reduz time-to-replicate de ~30 dias para <24h via pipeline de IA em 4 passos.

## Decision Compliance

**IMPORTANT:** Before implementing any change, check `.context/decisions/` for related ADRs.

If a requested change conflicts with an existing decision:
1. **Stop and inform the user** which ADR(s) would be affected
2. **Ask explicitly** if they want to:
   - Proceed and update the decision
   - Modify the approach to comply with existing decision
   - Cancel the change
3. **If updating a decision**, create a new version:
   - Change status to `Superseded by ADR-XXX`
   - Create new ADR with updated decision
   - Reference the previous ADR

## Stack

- **Language:** TypeScript (strict mode)
- **Framework:** Next.js 15 (App Router)
- **Database/Auth:** Supabase (PostgreSQL + Row-Level Security)
- **AI - Evaluation & Text:** Claude API (Anthropic) — `claude-sonnet-4-6`
- **AI - Image:** GPT-image-1 (OpenAI)
- **AI - Audio/Video:** ElevenLabs (TTS) + FFmpeg (video rendering)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Commands

```bash
# Development
npm run dev

# Testing
npm test

# Linting
npm run lint

# Type check
npm run type-check

# Build
npm run build
```

## Critical Rules

1. **Always ask before assuming** - When there is ambiguity, multiple valid approaches, or decisions to be made, use the AskUserQuestion tool to clarify before proceeding. Never assume user intent.
2. **Brand isolation** - Never mix brand-specific tone, products, or prompts. Each brand (Apice, Rituaria, Gocase) has its own config. Cross-contamination degrades output quality.
3. **No creative feedback loops** - External references (spreadsheet input) must always be injected into prompts to avoid endogamy. Never generate new hits purely from existing internal hits.
4. **Pipeline step contracts** - Each of the 4 AI pipeline steps has a defined input/output schema. Never bypass a step or merge steps without an ADR.
5. **WhatsApp-safe output** - Alert content must be plain text, emoji-compatible, and under 4096 chars — no markdown that breaks in WhatsApp.

## Architecture

### 5-Tab Interface

| Tab | Purpose |
|-----|---------|
| Planejamento | Campaign and hit planning dashboard |
| Análise de Hits | Evaluate existing hits for replicability |
| Xadrez de Replicação | Cross-brand replication matrix |
| Alertas | WhatsApp-formatted alerts for the team |
| Referências | External market references (spreadsheet input) |

### 4-Step AI Pipeline

```
Step 1: Claude evaluates replicability of source hit
Step 2: Claude generates briefing, hook, and script adapted to destination brand
Step 3a: GPT-image-1 → reference image
Step 3b: ElevenLabs + FFmpeg → video (synth audio over fixed MP4 template)
Step 4: Package output as "Ligar no Play" copy-paste bundle
```

### Brand Config Pattern

Each brand has isolated config: tone of voice, product catalog, color palette, and prompt modifiers. New brands are added by extending the brand config registry.

## Efficiency Rules

- **Read before changing** — Always read a file before editing it. Never modify code based on assumptions about its content.
- **Follow existing patterns** — Before implementing something new, look at how similar things are done in the codebase. Match the existing style, conventions, and patterns.
- **Scope reads to the task** — Only read files directly relevant to the change. Do not explore broadly before acting on focused tasks.
- **Load context progressively** — Start with the minimum files needed. Only expand to related files when the current context is insufficient to complete the task.
- **Code only** — When implementing changes, output code. Skip explanations, preamble, and commentary unless the user asks for them.
- **Skip summaries** — After making changes, do not summarize what you did unless asked. Show `git diff` instead.
- **Run targeted tests** — After a change, run only tests related to the modified files. Only run the full suite when asked or before committing.
- **Never read generated files** — Do not read lock files, build output, vendored dependencies, or source maps. These are listed in `.claudeignore`.

## Compact Instructions

When compacting, preserve:
- Test results and error output
- File paths and code changes made
- Key decisions and their rationale

Remove:
- Exploratory file reads that did not lead to changes
- Verbose command output that has been summarized
- Discussion of rejected approaches

---

## Additional Context

- Domain and architecture → `.context/CONTEXT.md`
- Architectural decisions → `.context/decisions/`
- Task-specific skills → `.claude/skills/`
- Bug reproduction guide → `.claude/skills/bug-reproduction/SKILL.md`
- Batch operations guide → `.claude/skills/batch-operations/SKILL.md`
- Git platform detection → `.claude/skills/git-platform/SKILL.md`
