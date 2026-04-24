# PRP: Foco em Imagem + Meta Ads Integration + Análise de Hits

> Product Requirements Prompt - Desativar modo vídeo/ElevenLabs, integrar Meta Ads API para publicação de criativos e adicionar botão de análise de hits com insights por IA

<!--
PROGRESS TRACKING:
- Mark tasks as [x] when completed
- Mark success criteria as [x] when verified
- Update Status below when starting (In Progress) and finishing (Completed)
- Add "✅ Completed: YYYY-MM-DD" after each phase validation
-->

## Summary

Três mudanças simultâneas: (1) remover completamente o modo vídeo/ElevenLabs da UI — somente imagem disponível; (2) integrar Meta Ads API no botão "Ligar no Play" para publicar o criativo gerado numa campanha existente de teste de CTR; (3) adicionar botão "Analisar Hits" na página `/analise-hits` que usa Claude para gerar insights curtos e acionáveis por hit.

## Context

### Problem

**Video/ElevenLabs:** A integração de vídeo com ElevenLabs adiciona complexidade desnecessária na fase de validação do produto. Para a demo e validação de CTR com Meta Ads, imagens são suficientes e mais rápidas de produzir e testar.

**Meta Ads:** O fluxo atual de "Ligar no Play" é manual — o usuário precisa baixar a imagem e fazer upload no Ads Manager manualmente. Isso cria fricção e perde o tracking automático de CTR real vs estimado.

**Análise de Hits:** Os hits estão sendo importados via CSV mas não há nenhuma camada analítica — o time não sabe qual hit tem maior potencial de replicação, por que funcionou ou para qual marca deve ir. O botão de análise preenche essa lacuna no MVP enquanto a análise automática não está pronta.

### Affected Users

- PMs e coordenadores de conteúdo do GoGroup: usam o botão de análise para priorizar replicações
- Time de performance: usa o "Ligar no Play" → Meta Ads para subir criativos rapidamente
- Time de conteúdo: acompanha status dos ads em teste no painel de Análise de Hits

### Success Criteria

- [ ] Modo vídeo removido de toda a UI (dropdowns, modais, badges)
- [ ] ElevenLabs comentado no código (não deletado — facilita reativação futura)
- [ ] "Ligar no Play" com imagem gerada publica na Meta Ads API (adset existente ou novo duplicado)
- [ ] Suggestion salva `meta_ad_id` + `meta_adset_id` + `meta_status` após publicação
- [ ] Painel em `/analise-hits` exibe status das imagens em teste no Facebook
- [ ] Botão "🔍 Analisar Hits" no topo de `/analise-hits`
- [ ] Análise gera bullet points curtos por hit: score, por que funciona, marca destino recomendada, alerta se hit emergente
- [ ] Insights exibidos inline em cada card de hit (não persistidos no DB)

## Scope

### Included

**Fase 1 — Disable vídeo:**
- Remover opção de vídeo de todos os dropdowns e modais
- Comentar `lib/ai/elevenlabs.ts` e `app/api/video/route.ts`
- Atualizar ADR-002 para refletir simplificação do pipeline

**Fase 2 — Meta Ads Integration:**
- `lib/meta/ads.ts` — wrapper da Meta Graph API v21.0
- Lógica: verificar adsets da campanha → se adset não cheio, adiciona; se cheio, duplica adset vazio e adiciona
- `app/api/meta/publish/route.ts` — endpoint chamado pelo "Ligar no Play"
- DB: adicionar colunas `meta_ad_id`, `meta_adset_id`, `meta_status` em `content_suggestions`
- Env vars: `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_CAMPAIGN_ID`, `META_ADSET_MAX_ADS`
- Atualizar `LigarNoPlayModal` para chamar a API e mostrar resultado
- Migration SQL para novas colunas

**Fase 3 — Análise de Hits:**
- `app/api/analysis/hits/route.ts` — POST com lista de content IDs → Claude → JSON de insights
- Botão "🔍 Analisar Hits" no topo de `/analise-hits`
- Exibir insights como seção expansível dentro de cada ContentCard na página
- Estrutura de insights: score (0-100), bullets curtos (máx 3 por seção), marca destino recomendada, flag de hit emergente

**Fase 4 — Painel Meta Ads em /analise-hits:**
- Fetch de métricas reais dos ads por `meta_ad_id` via Meta Insights API
- Badge de status (⬜ Não publicado / ⏳ Em teste / ✅ Resultado disponível) por sugestão
- Seção "Performance Real Facebook" com CTR real, impressões, spend do dia

### Excluded (não fazer agora)

- Criar campanha ou adset do zero (assume campanha e adset base já existem)
- Envio automático de análise sem botão (análise manual → automático é pós-MVP)
- Persistência de insights no DB (só em memória React por ora)
- Webhook da Meta para atualização em tempo real (polling on-demand suficiente)
- Relatório diário automático de Meta Ads

## Technical Design

### Affected Areas

| Area | Changes |
|------|---------|
| `lib/ai/elevenlabs.ts` | Comentar todo o conteúdo (não deletar) |
| `app/api/video/route.ts` | Comentar conteúdo, retornar 503 "temporariamente desativado" |
| `app/api/pipeline/run/route.ts` | Remover branch de outputMode='video' |
| `app/analise-hits/client.tsx` | Remover dropdown de output_mode, adicionar botão "Analisar Hits" |
| `app/planejamento/client.tsx` | Remover filtro output_mode = 'video' das opções |
| `components/LigarNoPlayModal.tsx` | Remover seção de vídeo, adicionar chamada à Meta Ads API |
| `lib/meta/ads.ts` | Novo wrapper da Meta Graph API |
| `app/api/meta/publish/route.ts` | Nova route para publicar criativo |
| `app/api/analysis/hits/route.ts` | Nova route de análise com Claude |
| `supabase/migrations/003_meta_ads_columns.sql` | Novas colunas em content_suggestions |
| `.env.local` | Adicionar META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_CAMPAIGN_ID, META_ADSET_MAX_ADS |

### Data Model

```sql
-- Migration 003: adicionar colunas de Meta Ads em content_suggestions
ALTER TABLE content_suggestions
  ADD COLUMN IF NOT EXISTS meta_ad_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_adset_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_status TEXT
    CHECK (meta_status IN ('pending', 'in_test', 'result_available'))
    DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_suggestions_meta_ad ON content_suggestions(meta_ad_id)
  WHERE meta_ad_id IS NOT NULL;
```

```typescript
// Estrutura de resposta da análise de hits
interface HitInsights {
  content_id: string
  score: number  // 0-100
  bullets: {
    porque_funciona: string[]  // máx 3 bullets curtos
    marca_destino: string[]    // ex: ["Replicar para Gocase: produto tech equivalente"]
    alertas: string[]          // ex: ["CTR 2x acima da média da marca — hit emergente!"]
  }
  is_emergente: boolean
  marca_destino_recomendada: 'apice' | 'rituaria' | 'gocase' | null
}
```

### API/Interface Changes

```typescript
// Meta Ads wrapper
// lib/meta/ads.ts

const META_API_BASE = 'https://graph.facebook.com/v21.0'

interface AdCreative {
  imageUrl: string      // URL pública da imagem gerada
  title: string         // suggestion.name
  body: string          // suggestion.hook
  callToAction?: string
}

interface PublishResult {
  ad_id: string
  adset_id: string
  created_new_adset: boolean
}

async function publishImageAd(
  campaignId: string,
  creative: AdCreative,
  maxAdsPerAdset: number
): Promise<PublishResult>

async function getAdInsights(adId: string): Promise<{
  ctr: number
  impressions: number
  spend: number
  reach: number
  date: string
}>
```

```typescript
// Nova API route
POST /api/meta/publish
  body: { suggestionId: string }
  → Busca suggestion + imagem gerada
  → Chama publishImageAd()
  → Salva meta_ad_id, meta_adset_id, meta_status='in_test' na suggestion
  → Retorna { ad_id, adset_id, ads_manager_url }

// Nova API route  
POST /api/analysis/hits
  body: { contentIds: string[] }
  → Busca contents + métricas
  → Monta prompt para Claude com todos os hits
  → Parse JSON de insights
  → Retorna HitInsights[]

// GET de métricas em tempo real (chamado pelo painel)
GET /api/meta/insights?suggestionId=xxx
  → Busca meta_ad_id da suggestion
  → Chama getAdInsights()
  → Retorna métricas reais do Facebook
```

### Prompt de Análise de Hits (Claude)

```
SYSTEM:
Você é especialista em análise de performance de conteúdo para e-commerce.
Analise os hits fornecidos e gere insights curtos e acionáveis.

USER:
Analise estes hits e retorne um JSON com insights por hit:

<HITS>
[array de hits com métricas: hook, produto, marca, CTR, ROAS, views, engagement]
</HITS>

<MEDIA_DA_MARCA>
[CTR médio, ROAS médio por marca para comparação]
</MEDIA_DA_MARCA>

Retorne JSON:
{
  "insights": [
    {
      "content_id": "uuid",
      "score": 0-100,
      "bullets": {
        "porque_funciona": ["bullet 1", "bullet 2"],    // máx 3, máx 10 palavras cada
        "marca_destino": ["Replicar para X: motivo"],   // máx 2
        "alertas": ["CTR Nx acima da média — hit emergente"]  // vazio se não emergente
      },
      "is_emergente": true/false,
      "marca_destino_recomendada": "gocase" | "rituaria" | "apice" | null
    }
  ]
}

REGRAS:
- Bullets EXTREMAMENTE curtos — máx 10 palavras cada
- is_emergente = true se CTR > 150% da média da marca ou ROAS > 5x
- marca_destino_recomendada = null se é hit de todas as marcas
- score = ponderação de CTR (40%), ROAS (30%), views (20%), engagement (10%)
```

## Implementation Plan

### Phase 1: Desativar Vídeo + ElevenLabs

1. [ ] Comentar `lib/ai/elevenlabs.ts` (envolve todo o conteúdo em `/* ... */`, adicionar comentário `// Desativado temporariamente — ADR-002 v2.0`)
2. [ ] Comentar `app/api/video/route.ts` (retornar `NextResponse.json({ error: 'Geração de vídeo temporariamente desativada' }, { status: 503 })`)
3. [ ] Atualizar `app/api/pipeline/run/route.ts`: remover branch `if (outputMode === 'video')` — forçar sempre `'image'`
4. [ ] Remover dropdown de output_mode de `app/analise-hits/client.tsx` (já passa `'image'` fixo)
5. [ ] Remover filtro de output_mode = 'video' de `app/planejamento/client.tsx`
6. [ ] Remover seção de vídeo de `components/LigarNoPlayModal.tsx` (só manter lógica de imagem)
7. [ ] Atualizar ADR-002 para v2.0: Step 3b (ElevenLabs/FFmpeg) desativado temporariamente, pipeline focado em imagem para validação de CTR via Meta Ads

**Validação:** `npm run type-check && npm run build` passa. Nenhuma referência a `synthesize` ou `video` no fluxo ativo.

---

### Phase 2: Migration DB + Env Vars

1. [ ] Criar `supabase/migrations/003_meta_ads_columns.sql` com as 3 novas colunas + index
2. [ ] Adicionar ao `.env.local`:
   ```
   META_ACCESS_TOKEN=
   META_AD_ACCOUNT_ID=act_XXXXXXXX
   META_CAMPAIGN_ID=
   META_ADSET_MAX_ADS=10
   ```
3. [ ] Rodar migration no Supabase (SQL Editor ou `supabase db push`)

**Validação:** Colunas `meta_ad_id`, `meta_adset_id`, `meta_status` existem em `content_suggestions`.

---

### Phase 3: Meta Ads Wrapper + API Route

1. [ ] Criar `lib/meta/ads.ts`:
   - `getAdsets(campaignId)` → GET `/{campaign_id}/adsets?fields=id,name,ads.limit(1){id}`
   - `countAdsInAdset(adsetId)` → GET `/{adset_id}/ads?summary=true`
   - `duplicateAdset(adsetId)` → POST `/{adset_id}/copies` com `rename_strategy=EXACT_COPY`, `status_option=PAUSED`
   - `createAdCreative(imageUrl, title, body, pageId)` → POST `/{ad_account_id}/adcreatives`
   - `createAd(adsetId, creativeId, name)` → POST `/{ad_account_id}/ads`
   - `publishImageAd(campaignId, creative, maxAds)` → orquestra tudo acima
   - `getAdInsights(adId)` → GET `/{ad_id}/insights?fields=ctr,impressions,spend,reach&date_preset=today`

2. [ ] Criar `app/api/meta/publish/route.ts`:
   - POST recebe `{ suggestionId }`
   - Busca suggestion + image_url no Supabase
   - Valida que image_url existe e meta_status é 'pending'
   - Chama `publishImageAd()`
   - Salva `meta_ad_id`, `meta_adset_id`, `meta_status='in_test'` na suggestion
   - Retorna `{ ad_id, adset_id, created_new_adset, ads_manager_url }`

3. [ ] Criar `app/api/meta/insights/route.ts`:
   - GET com query param `?suggestionId=xxx`
   - Busca `meta_ad_id` da suggestion
   - Chama `getAdInsights()`
   - Retorna métricas do dia

4. [ ] Atualizar `components/LigarNoPlayModal.tsx`:
   - Adicionar botão "🚀 Publicar no Facebook Ads" (só aparece quando `image_url` existe e `meta_status === 'pending'`)
   - Chamar `POST /api/meta/publish` ao clicar
   - Exibir resultado: "✅ Ad publicado! ID: {ad_id}" + link para Ads Manager
   - Se `meta_status === 'in_test'`: mostrar badge "Em teste no Facebook" com link para o ad

**Validação:** POST `/api/meta/publish` com suggestion válida retorna `ad_id`. Verificar no Ads Manager que o ad foi criado no adset correto.

---

### Phase 4: Botão de Análise + Painel Meta em /analise-hits

1. [ ] Criar `app/api/analysis/hits/route.ts`:
   - POST recebe `{ contentIds: string[] }`
   - Busca contents + métricas + brand de cada ID
   - Calcula médias de CTR/ROAS por marca
   - Monta prompt (ver seção acima)
   - Chama Claude (`claude-sonnet-4-6`, temp 0.3, max_tokens 4000)
   - Parse e retorna `HitInsights[]`

2. [ ] Criar `components/HitInsightsCard.tsx`:
   - Props: `insights: HitInsights`
   - Exibe score como badge colorido (verde 70+, amarelo 40-69, vermelho <40)
   - Exibe bullets em 3 seções com ícones (⚡ Por que funciona / 🎯 Marca destino / 🚨 Alertas)
   - Badge "🔥 Hit Emergente" se `is_emergente = true`

3. [ ] Atualizar `app/analise-hits/client.tsx`:
   - Adicionar botão "🔍 Analisar Hits" no topo (ao lado do "Importar CSV")
   - Estado: `analyzing: boolean`, `insights: Record<string, HitInsights>`
   - Ao clicar: POST `/api/analysis/hits` com todos os `content.id` do filtro atual
   - Exibir `<HitInsightsCard>` abaixo de cada `ContentCard` quando insights disponíveis
   - Loading state: skeleton ou spinner enquanto Claude processa

4. [ ] Atualizar `app/analise-hits/page.tsx`:
   - Buscar também suggestions com `meta_status IS NOT NULL` para o painel
   - Passar para o client o mapeamento `contentId → meta_status` das suggestions

5. [ ] Adicionar seção de Meta Ads status em cada card em `/analise-hits`:
   - Badge de status da suggestion relacionada: ⬜ Não publicado / ⏳ Em teste / ✅ Resultado disponível
   - Ao clicar em "✅ Resultado disponível": fetch `/api/meta/insights?suggestionId=xxx` e exibir CTR real

**Validação:** Botão "Analisar Hits" gera insights visíveis por card. Status Meta Ads aparece para hits com suggestions publicadas.

---

## Testing

### Testes Manuais

```
Phase 1:
- Tentar gerar réplica → confirmar que só modo imagem disponível
- Verificar que LigarNoPlayModal não tem mais seção de vídeo

Phase 2:
- Verificar colunas no Supabase Table Editor

Phase 3 (requer env vars Meta preenchidas):
- POST /api/meta/publish com suggestionId de imagem gerada
- Verificar no Ads Manager que ad foi criado
- Se adset cheio: verificar que novo adset foi criado como duplicata

Phase 4:
- Clicar "Analisar Hits" com 5+ hits → ver insights aparecerem por card
- Verificar bullet points curtos e acionáveis
- Verificar badge "Hit Emergente" para hit com CTR alto
```

## Decisions

### Impact on Existing Decisions

| ADR | Current Decision | Proposed Change | Action |
|-----|------------------|-----------------|--------|
| ADR-002 | Pipeline 4 passos incluindo Step 3b (ElevenLabs + FFmpeg) | Step 3b comentado/desativado temporariamente — pipeline fica em 3 passos (Evaluate → Adapt → Image). Reativação futura quando validação de CTR via imagem estiver concluída | Update to v2.0 |

### New Decisions Required

| Decision | Context | Options Considered |
|----------|---------|---------------------|
| Meta Ads Page ID | Para criar ad creatives, a Meta API exige um Facebook Page ID associado | Adicionar META_PAGE_ID como env var — a conta de ads já tem uma page vinculada |
| Tamanho da imagem para Meta Ads Feed | Feed do Facebook recomenda 1200x628 (16:9), mas GPT-image-1 gera 1024x1024 ou 1024x1536 | Usar a imagem gerada diretamente (Meta aceita vários formatos) ou adicionar resize step |

> Para MVP: usar a imagem diretamente sem resize. Meta aceita 1024x1024 para Feed. Documentar no código.

**Nota:** Adicionar `META_PAGE_ID` ao `.env.local` como env var obrigatória na Phase 3.

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Meta Access Token expirado | Médio | Alto | Token de longa duração (60 dias). Documentar no .env.local quando renovar. Retornar erro descritivo se 401 |
| Adset duplicação falha (permissão) | Médio | Médio | Se duplicação falhar, retornar erro e instruir usuário a criar adset manualmente |
| Claude retorna JSON malformado nos insights | Médio | Médio | `callClaudeJSON` já faz retry. Fallback: retornar `{ error: 'Tente novamente' }` |
| Meta API rate limit (200 calls/hora) | Baixo | Baixo | Para MVP com poucos usuários, não é problema |
| image_url da suggestion não é pública | Médio | Alto | Verificar que Supabase Storage bucket 'suggestions' é público (já configurado na migration 002) |

## Final Checklist

```
[ ] npm run type-check passa
[ ] npm run build passa
[ ] npm run lint passa
[ ] Modo vídeo removido da UI
[ ] Meta Ads publish retorna ad_id válido
[ ] Insights de hits gerados com bullets curtos
[ ] ADR-002 atualizado para v2.0
```

---

**Created:** 2026-04-24
**Author:** lucas.braide@gocase.com
**Status:** In Progress
