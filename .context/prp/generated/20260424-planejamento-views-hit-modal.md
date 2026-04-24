# PRP: Kanban / Rank / Visão Geral no Planejamento + Hit Detail Modal + Brand Selector Global

> Product Requirements Prompt - Planning document for complex features

<!--
PROGRESS TRACKING:
- Mark tasks as [x] when completed
- Mark success criteria as [x] when verified
- Update Status below when starting (In Progress) and finishing (Completed)
- Add "✅ Completed: YYYY-MM-DD" after each phase validation
-->

## Summary

Adicionar 3 modos de visualização ao Planejamento (Visão Geral / Kanban / Rank), um modal completo de detalhes ao clicar em qualquer hit na Análise de Hits, e um seletor de marca global via URL param (`?brand=`) com tabs coloridas no topo de cada page — garantindo também consistência de atualização de status com optimistic updates em toda a aplicação.

## Context

### Problem

1. **Análise de Hits sem drill-down:** Clicar num hit não abre nenhum detalhe — transcription, vídeo, sugestões já geradas e ação de "Gerar réplicas" ficam inacessíveis sem sair da tela.
2. **Planejamento visualmente limitado:** Existe apenas uma lista linear de plan-cards. Sem visibilidade de fluxo (Kanban), sem ranking por impacto, sem overview agregado — dificultando priorização e tomada de decisão.
3. **Filtro de marca pouco claro:** O seletor de marca existe por page mas é pequeno, inconsistente entre tabs e não persiste ao navegar.
4. **Status inconsistente:** Ao aprovar/rejeitar uma sugestão, a UI não reflete a mudança imediatamente — o usuário precisa recarregar a página.

### Affected Users

Time interno de marketing/criativo que usa o GoHit diariamente para planejar replicações cross-brand. Eles precisam de visibilidade rápida do pipeline de produção por marca e da capacidade de agir sobre hits específicos sem fricção.

### Success Criteria

- [ ] Clicar em qualquer hit na Análise de Hits abre modal com: imagem/vídeo, transcrição, métricas completas, pills de sugestões existentes e botão "Gerar réplicas"
- [ ] Planejamento oferece 3 views: Visão Geral (KPIs + barra por status + lista), Kanban (4 colunas drag-drop com updates otimistas), Rank (ordenado por estimated_impact_score)
- [ ] Seletor de marca global como tabs grandes coloridas no topo de cada page, lendo/escrevendo `?brand=` na URL
- [ ] Selecionar uma marca em qualquer page persiste ao navegar entre Planejamento, Análise e Xadrez
- [ ] Toda ação de mudança de status (botão ou drag-drop) atualiza o state local imediatamente (optimistic) e sincroniza com a API em background
- [ ] Em caso de erro na API, a mudança otimista é revertida com toast de erro

## Scope

### Included

- `HitDetailModal.tsx` — modal completo de detalhes do hit
- `BrandSelector.tsx` — tabs coloridas por marca, lendo URL param
- `KanbanBoard.tsx` + `KanbanCard.tsx` — board drag-drop com dnd-kit
- 3 view modes no Planejamento: Visão Geral, Kanban, Rank
- Hook `useBrandParam()` — centralizar leitura/escrita de `?brand=`
- Refatoração de optimistic updates em `planejamento/client.tsx`, `xadrez/client.tsx`, `analise-hits/client.tsx`
- Passar `suggestionsMap` para `AnaliseHitsClient` (agrupado por `origin_content_id`)

### Excluded (not doing now)

- Drag-drop entre Kanban e outras views (apenas dentro do board)
- Filtro por status no Kanban (todas as colunas sempre visíveis)
- Notificações em tempo real (WebSocket/Supabase Realtime) — reload manual ou router.refresh()
- Customização de colunas do Kanban
- Exportação de dados por view
- Filtro de plataforma persistido via URL (apenas marca é global agora)

## Technical Design

### Affected Areas

| Área | Mudanças |
|------|----------|
| `app/planejamento/client.tsx` | View toggle state + 3 views + optimistic status updates + brand via URL |
| `app/planejamento/page.tsx` | Ler `searchParams.brand` e pré-filtrar (ou passar ao client) |
| `app/analise-hits/client.tsx` | Click handler para abrir HitDetailModal + brand via URL |
| `app/analise-hits/page.tsx` | Adicionar query de suggestions agrupadas por origin_content_id |
| `app/xadrez/client.tsx` | Brand via URL param (já tem filterOriginBrand, migrar para URL) |
| `components/BrandSelector.tsx` | **NOVO** — tabs coloridas globais |
| `components/HitDetailModal.tsx` | **NOVO** — modal completo do hit |
| `components/KanbanBoard.tsx` | **NOVO** — board com dnd-kit |
| `components/KanbanCard.tsx` | **NOVO** — card do Kanban |
| `lib/hooks/useBrandParam.ts` | **NOVO** — hook para URL param de marca |

### Data Model

Sem alterações no banco. Todas as queries são extensões das existentes:

```typescript
// analise-hits/page.tsx — adicionar ao Promise.all:
supabase
  .from('content_suggestions')
  .select('id, origin_content_id, status, estimated_impact_score, hook, target_brand:brands!target_brand_id(name, slug)')
  .not('origin_content_id', 'is', null)
// → agrupar por origin_content_id no server antes de passar ao client

// Tipo resultante para o modal:
type SuggestionPill = {
  id: string
  status: string
  targetBrandName: string
  targetBrandSlug: string
  estimatedImpactScore: number | null
}
type SuggestionsMap = Record<string, SuggestionPill[]> // contentId → pills
```

### API/Interface Changes

```typescript
// Nenhum novo endpoint. Reutilizar:
// PATCH /api/suggestions/status — { id, status }

// Hook global de marca:
// lib/hooks/useBrandParam.ts
export function useBrandParam(): [string, (brand: string) => void]
// lê useSearchParams().get('brand') ?? 'all'
// escreve router.push(?brand=xxx) preservando outros params

// BrandSelector props:
interface BrandSelectorProps {
  brands: { id: string; slug: string; name: string }[]
}

// HitDetailModal props:
interface HitDetailModalProps {
  hit: Content & { content_metrics?: ContentMetrics[]; brands?: Brand }
  suggestions: SuggestionPill[]  // pills de sugestões já existentes
  open: boolean
  onClose: () => void
  onGenerate: () => void  // abre modal de geração de réplicas
}

// KanbanBoard props:
interface KanbanBoardProps {
  suggestions: ContentSuggestion[]
  onStatusChange: (id: string, newStatus: string) => Promise<void>
}
```

### Kanban Columns

```
| Draft | Aprovado | In Play | Publicado |
```
- Cards movíveis via drag-drop horizontal entre colunas
- Ao soltar: status atualiza otimisticamente (setState local) → PATCH API em background
- Em caso de erro: reverter setState + toast.error

### BrandSelector Visual

```
[Todas]  [Rituaria ●]  [Ápice ●]  [Gocase ●]  [Barbour's ●]
```
- Tabs largas (min-w-24), estilo GoHit: pill ativo com cor da marca (ou `bg-[#2659a5]` padrão)
- Lê `?brand=` da URL; ao clicar escreve novo param sem perder outros
- Posicionado imediatamente abaixo do AppNav em cada page (antes do header da page)

### Visão Geral Layout

```
[KPI row: Total | Aprovadas | In Play | Não Replic.]
[Bar chart por status — barras horizontais proporcionais]
[Lista condensada de plan-cards (layout atual)]
```

### Rank Layout

```
[1] [Score 94] hook da sugestão   Marca → Marca   [Aprovar] [Ligar no Play]
[2] [Score 87] ...
```
- Lista ordenada por `estimated_impact_score DESC`
- Score badge N1/N2 + número do rank
- Filtros de status ainda aplicáveis

## Implementation Plan

### Phase 1: Brand Selector Global + URL Param

1. [ ] Criar `lib/hooks/useBrandParam.ts` com `useSearchParams` + `useRouter`
2. [ ] Criar `components/BrandSelector.tsx` — tabs coloridas, recebe lista de brands
3. [ ] Atualizar `app/planejamento/client.tsx` — substituir `filterBrand` (useState) por `useBrandParam()`; renderizar `<BrandSelector>` no topo da page
4. [ ] Atualizar `app/analise-hits/client.tsx` — idem
5. [ ] Atualizar `app/xadrez/client.tsx` — migrar `filterOriginBrand` para `useBrandParam()`
6. [ ] Testar: selecionar marca em Planejamento → navegar para Xadrez → URL mantém `?brand=`

**Validação:** Navegar entre tabs com `?brand=rituaria` na URL mantém o filtro ativo em todas as pages. Selecionar "Todas" remove o param da URL.

### Phase 2: Hit Detail Modal (Análise de Hits)

1. [ ] Atualizar `app/analise-hits/page.tsx`:
   - Adicionar query de `content_suggestions` com `origin_content_id`, `status`, `target_brand`
   - Agrupar em `suggestionsMap: Record<string, SuggestionPill[]>` por `origin_content_id`
   - Passar `suggestionsMap` ao `AnaliseHitsClient`
2. [ ] Criar `components/HitDetailModal.tsx`:
   - Layout: imagem/vídeo (se `image_url`/`video_url`), métricas grid, transcrição, pills de sugestões, botão "Gerar réplicas"
   - Usar `<Dialog>` do shadcn com scroll interno
   - Pills: `[Rituaria — Aprovado]` `[Gocase — Draft]` com cores de status
3. [ ] Atualizar `app/analise-hits/client.tsx`:
   - Adicionar `selectedHit` state + `onOpen`/`onClose` handlers
   - Envolver `<ContentCard>` em wrapper clicável que seta `selectedHit`
   - Renderizar `<HitDetailModal>` condicional
   - Botão "Gerar réplicas" no modal usa o fluxo já existente de `generateReplicas`

**Validação:** Clicar em qualquer card na Análise de Hits abre modal com: imagem (se disponível), transcrição (se disponível), métricas, pills de sugestões por marca (ex: "Rituaria — Aprovado"), e botão funcional "Gerar réplicas".

### Phase 3: 3 View Modes no Planejamento + Status Consistency

1. [ ] Instalar dependências de drag-drop:
   ```bash
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   ```
2. [ ] Criar `components/KanbanCard.tsx`:
   - Adaptar `plan-card` visual para formato de card Kanban (mais compacto)
   - Mostrar: hook, score badge, target brand, status, ações (Aprovar/Rejeitar/Ligar no Play)
   - Compatível com `useSortable` do dnd-kit
3. [ ] Criar `components/KanbanBoard.tsx`:
   - 4 colunas: `draft`, `approved`, `in_play`, `published`
   - Usar `DndContext` + `SortableContext` por coluna
   - `onDragEnd`: chamar `onStatusChange(id, novoStatus)` → optimistic update
   - Contar cards por coluna no header da coluna
4. [ ] Atualizar `app/planejamento/client.tsx`:
   - Adicionar `view: 'geral' | 'kanban' | 'rank'` state com pills toggle
   - **Optimistic updates**: substituir `toast.success` após PATCH por `setSuggestions(prev => prev.map(s => s.id === id ? {...s, status} : s))` → reverter em caso de erro
   - **Visão Geral**: KPI cards (já existem) + barra de status proporcional + lista de plan-cards
   - **Kanban**: `<KanbanBoard suggestions={filtered} onStatusChange={updateStatus} />`
   - **Rank**: lista de plan-cards ordenada por `estimated_impact_score DESC` com rank number overlay
5. [ ] Garantir que `updateStatus` em `xadrez/client.tsx` também usa optimistic updates

**Validação:**
- View toggle funciona: Visão Geral / Kanban / Rank
- Kanban drag-drop move card entre colunas → status muda na API → card permanece na coluna destino
- Erro na API: card reverte à coluna original + toast de erro
- Rank: lista ordenada por score, sem filtro "active" forçado (mostra todos os replicáveis)

## Testing

### Unit Tests

```
- useBrandParam hook: leitura/escrita de URL params
- KanbanBoard: renderização de colunas corretas por status
- HitDetailModal: renderização condicional de campos (sem imagem, sem transcrição)
- optimistic update logic: mock API error → verify revert
```

### Integration Tests

```
- Selecionar marca → navegar entre tabs → URL param persiste
- Clicar hit → modal abre com dados corretos do hit
- Drag card no Kanban → PATCH chamado com status correto
- Drag card → API retorna erro → card volta à coluna original
```

### Manual Test Scenarios

```
1. Abrir Planejamento com 10+ sugestões → alternar entre 3 views
2. Selecionar Rituaria → abrir Xadrez → confirmar filtro ativo
3. Clicar hit com transcrição → confirmar modal mostra texto
4. Clicar hit sem imagem → confirmar modal não quebra
5. Aprovar sugestão no Kanban → recarregar página → status persiste
```

## Decisions

### Impact on Existing Decisions

| ADR | Current Decision | Proposed Change | Action |
|-----|------------------|-----------------|--------|
| ADR-001 | Next.js App Router, RSC para data fetching | `useBrandParam` usa `useSearchParams` (client component) — sem conflito, padrão Next.js | None |
| ADR-004 | Brand config registry com slugs | `BrandSelector` usa slugs da tabela `brands` do Supabase, não do config registry | None |

### New Decisions Required

| Decision | Context | Options to Consider |
|----------|---------|---------------------|
| Drag-drop library | Kanban requer interatividade de arrastar | @dnd-kit/core (recomendado, 0 dependências, acessível), react-beautiful-dnd (deprecated), html5 nativo |

> **Decisão prévia adotada:** `@dnd-kit/core` — padrão de mercado para Next.js/React, acessível, tree-shakeable, suporta touch.

## Reference Materials

### Visual References

| File | Description | Key Elements |
|------|-------------|--------------|
| `/tmp/design_extracted/gohit-site/project/GoHit.html` | Protótipo HTML completo do GoHit | Plan-card layout, KPI cards, nav style, color tokens |
| `/tmp/design_extracted/gohit-site/project/assets/colors_and_type.css` | Design tokens Gogroup | `--gg-blue: #2659a5`, `--gg-yellow: #d7d900`, radii, tipografia |

**⚠️ Executor Note:** Você DEVE ler esses arquivos antes de implementar. Use os tokens de cor e estilo definidos no CSS ao criar novos componentes.

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| `useSearchParams` requer Suspense boundary no Next.js 15 | Alta | Médio | Envolver `BrandSelector` em `<Suspense fallback={null}>` |
| dnd-kit touch events em mobile | Médio | Baixo | Usar `TouchSensor` do dnd-kit além de `MouseSensor` |
| `analise-hits/page.tsx` com query adicional aumenta latência | Baixo | Baixo | Query paralela no `Promise.all` existente |
| Optimistic update mostra estado incorreto se server rejeitar | Médio | Médio | Revert imediato com `setSuggestions(original)` no catch |
| Kanban com muitos cards (50+) pode ter performance ruim | Baixo | Baixo | Virtualização não necessária no MVP; monitorar |

## Final Checklist

```
[ ] npm run type-check passing
[ ] npm run build passing
[ ] npm run lint passing
[ ] BrandSelector renderiza sem erros com Suspense boundary
[ ] HitDetailModal fecha ao clicar fora (onOpenChange)
[ ] Kanban drag funciona em desktop e mobile
[ ] Optimistic update reverte em erro de API
[ ] URL ?brand= persiste entre Planejamento, Análise, Xadrez
[ ] Sem regressão nas views existentes de ContentCard/plan-card
```

---

**Created:** 2026-04-24
**Author:** Lucas Braide
**Status:** Draft
