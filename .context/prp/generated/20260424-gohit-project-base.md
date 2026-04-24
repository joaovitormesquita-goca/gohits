# PRP: Gohit — Base Completa do Projeto (MVP Hackathon)

> Product Requirements Prompt - Implementação completa do hub de replicação de hits cross-brand

<!--
PROGRESS TRACKING:
- Mark tasks as [x] when completed
- Mark success criteria as [x] when verified
- Update Status below when starting (In Progress) and finishing (Completed)
- Add "✅ Completed: YYYY-MM-DD" after each phase validation
-->

## Summary

Implementar o MVP completo do **Gohit** — hub interno de replicação de hits cross-brand para as marcas Apice, Rituaria e Gocase. O projeto inclui scaffolding do Next.js 15, schema do Supabase, pipeline de IA em 4 passos (Claude + GPT-image-1 + ElevenLabs + FFmpeg), 4 abas de interface e o pacote "Ligar no Play" — reduzindo o time-to-replicate de ~30 dias para <24h. O módulo de Referências Externas foi movido para pós-MVP (foco total em hits internos).

## Context

### Problem

O time de conteúdo processa ~5.000 conteúdos novos/dia com 30 pessoas. Replicar um hit de uma marca para outra leva até 30 dias por falta de ferramentas, dados descentralizados e risco de retroalimentação criativa. Hits são perdidos no ruído.

### Affected Users

Equipe interna de marketing e conteúdo do GoGroup (Apice, Rituaria, Gocase) — PMs, criadores e coordenadores de conteúdo.

### Success Criteria

- [ ] 60 combinações processadas (30 hits × 2 marcas destino) salvas no DB
- [ ] Replicability check funcionando — alguns resultam `not_replicable`
- [ ] ≥10 sugestões com imagem gerada via GPT-image-1
- [ ] ≥10 sugestões com vídeo gerado (template + ElevenLabs + FFmpeg)
- [ ] 4 abas navegáveis em produção (Vercel): Planejamento, Análise de Hits, Xadrez, Alertas
- [ ] Xadrez visual com 60 células preenchidas (ícones de output mode)
- [ ] "Ligar no Play" copia pacote completo com link de mídia
- [ ] "Copiar WhatsApp" gera mensagem formatada

## Scope

### Included

- Scaffolding Next.js 15 + TypeScript + Tailwind + shadcn/ui do zero
- Schema Supabase completo (migrations + seed dos 30 hits)
- Upload dos MP4 templates no Supabase Storage
- Pipeline de IA: Steps 1-4 (Claude, GPT-image-1, ElevenLabs, FFmpeg)
- Supabase Edge Function para merge de vídeo (ElevenLabs + FFmpeg WASM)
- Polling assíncrono para geração de vídeo (status a cada 3s)
- **4 abas funcionais:** Planejamento, Análise de Hits, Xadrez de Replicação, Alertas
- Modal "Ligar no Play" com copy-paste + download de mídia
- Botão "Copiar WhatsApp" com mensagem formatada
- Admin pages: /hits, /templates, /config
- Deploy na Vercel + Supabase managed
- Script para pré-gerar as 60 sugestões antes da demo

### Excluded (pós-MVP)

- **Módulo de Referências Externas** — Aba 5, importação de planilha XLSX/CSV, injeção de refs nos prompts (ADR-003 documentado, implementar na v2)
- Autenticação (demo pública sem login)
- Ingestão automática (TikTok scraper, Meta API)
- Bot WhatsApp automático (Z-API / Evolution API)
- Meta Ads API (publicação automática)
- Modelo ML de score
- RLS multi-tenant robusta
- Geração de vídeos 100% sintéticos (Sora, Runway)
- Índice de frescor (% sugestões com referências externas) — depende do módulo acima

## Technical Design

### Affected Areas

| Area | Changes |
|------|---------|
| `app/` | 5 tabs + admin pages (Next.js App Router) |
| `app/api/` | API routes: evaluate, adapt, image, video (polling) |
| `lib/brands/` | Brand config registry (apice, rituaria, gocase) |
| `lib/ai/` | Claude, OpenAI, ElevenLabs client wrappers |
| `lib/pipeline/` | Pipeline orchestrator (4 steps + retry) |
| `lib/supabase/` | Typed query helpers + client |
| `components/` | ContentCard, LigarNoPlayModal, XadrezMatrix |
| `supabase/migrations/` | Schema SQL completo |
| `supabase/functions/video-merge/` | Edge Function Deno + FFmpeg WASM |
| `supabase/seed/` | SQL seed dos 30 hits + brand contexts |

### Data Model

```sql
-- Ver maquina-de-hits.md §5 para schema completo.
-- Tabelas usadas no MVP:
brands           -- apice, rituaria, gocase (slug, context, products_context, elevenlabs_voice_id)
contents         -- 30 hits seed (10 por marca)
content_metrics  -- métricas por hit (CTR, ROAS, views, etc.)
content_suggestions  -- output do pipeline (1 por origem×destino×output_mode)
video_templates  -- MP4 templates por marca+plataforma
alerts           -- alertas formatados para WhatsApp
settings         -- config global (thresholds, etc.)

-- Criada no schema mas NÃO usada no MVP (pós-MVP):
external_references  -- referências de mercado via planilha — Aba 5 / ADR-003

-- View:
v_replication_matrix  -- JOIN contents × brands × suggestions para o xadrez
```

### API/Interface Changes

```typescript
// Pipeline API Routes
POST /api/pipeline/run
  body: { originContentId: string; targetBrandId: string; outputMode: 'image' | 'video' }
  response: { suggestionId: string; status: 'pending' | 'processing' | 'done' | 'error' }

GET /api/pipeline/status/:suggestionId
  response: { status: string; suggestion?: ContentSuggestion }

// Step routes (chamados internamente pelo orchestrator)
POST /api/evaluate   → Step 1: { is_replicable, reason }
POST /api/adapt      → Step 2: { name, hook, scenery, description, content_description, briefing, ... }
POST /api/image      → Step 3a: { image_url }
POST /api/video      → Step 3b: inicia Edge Function async, retorna { jobId }

// Supabase Edge Function
POST supabase/functions/v1/video-merge
  body: { suggestionId, hookText, voiceId, templateUrl }
  → Chama ElevenLabs → salva MP3 → FFmpeg WASM merge com template → salva MP4 → atualiza DB
```

### Fluxo de Polling para Vídeo

```
UI → POST /api/pipeline/run (outputMode='video')
   → API cria suggestion com status='processing'
   → API chama supabase.functions.invoke('video-merge') [async, não aguarda]
   → Retorna { suggestionId }
UI → poll GET /api/pipeline/status/:id a cada 3s
Edge Function → completa → atualiza suggestion.status='draft' + final_video_url
UI → poll encontra status='draft' → renderiza resultado
```

### Brand Config Registry

```typescript
// lib/brands/types.ts
interface BrandConfig {
  slug: 'apice' | 'rituaria' | 'gocase'
  displayName: string
  toneOfVoice: string       // injetado nos prompts
  products: string[]        // catálogo para grounding
  promptModifiers: string[] // do/don't para a IA
  elevenlabsVoiceId: string
  defaultOutputMode: 'image' | 'video'
  colorPalette: { primary: string; secondary: string }
}
```

## Implementation Plan

### Phase 1: Scaffolding + Setup (est. 2-3h)

> **Prioridade máxima** — base que tudo depende

1. [x] `npx create-next-app@latest gohit --typescript --tailwind --app --src-dir --import-alias "@/*"`
2. [ ] `git init && git add . && git commit -m "chore: initial Next.js scaffold"`
3. [x] Instalar dependências:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk openai \
     @radix-ui/react-dialog @radix-ui/react-tabs shadcn-ui \
     zod fluent-ffmpeg \
     class-variance-authority clsx tailwind-merge lucide-react
   npm install -D supabase
   ```
3. [ ] Inicializar shadcn/ui: `npx shadcn@latest init` (usar tema neutro/slate)
4. [ ] Instalar componentes shadcn: `npx shadcn@latest add button card tabs dialog badge progress toast table`
5. [ ] Configurar Supabase CLI: `supabase init`
6. [ ] Criar projeto no Supabase Dashboard + copiar URL e anon key
7. [ ] Criar `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ANTHROPIC_API_KEY=
   OPENAI_API_KEY=
   ELEVENLABS_API_KEY=
   ```
8. [ ] Configurar Supabase client em `lib/supabase/client.ts` e `lib/supabase/server.ts`
9. [ ] Configurar `next.config.ts` (headers CORS, image domains)
10. [ ] Configurar `tsconfig.json` (strict mode, paths `@/*`)

**Validação:** `npm run dev` abre sem erros. `npm run type-check` passa.

---

### Phase 2: Database Schema + Seed (est. 2-3h)

1. [ ] Criar migration `supabase/migrations/001_initial_schema.sql` com schema completo (ver `maquina-de-hits.md §5`)
   - Todas as 8 tabelas + índices + view `v_replication_matrix`
2. [ ] Criar migration `supabase/migrations/002_storage_buckets.sql`:
   ```sql
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('templates', 'templates', true), ('suggestions', 'suggestions', true);
   ```
3. [ ] Aplicar migrations: `supabase db push`
4. [ ] Criar `supabase/seed/01_brands.sql` com dados das 3 marcas (context, products_context, elevenlabs_voice_id)
5. [ ] Criar script `scripts/import-hits.ts` para converter CSV → SQL seed:
   - Ler CSV fornecido → INSERT em `contents` + `content_metrics`
   - Gerar `supabase/seed/02_contents.sql`
6. [ ] Upload dos MP4 templates no Supabase Storage bucket `templates`
7. [ ] Criar `supabase/seed/03_video_templates.sql` apontando para as URLs dos MP4s uploaded
8. [ ] Executar seed completo: `supabase db reset` ou aplicar seeds manualmente
9. [ ] Gerar types TypeScript do schema: `supabase gen types typescript --linked > lib/supabase/types.ts`

**Validação:** Supabase Table Editor mostra 3 brands, 30 contents, métricas, templates. View `v_replication_matrix` retorna 60 linhas (30 hits × 2 destinos).

---

### Phase 3: Pipeline de IA (est. 4-6h)

> **Core do produto** — implementar antes da UI

#### 3.1 — Brand Config Registry

1. [ ] Criar `lib/brands/types.ts` com interface `BrandConfig`
2. [ ] Criar `lib/brands/apice.ts`, `lib/brands/rituaria.ts`, `lib/brands/gocase.ts`
3. [ ] Criar `lib/brands/index.ts` com registry `{ apice, rituaria, gocase }`

#### 3.2 — AI Client Wrappers

4. [ ] `lib/ai/claude.ts` — wrapper do Anthropic SDK com prompt caching:
   ```typescript
   import Anthropic from '@anthropic-ai/sdk'
   // client singleton + helper callClaude(systemPrompt, userPrompt, options)
   // Wrap system prompt estático com cache_control: { type: 'ephemeral' }
   ```
5. [ ] `lib/ai/openai.ts` — wrapper GPT-image-1:
   ```typescript
   // generateImage(prompt, size, quality) → imageUrl
   // size: '1024x1536' (vertical) | '1024x1024' (quadrado)
   // quality: 'high'
   ```
6. [ ] `lib/ai/elevenlabs.ts` — wrapper ElevenLabs TTS:
   ```typescript
   // synthesize(text, voiceId) → Buffer (MP3)
   // model: 'eleven_multilingual_v2'
   ```

#### 3.3 — Pipeline Steps (API Routes)

7. [ ] `app/api/evaluate/route.ts` — Step 1: Replicability Check
   - Recebe: `{ contentId, targetBrandId }`
   - Busca hit + brand context do Supabase (sem referências externas no MVP)
   - Monta prompt (ver spec §6 — Passo 1; omitir bloco de referências externas)
   - Temperatura: 0.2, max_tokens: 500
   - Parse JSON response com try/catch + retry 1x se JSON inválido
   - Salva `is_replicable` + `replicability_reason` em `content_suggestions`
   - Retorna `{ is_replicable, reason, suggestionId }`

8. [ ] `app/api/adapt/route.ts` — Step 2: Geração da Sugestão
   - Recebe: `{ suggestionId }` (já existe no DB com is_replicable=true)
   - Busca hit + brand contexts (sem referências externas no MVP)
   - Monta prompt (ver spec §6 — Passo 2; omitir bloco de referências externas e campo `external_references_used`)
   - Temperatura: 0.7, max_tokens: 3000
   - Parse JSON + retry 1x
   - Salva todos os campos gerados em `content_suggestions`
   - Retorna `{ suggestion }`

9. [ ] `app/api/image/route.ts` — Step 3a: Geração de Imagem
   - Recebe: `{ suggestionId }`
   - Busca suggestion + brand context
   - Monta prompt de imagem (ver spec §6 — Passo 3a)
   - Chama GPT-image-1 (com fallback para Flux Pro se falhar)
   - Salva imagem no Supabase Storage `suggestions/{suggestionId}/image.png`
   - Atualiza `suggestion.image_url` + `output_mode='image'`
   - Retorna `{ image_url }`

10. [ ] `app/api/video/route.ts` — Step 3b: Iniciar geração de vídeo (async)
    - Recebe: `{ suggestionId }`
    - Atualiza `suggestion.status = 'processing'`
    - Invoca Edge Function `video-merge` via `supabase.functions.invoke()` (não aguarda)
    - Retorna `{ status: 'processing' }`

11. [ ] `app/api/pipeline/status/[id]/route.ts` — Polling
    - Busca `content_suggestions` por ID
    - Retorna `{ status, suggestion }` 
    - UI faz polling a cada 3s até status ≠ 'processing'

12. [ ] `app/api/pipeline/run/route.ts` — Orchestrator
    - Recebe: `{ originContentId, targetBrandId, outputMode }`
    - Executa Step 1 (evaluate)
    - Se `is_replicable = false` → retorna com status `not_replicable`
    - Executa Step 2 (adapt)
    - Se `outputMode = 'image'` → executa Step 3a (image), retorna `done`
    - Se `outputMode = 'video'` → executa Step 3b async (video), retorna `processing` com `suggestionId`

#### 3.4 — Edge Function para Vídeo (FFmpeg)

13. [ ] Criar `supabase/functions/video-merge/index.ts` (Deno):
    ```typescript
    // 1. Recebe: { suggestionId, hookText, voiceId, templateUrl }
    // 2. Chama ElevenLabs API → MP3 buffer
    // 3. Salva MP3 em Supabase Storage: suggestions/{id}/audio.mp3
    // 4. Usa @ffmpeg/ffmpeg (WASM) no Deno para merge:
    //    ffmpeg -i template.mp4 -i audio.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -shortest output.mp4
    // 5. Salva MP4 em Storage: suggestions/{id}/final.mp4
    // 6. Atualiza content_suggestions: final_video_url, audio_url, status='draft'
    // FALLBACK: se FFmpeg WASM falhar → logar erro, status='error', não travar
    ```
    > ⚠️ **Nota técnica**: `@ffmpeg/ffmpeg` WASM funciona em Deno, mas pode ser lento (cold start). Testar no Supabase Edge antes de confiar. Fallback: implementar merge via API route Next.js com fluent-ffmpeg em Fluid Function (timeout 15min).

14. [ ] Deploy da Edge Function: `supabase functions deploy video-merge`

**Validação:** Testar cada step individualmente via curl. Pipeline completo (imagem) deve completar em <30s. Pipeline de vídeo deve completar em <3min via polling.

---

### Phase 4: UI Foundation (est. 3-4h)

1. [ ] Criar layout principal `app/layout.tsx` com navegação das 5 abas (shadcn `<Tabs>`)
2. [ ] Criar componente `components/ContentCard.tsx` (reutilizável):
   - Props: `content | suggestion`, `showMetrics`, `showOutputMode`
   - Exibe: thumb, hook, produto, creator, views, CTR, ROAS, impressions, engagement, spend
   - Badge: 🖼️ Imagem / 🎥 Vídeo (só em sugestões)
   - Score bar: `████████░░ 82/100`
   - Ações: [Ver detalhes] [▶️ Ligar no Play]
3. [ ] Criar componente `components/LigarNoPlayModal.tsx`:
   - **MVP — placeholder para Meta Ads API (v2):** o botão "Ligar no Play" no produto final publica o criativo diretamente no Meta Ads via API para teste de CTR. No MVP, simula essa ação com download + marcação manual de status.
   - Renderiza pacote copy-paste completo (ver spec §11)
   - Se imagem: download PNG + botão "Marcar in_play"
   - Se vídeo: download MP4 + download MP3 + "Marcar in_play"
   - Botão "📋 Copiar tudo" copia texto completo para clipboard
   - **v2:** substituir download por chamada à Meta Ads API — subir criativo como ad de teste de CTR automaticamente
4. [ ] Criar componente `components/PipelineProgress.tsx`:
   - Stepper visual com 4 passos + indicador de progresso
   - Status: idle / loading / done / error por step
5. [ ] Criar hook `hooks/usePipelineRun.ts`:
   - `run(originContentId, targetBrandId, outputMode)` → inicia pipeline
   - Polling a cada 3s se outputMode='video'
   - Retorna `{ status, suggestion, error, startRun }`
6. [ ] Criar hook `hooks/useSupabase.ts` com tipagem das queries principais

**Validação:** ContentCard renderiza corretamente com dados seed. LigarNoPlayModal abre e copia para clipboard.

---

### Phase 5: 5 Abas (est. 4-6h)

#### Aba 1 — Planejamento (`app/planejamento/page.tsx`)

1. [ ] Filtros: marca destino, plataforma, status, score mínimo, output_mode (imagem/vídeo)
2. [ ] Grid de ContentCards de `content_suggestions` ordenados por `estimated_impact_score`
3. [ ] Badge "NÃO REPLICÁVEL" (tooltip com `replicability_reason`)
4. [ ] Ações do card: Aprovar, Rejeitar, Ligar no Play, Ver hit origem
5. [ ] Botão "Gerar todas as réplicas pendentes" → batch run para sugestões não geradas

#### Aba 2 — Análise de Hits (`app/analise-hits/page.tsx`)

6. [ ] Filtros: marca, plataforma, período
7. [ ] Lista de `contents` com ContentCard (métricas reais do seed)
8. [ ] Mini-ranking: top 5 hits do período (ordenado por views)
9. [ ] Botão por card: "Gerar réplicas para outras marcas" → modal escolhe outputMode → inicia pipeline

#### Aba 3 — Xadrez de Replicação (`app/xadrez/page.tsx`)

10. [ ] Query `SELECT * FROM v_replication_matrix ORDER BY ...`
11. [ ] Tabela visual com hits nas linhas e marcas destino nas colunas
12. [ ] Células com ícones: ⬜ / ❌ / ⏳ / ✅ / 🚫 + 🖼️/🎥
13. [ ] Célula clicável → drawer lateral (shadcn `<Sheet>`) com:
    - ContentCard da sugestão
    - Preview de imagem OU video player
    - Justificativa da IA (se not_replicable)
    - Ações: aprovar, rejeitar, ligar no play
14. [ ] Filtros: marca origem, plataforma, output_mode, score
15. [ ] Indicadores de topo: total, geradas %, aprovadas %, não replicáveis %, pendentes %

#### Aba 4 — Alertas (`app/alertas/page.tsx`)

16. [ ] Feed cronológico de `alerts`
17. [ ] Por alerta: botão "📱 Copiar para WhatsApp" (copia `message_formatted`)
18. [ ] Relatório diário por marca × plataforma

**Validação:** 4 abas navegáveis. Xadrez exibe 60 células com ícones corretos. Drawer lateral abre e ações funcionam.

---

### Phase 6: Admin Pages + Demo Prep (est. 2-3h)

1. [ ] `app/hits/page.tsx` — CRUD admin para seeds (listar, editar contexto)
2. [ ] `app/templates/page.tsx` — Gestão de video_templates (upload MP4, marcar default)
3. [ ] `app/config/page.tsx` — Editar brand context, prompts, thresholds
4. [ ] Script `scripts/pregerate-all.ts`:
   ```typescript
   // Para cada combinação (30 hits × 2 marcas destino = 60):
   // 1. Verificar se suggestion já existe → pular se sim
   // 2. Executar pipeline completo (evaluate → adapt → image OU video)
   // 3. Delay entre chamadas para evitar rate limit
   // Executar: npx tsx scripts/pregenerate-all.ts
   ```
5. [ ] Deploy na Vercel: conectar repo, adicionar env vars, `vercel --prod`
6. [ ] Pré-gerar as 60 sugestões com `scripts/pregenerate-all.ts`
7. [ ] Verificar critérios de sucesso do hackathon (ver checklist abaixo)

**Validação:** Script pré-gera 60 sugestões. App em produção na Vercel com 60 células no xadrez.

---

## Testing

### Manual Tests (MVP — sem suite automatizada)

```
Por cada phase:
- Phase 1: npm run dev sem erros, npm run type-check passa
- Phase 2: 30 hits + 3 brands + v_replication_matrix com 60 rows
- Phase 3: curl direto em cada API route com dados seed
- Phase 4: ContentCard renderiza, LigarNoPlay copia clipboard
- Phase 5: 4 abas navegáveis, xadrez clicável com drawer lateral
- Phase 6: 60 sugestões geradas, deploy Vercel OK
```

### Cenários Críticos de Demo

```
1. Abrir xadrez → 60 células preenchidas
2. Clicar célula 'draft' → drawer abre com preview
3. Clicar "Ligar no Play" → modal com pacote + download funcionando
4. Copiar WhatsApp → mensagem formatada no clipboard
5. Gerar nova réplica ao vivo (deve completar <30s para imagem)
```

## Decisions

### Impact on Existing Decisions

| ADR | Current Decision | Proposed Change | Action |
|-----|------------------|-----------------|--------|
| ADR-001 | Next.js 15 + Supabase como stack | Confirmado | None |
| ADR-002 | Pipeline sequencial de 4 passos | Step 3b é async com polling | Confirmado — polling é implementação, não mudança de decisão |
| ADR-003 | Referências externas anti-endogamy | **Diferido para pós-MVP** — módulo de Referências Externas removido do escopo atual | Acknowledge — implementar na v2 |
| ADR-004 | Brand config registry | Confirmado — `lib/brands/` com interface tipada | None |

### New Decisions Required

| Decision | Context | Options Considered | Resolution |
|----------|---------|---------------------|------------|
| Auth do MVP | Hackathon, demo interna | Login vs. público | **Demo pública sem login** — velocidade > segurança |
| FFmpeg no Vercel | Serverless sem binário FFmpeg | @ffmpeg/wasm, Fluid Functions, Edge Function | **Supabase Edge Function** com @ffmpeg/ffmpeg WASM (Deno) |
| Vídeo async | Geração leva >30s | SSE, WebSocket, polling | **Polling a cada 3s** — simples e confiável para MVP |
| Modelo Claude | Spec dizia claude-sonnet-4-7 | 4-6 vs. 4-7 | **claude-sonnet-4-6** — modelo disponível atualmente |

> **ADR-005** a criar: `005-ffmpeg-supabase-edge-function.md` antes de implementar Phase 3.4

## Reference Materials

### Source Documents

| File | Relevant Sections |
|------|-------------------|
| `maquina-de-hits.md` | §5 Schema completo (copiar SQL direto), §6 Prompts completos (Steps 1-4), §8 Rotas de UI, §9 Layout do ContentCard, §10 Xadrez layout+legenda, §11 Template "Ligar no Play", §12 Template WhatsApp |

**⚠️ Executor Note:** Ler `maquina-de-hits.md` inteiro antes de implementar. Contém os prompts exatos do Claude (§6), o SQL completo (§5) e os templates de copy-paste (§11, §12). Não reescrever — usar o que já está especificado.

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| @ffmpeg/ffmpeg WASM não funciona no Deno/Edge Function | Médio | Alto | Fallback: Fluid Function no Vercel (15min timeout) com fluent-ffmpeg; ou pular geração de vídeo ao vivo e usar vídeos pré-gerados na demo |
| GPT-image-1 rate limit durante pré-geração dos 60 | Alto | Médio | Script com delay de 2s entre chamadas + fallback Flux Pro (FAL.ai) |
| Claude retorna JSON inválido | Médio | Médio | JSON.parse em try/catch + retry 1x com instrução "responda SOMENTE JSON válido" |
| ElevenLabs voz inadequada/falha | Baixo | Médio | Fallback: OpenAI TTS (`tts-1-hd`) com voz pt-BR |
| FFmpeg merge falha (template incompatível) | Médio | Médio | Log + retry com template genérico + status='error' na suggestion |
| Supabase Edge Function cold start >10s | Médio | Baixo | Pré-gerar tudo antes da demo com script pregenerate-all |
| Vercel timeout nas API routes longas | Baixo | Alto | Mover orquestração para Server Action com streaming, ou garantir que Steps 1+2 completam em <25s |
| Xadrez lento com queries complexas | Baixo | Baixo | v_replication_matrix com índices — 60 linhas é trivial |

## Final Checklist

```
[ ] npm run dev sem erros
[ ] npm run type-check passa (0 erros)
[ ] npm run build passa
[ ] 30 hits no DB (10 × Apice, Rituaria, Gocase)
[ ] v_replication_matrix retorna 60 linhas
[ ] Pipeline Steps 1-4 testados individualmente
[ ] 60 sugestões pré-geradas (script pregenerate-all)
[ ] ≥10 imagens geradas (GPT-image-1)
[ ] ≥10 vídeos gerados (ElevenLabs + FFmpeg)
[ ] 4 abas navegáveis em produção
[ ] Xadrez com 60 células + ícones corretos
[ ] "Ligar no Play" funciona (copy + download)
[ ] "Copiar WhatsApp" funciona
[ ] Deploy Vercel produção OK
[ ] Demo de 2-3 min ensaiada
```

---

**Created:** 2026-04-24
**Author:** lucas.braide@gocase.com
**Status:** In Progress

**Spec source:** `maquina-de-hits.md` (Gohit Hackathon Spec v1)
