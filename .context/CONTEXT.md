# Domain Context

## Overview

**Máquina de Hits** is an internal cross-brand hit replication hub used by the marketing/creative teams at Gocase's portfolio brands (Apice, Rituaria, Gocase). It ingests viral content hits from one brand, evaluates replicability, and generates a full production package (briefing, hook, script, image, and video) adapted to a destination brand's tone and product catalog — reducing time-to-replicate from ~30 days to <24h.

**Users:** Internal marketing/creative team members who plan and replicate content campaigns across brands.

## Domain

### Core Entities

| Entity | Responsibility |
|--------|----------------|
| `Hit` | A viral content piece (post, reel, video) from a source brand, tagged with performance metrics |
| `Brand` | One of the portfolio brands (Apice, Rituaria, Gocase) — each with its own tone, products, and prompt config |
| `Replication` | A cross-brand adaptation job: source Hit × destination Brand → output package |
| `ReplicationPackage` | The output bundle: briefing + hook + script + image/video ("Ligar no Play") |
| `Reference` | External market inspiration injected via spreadsheet to avoid creative endogamy |
| `Alert` | WhatsApp-formatted notification triggered by hit performance thresholds or replication completion |

### Modules/Packages

```
app/                    # Next.js 15 App Router pages and layouts
├── (tabs)/             # 5 main tab views
│   ├── planejamento/   # Planning dashboard
│   ├── analise/        # Hit analysis and replicability scoring
│   ├── xadrez/         # Cross-brand replication matrix
│   ├── alertas/        # WhatsApp alert composer
│   └── referencias/    # External references input (spreadsheet)
├── api/                # Next.js API routes (AI pipeline orchestration)
│   ├── evaluate/       # Step 1: Claude replicability evaluation
│   ├── adapt/          # Step 2: Claude briefing/hook/script generation
│   ├── image/          # Step 3a: GPT-image-1 reference image
│   └── video/          # Step 3b: ElevenLabs + FFmpeg video
components/             # Shared UI components
lib/
├── brands/             # Brand config registry (tone, products, prompt modifiers)
├── ai/                 # AI client wrappers (Claude, OpenAI, ElevenLabs)
├── pipeline/           # 4-step pipeline orchestrator
└── supabase/           # Supabase client and typed queries
```

## Architecture

### System Overview

Máquina de Hits is a Next.js 15 full-stack monolith deployed on Vercel. The frontend is a 5-tab SPA-like interface backed by Next.js API routes that orchestrate a sequential 4-step AI pipeline. Supabase provides persistent storage for hits, replications, and references, with Row-Level Security ensuring data isolation per brand.

### Directory Structure

```
maquina-de-hits-mvp/
├── app/                # Next.js App Router — pages, layouts, API routes
├── components/         # Shared React components (tabs, cards, forms)
├── lib/                # Core logic: brand configs, AI clients, pipeline
├── public/             # Static assets and MP4 video templates
├── supabase/           # DB migrations and seed data
└── .context/           # AI assistant context (ADRs, domain docs)
```

### Key Dependencies

| Category | Dependency | Purpose |
|----------|-----------|---------|
| Framework | Next.js 15 | App Router, API routes, SSR/RSC |
| Database | Supabase | PostgreSQL + Auth + Storage + RLS |
| AI - Text | `@anthropic-ai/sdk` | Claude API for evaluation and script generation |
| AI - Image | `openai` | GPT-image-1 for reference image generation |
| AI - Audio | ElevenLabs API | Text-to-speech for video narration |
| Video | FFmpeg (via child_process) | Mux ElevenLabs audio over MP4 template |
| Styling | Tailwind CSS | Utility-first CSS |
| Deployment | Vercel | Edge + Serverless Functions |

### Data Flow

```
User selects source Hit + destination Brand
  → Step 1: /api/evaluate — Claude scores replicability (0-10) + rationale
  → Step 2: /api/adapt   — Claude generates briefing, hook, roteiro (brand-adapted)
  → Step 3a: /api/image  — GPT-image-1 produces reference visual
  → Step 3b: /api/video  — ElevenLabs generates narration → FFmpeg muxes onto MP4 template
  → ReplicationPackage saved to Supabase
  → "Ligar no Play" bundle rendered in UI (copy-paste ready)
  → Alert formatted for WhatsApp (optional)
```

External References (spreadsheet) are fetched and injected into Steps 1 and 2 prompts to prevent creative feedback loops.

## Conventions

### Naming Patterns

- Files: `kebab-case` (e.g., `hit-card.tsx`, `evaluate-pipeline.ts`)
- React components: `PascalCase`
- Variables/functions: `camelCase`
- Supabase table columns: `snake_case`
- Brand keys: lowercase slug (`apice`, `rituaria`, `gocase`)

### Error Handling

- API routes return `{ error: string, details?: unknown }` on failure with appropriate HTTP status
- AI calls wrapped in try/catch; pipeline aborts and surfaces error to UI if any step fails
- Supabase errors bubbled up through typed query wrappers

### Testing Style

- Framework: TBD (likely Jest + React Testing Library)
- Unit tests for pipeline orchestrator and brand config logic
- API routes tested via integration tests against Supabase local dev

### Import Organization

- External packages first, then internal `@/` aliases, then relative imports
- `@/lib/*` for shared logic, `@/components/*` for UI

### State Management

- React Server Components for static/data-fetching views
- Client components use `useState`/`useReducer` for form state
- No global client-side state manager — data lives in Supabase

### API Response Format

```typescript
// Success
{ data: T }

// Error
{ error: string, details?: unknown }
```

## Main Flows

### Hit Replication Flow

```
1. User opens "Análise de Hits" tab
2. Selects or pastes a source Hit URL/content
3. Selects destination Brand
4. Clicks "Replicar"
5. Pipeline runs (Steps 1–4, progress shown)
6. "Ligar no Play" package displayed in UI
7. User copies briefing/hook/script/image link
8. Optional: User sends WhatsApp alert from "Alertas" tab
```

### External References Injection

```
1. User uploads/pastes spreadsheet in "Referências" tab
2. References parsed and stored in Supabase
3. On each pipeline run, top-N relevant references fetched
4. Injected into Step 1 and Step 2 prompts as market context
```

## External Integrations

| System | Type | Description |
|--------|------|-------------|
| Claude API (Anthropic) | REST API | Hit evaluation (Step 1) + script generation (Step 2) |
| OpenAI GPT-image-1 | REST API | Reference image generation (Step 3a) |
| ElevenLabs | REST API | Text-to-speech narration for video (Step 3b) |
| FFmpeg | CLI (child_process) | Mux audio onto MP4 template (Step 3b) |
| Supabase | BaaS | PostgreSQL DB, Auth, Storage, RLS |

## Glossary

| Term | Definition |
|------|------------|
| **Hit** | A viral content piece with proven engagement from one of the portfolio brands |
| **Replicação** | The process of adapting a hit from one brand to another |
| **Xadrez de Replicação** | The cross-brand replication matrix showing which hits map to which brands |
| **Ligar no Play** | The final copy-paste output package ready for content production |
| **Endogamia criativa** | Creative feedback loop where AI only references internal hits — prevented by external References |
| **Roteiro** | Script/storyboard generated for the replicated video content |
| **Briefing** | The strategic creative brief for the replication |
| **Hook** | The attention-grabbing opening line or concept for the replicated content |
| **Alerta** | WhatsApp-formatted notification about hit performance or replication completion |
