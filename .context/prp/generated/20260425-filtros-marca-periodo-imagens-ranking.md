# PRP: Filtros de Marca Global, Período, Imagens e Ranking Reformatado

> Product Requirements Prompt - Planning document for complex features

## Summary

Introduzir um `BrandSelector` global (componente único, URL param `?brand=`) visível em todas as pages, adicionar filtro de período real (`?period=7d`) na Análise de Hits, reformatar o ranking de hits como tabela, renderizar imagens nos plan-cards do Planejamento e nos cards da Análise, e padronizar o estilo visual de todos os filtros (pills azul/amarelo).

## Context

### Problem

1. **Filtro de marca inconsistente**: cada page tem sua própria implementação de filtro de marca, com estilos diferentes (Select em Planejamento, pills em Análise), sem persistência entre tabs e sem componente compartilhado.
2. **Imagens não renderizadas no Planejamento**: `suggestion.image_url` existe no banco mas o painel esquerdo do plan-card sempre mostra texto ("Imagem gerada") em vez da imagem real.
3. **Ranking mal formatado**: Top 5 hits são exibidos como pills de texto simples — ilegível, sem hierarquia clara, sem métricas visíveis.
4. **Sem filtro de período**: não é possível ver quais hits performaram melhor nos últimos 7 ou 30 dias; tudo é exibido de forma atemporal.
5. **Cards sem imagem de referência**: hits na Análise de Hits não mostram `content.image_url`, perdendo contexto visual importante.
6. **Inconsistência visual de filtros**: Planejamento usa Select (shadcn), Análise usa pills, Xadrez usa Button shadcn — três padrões diferentes.

### Affected Users

Time interno de marketing/criativo que analisa hits por marca e período para tomar decisões de replicação cross-brand diariamente.

### Success Criteria

- [x] Selecionar marca em qualquer tab persiste via `?brand=` e filtra a page inteira
- [x] `BrandSelector` é um único componente reutilizado em Análise, Planejamento, Xadrez e Alertas
- [x] Filtro de período padrão 7 dias na Análise; `?period=7d|30d|90d|all` filtra query real no Supabase
- [x] Ranking exibido como tabela com colunas: #rank, nome, marca, CTR, ROAS, views
- [x] `suggestion.image_url` renderiza no painel esquerdo do plan-card quando disponível
- [x] `content.image_url` renderiza no topo dos hit cards; fallback com cor da marca + iniciais
- [x] Todos os filtros de todas as pages usam o mesmo padrão visual de pills (azul ativo / `#eaf1fa` inativo)

## Scope

### Included

- `components/BrandSelector.tsx` — novo componente, URL param `?brand=`, posição: abaixo do header da page
- `app/analise-hits/page.tsx` — filtrar query por `?brand=` e `?period=` via searchParams (server-side Supabase)
- `app/analise-hits/client.tsx` — ranking como tabela, período como pills, thumbnails nos hit cards, remover filtro de marca local (delegado ao BrandSelector)
- `app/planejamento/page.tsx` — filtrar suggestions por `?brand=` via searchParams (server-side)
- `app/planejamento/client.tsx` — usar BrandSelector, padronizar pills, renderizar imagem no plan-card
- `app/xadrez/client.tsx` — usar BrandSelector, padronizar pills de filtro
- `app/alertas/client.tsx` — usar BrandSelector
- `components/ContentCard.tsx` — plan variant: `<img>` no painel esquerdo; hit variant: thumbnail no topo com fallback

### Excluded (não agora)

- Filtro de período em Planejamento e Xadrez (apenas Análise de Hits nesta entrega)
- Paginação do ranking (Top 5 → Top 10 fica para depois)
- Comparação de períodos (vs. período anterior)
- Filtro de período no Alertas

## Technical Design

### Affected Areas

| Área | Mudanças |
|------|----------|
| `components/BrandSelector.tsx` | **NOVO** — lê `useSearchParams().get('brand')`, escreve `router.push(?brand=xxx)` preservando outros params |
| `app/analise-hits/page.tsx` | Lê `searchParams.brand` e `searchParams.period`; filtra `content_metrics` por date range; filtra por brand_id |
| `app/analise-hits/client.tsx` | Ranking → tabela; período → pills; thumbnails; remove filtro de marca local |
| `app/planejamento/page.tsx` | Lê `searchParams.brand`; filtra suggestions por `target_brand_id` |
| `app/planejamento/client.tsx` | Usa `<BrandSelector>`; renderiza `suggestion.image_url` no plan-card; padroniza pills |
| `app/xadrez/client.tsx` | Usa `<BrandSelector>`; padroniza pills de filtro |
| `app/alertas/client.tsx` | Usa `<BrandSelector>` |
| `components/ContentCard.tsx` | Plan: `<img src={imageUrl}>` no painel esquerdo; Hit: thumbnail no topo |

### Data Model

Sem alterações de schema. Queries existentes com filtros adicionais:

```typescript
// analise-hits/page.tsx — filtros de período e marca
const periodDays = { '7d': 7, '30d': 30, '90d': 90, 'all': null }[period ?? '7d'] ?? 7
const cutoffDate = periodDays
  ? new Date(Date.now() - periodDays * 86_400_000).toISOString().slice(0, 10)
  : null

// Query de contents com métricas filtradas por data:
supabase
  .from('contents')
  .select('*, brands!brand_id(id, name, slug), content_metrics(*)')
  .eq('is_hit', true)
  // Se brand selecionado:
  .eq('brand_id', brandId)  // brand resolvido via slug → id
  // Se period != 'all': filtrar content_metrics por date (via RPC ou client-side filter)
```

> **Nota sobre filtro de métricas por período**: `content_metrics` é um relacionamento 1:N. Filtrar dentro do join não é suportado diretamente em Supabase `.select()`. Estratégia: buscar todos os content_metrics e filtrar no server antes de passar ao client:
> ```typescript
> // No page.tsx: filtrar content_metrics após a query
> const contentsWithFilteredMetrics = (contents ?? []).map(c => ({
>   ...c,
>   content_metrics: (c.content_metrics ?? []).filter(m =>
>     !cutoffDate || m.date >= cutoffDate
>   ),
>   // Excluir hits sem métricas no período (exceto 'all')
> })).filter(c => period === 'all' || c.content_metrics.length > 0)
> ```

### API/Interface Changes

```typescript
// BrandSelector props:
interface BrandSelectorProps {
  brands: { id: string; slug: string; name: string }[]
  className?: string
}
// Lê: useSearchParams().get('brand') ?? 'all'
// Escreve: router.push(url com ?brand=xxx, preservando ?period=)

// Novos searchParams em analise-hits/page.tsx:
type SearchParams = { brand?: string; period?: '7d' | '30d' | '90d' | 'all' }

// Novos searchParams em planejamento/page.tsx:
type SearchParams = { brand?: string; hitId?: string }

// ContentCard — plan variant — sem mudança de props:
// Usa suggestion.image_url já presente no tipo ContentSuggestion

// ContentCard — hit variant — sem mudança de props:
// Usa content.image_url já presente no tipo Content
```

### BrandSelector Visual

```
┌─────────────────────────────────────────────────────┐
│ [Todas as marcas]  [Rituaria]  [Ápice]  [Gocase]   │
│  ativo = bg #2659a5 text white                      │
│  inativo = bg #eaf1fa text #7ba1d8                  │
└─────────────────────────────────────────────────────┘
```

Posição: logo abaixo do bloco `header` (eyebrow + h1 + desc), antes dos KPIs e demais filtros da page. Separado por `border-bottom` ou espaçamento `space-y-7`.

### Ranking Table Layout

```
┌────┬──────────────────────────────┬──────────┬────────┬────────┬──────────┐
│ #  │ Hit                          │ Marca    │  CTR   │  ROAS  │  Views   │
├────┼──────────────────────────────┼──────────┼────────┼────────┼──────────┤
│ 1  │ "Não compro a bolsa..."      │ Gocase   │  5.8%  │  4.2x  │  8.2M    │
│ 2  │ "Vi uma menina na academia"  │ Barbour's│  4.3%  │  3.8x  │  2.1M    │
└────┴──────────────────────────────┴──────────┴────────┴────────┴──────────┘
```

- Ordenado por views (ou CTR/ROAS se métricas disponíveis no período)
- Máximo 5 linhas (Top 5)
- Styled: `bg-white border rounded-[22px]`, cabeçalho `bg-[#2659a5] text-white`, linhas com hover `bg-[#eaf1fa]`

### Período Filter Pills

```
Período: [7 dias padrão]  [30 dias]  [90 dias]  [Tudo]
```

- Pills no mesmo estilo do BrandSelector (azul ativo / `#eaf1fa` inativo)
- Label "padrão" no pill "7 dias" (badge interno pequeno)
- Escreve `?period=7d|30d|90d|all` na URL

### Image Rendering — Plan Card

```
┌──────────────┬────────────────────────────────────┐
│  [IMG 140px] │  badges + hook + score + ações     │
│  object-cover│                                    │
│  (ou texto   │                                    │
│   fallback)  │                                    │
└──────────────┴────────────────────────────────────┘
```

- Se `suggestion.image_url`: `<img src={imageUrl} className="absolute inset-0 w-full h-full object-cover" />`
- Se não: texto atual mantido ("Imagem gerada" / "Vídeo gerado")

### Image Rendering — Hit Card

```
┌──────────────────────────────────────┐
│  [Thumbnail 100% width, h-36]        │
│  brand badge sobreposto top-left     │
├──────────────────────────────────────┤
│  hook + métricas + ações             │
└──────────────────────────────────────┘
```

- Se `content.image_url`: `<img>` no topo do card
- Se não: div com `background: brandColor` + iniciais da marca centralizadas (ex: "ÁP" para Ápice)

### Filter Pill Standard (todas as pages)

```typescript
// Padrão definitivo para todos os pills de filtro:
const pillStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 999,
  background: isActive ? '#2659a5' : '#eaf1fa',
  color: isActive ? '#ffffff' : '#7ba1d8',
  fontSize: 12,
  fontWeight: isActive ? 600 : 500,
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.15s',
})
// Variante amarela (para filtros secundários como platform):
const pillStyleSecondary = (isActive: boolean): React.CSSProperties => ({
  ...pillStyle(false),
  background: isActive ? '#d7d900' : 'transparent',
  color: isActive ? '#2659a5' : '#7ba1d8',
  border: '1px solid rgba(38,89,165,0.14)',
})
```

## Implementation Plan

### Phase 1: BrandSelector Component + URL Param Pattern

1. [ ] Criar `components/BrandSelector.tsx`:
   - `'use client'` — usa `useSearchParams()` e `useRouter()`
   - Lê `?brand=` da URL; ao clicar em uma marca, chama `router.push()` preservando `?period=` e outros params
   - Props: `brands: { id, slug, name }[]`
   - Visual: pills padrão azul/`#eaf1fa`, tamanho médio (não pequeno)
   - Envolver em `<Suspense>` no uso (requer Suspense boundary por causa de `useSearchParams` no Next.js 15)
2. [ ] Atualizar `app/analise-hits/client.tsx`:
   - Remover o bloco de filtro de marca local (state `filterBrand` e as pills manuais)
   - Adicionar `<Suspense><BrandSelector brands={brands} /></Suspense>` abaixo do header
   - Receber `brand` como prop já filtrado pelo server (não re-filtrar no client)
3. [ ] Atualizar `app/planejamento/client.tsx`:
   - Remover Select de marca + state `filterBrand`
   - Adicionar `<Suspense><BrandSelector brands={brands} /></Suspense>` abaixo do header
4. [ ] Atualizar `app/xadrez/client.tsx`:
   - Substituir filtro de marca local por `<Suspense><BrandSelector brands={brands} /></Suspense>`
5. [ ] Atualizar `app/alertas/client.tsx`:
   - Adicionar BrandSelector (filtro de marca local já existe; manter ou delegar ao componente)

**Validação:** Selecionar "Rituaria" em Análise → navegar para Planejamento → URL contém `?brand=rituaria` → conteúdo filtrado em ambas as pages.

### Phase 2: Filtro de Período + Ranking Tabela (Análise de Hits)

1. [ ] Atualizar `app/analise-hits/page.tsx`:
   - Receber `searchParams: { brand?: string; period?: string }`
   - Resolver `brand` slug → id para filtrar via `.eq('brand_id', brandId)`
   - Calcular `cutoffDate` com base em `period` (7d padrão)
   - Filtrar `content_metrics` por `date >= cutoffDate` **no servidor** (map + filter no resultado da query)
   - Excluir hits sem métricas no período quando `period !== 'all'`
   - Passar `period` atual como prop ao client para renderizar o filtro ativo
2. [ ] Atualizar `app/analise-hits/client.tsx`:
   - Adicionar pills de período: `[7 dias padrão] [30 dias] [90 dias] [Tudo]`
   - Ao clicar: `router.push(?period=7d)` preservando `?brand=`
   - Substituir o bloco Top 5 (pills) por tabela de ranking:
     - `<table>` estilizada com cabeçalho `bg-[#2659a5]` e linhas com hover
     - Colunas: `#`, Hit, Marca, CTR, ROAS, Views
     - Calcular ranking localmente a partir dos `contents` filtrados (ordenar por views)
   - Receber `period` como prop para marcar o pill ativo

**Validação:** Selecionar "30 dias" → URL muda para `?period=30d` → page recarrega → hits sem métricas nos últimos 30 dias desaparecem → ranking mostra apenas hits com dados no período.

### Phase 3: Imagens no Plan-Card e Hit Card

1. [ ] Atualizar `components/ContentCard.tsx` — variant `'plan'`:
   - No painel esquerdo: se `imageUrl` existe, renderizar `<img src={imageUrl} className="absolute inset-0 w-full h-full object-cover rounded-l-[22px]" />`
   - Se `imageUrl` não existe: manter comportamento atual (texto "Imagem gerada" / "Vídeo gerado")
   - A `position: relative` já existe no painel esquerdo — apenas adicionar a `<img>` dentro do mesmo div
2. [ ] Atualizar `components/ContentCard.tsx` — variant `'hit'`:
   - Adicionar área de thumbnail no topo do card (antes do conteúdo existente)
   - Se `imageUrl` existe: `<img src={imageUrl} className="w-full h-36 object-cover rounded-t-[22px]" />`
   - Se `imageUrl` não existe: div com cor da marca (mapeada por `content.brands?.slug`) e iniciais da marca
   - Paleta de cores fallback por marca: `{ apice: '#e61782', rituaria: '#f8ae13', gocase: '#3dbfef', default: '#2659a5' }`
3. [ ] Verificar que `content.image_url` está sendo carregado na query de `analise-hits/page.tsx` (já é, pois `select('*')` inclui todos os campos)

**Validação:** Hit com `image_url` preenchido → thumbnail visível no card. Hit sem `image_url` → placeholder colorido com iniciais da marca. Suggestion com `image_url` → imagem no painel esquerdo do plan-card.

### Phase 4: Auditoria de Consistência Visual dos Filtros

1. [ ] Criar helper/constante local `pillStyle(isActive)` e `pillStyleSecondary(isActive)` — ou apenas seguir o padrão inline sem helper
2. [ ] Auditar `app/xadrez/client.tsx` — padronizar pills de filtro (currently usa `Button` do shadcn)
3. [ ] Auditar `app/alertas/client.tsx` — padronizar pills de tipo (Hit/Relatório) e marca
4. [ ] Auditar `app/planejamento/client.tsx` — padronizar pills de status (já usa padrão, verificar consistência de tamanho/espaçamento)
5. [ ] Auditar `app/analise-hits/client.tsx` — padronizar pills de plataforma (atualmente usa variante "secondary yellow")
6. [ ] Garantir que BrandSelector tem exatamente o mesmo estilo em todas as pages onde é usado

**Validação:** Abrir cada uma das 4 pages e comparar o estilo dos pills de filtro — todos devem ter o mesmo padding (`6px 14px`), borderRadius (`999px`), fonts e cores.

## Testing

### Manual Test Scenarios

```
Fase 1 — BrandSelector
1. Análise de Hits: clicar "Rituaria" → URL ?brand=rituaria → grid mostra só hits da Rituaria
2. Navegar para Planejamento → URL mantém ?brand=rituaria → pautas filtradas
3. Clicar "Todas as marcas" → URL remove ?brand= → tudo visível
4. Xadrez com ?brand=apice → filtro de origem ativo na matriz

Fase 2 — Período e Ranking
5. Análise de Hits default: period=7d, 2 hits com métricas recentes → aparece ranking + 2 cards
6. Mudar para "Tudo" → todos os hits aparecem
7. Ranking: coluna CTR ordenada corretamente; ROAS visível
8. Hit sem métricas no período de 7 dias → não aparece no grid (se period != 'all')

Fase 3 — Imagens
9. Planejamento: pauta com image_url → imagem aparece no painel esquerdo
10. Planejamento: pauta sem image_url → texto "Imagem gerada" mantido
11. Análise: hit com image_url → thumbnail no topo do card
12. Análise: hit sem image_url → placeholder colorido com iniciais

Fase 4 — Consistência
13. Abrir cada page → todos os pills de filtro: mesmo tamanho, mesmas cores
14. Xadrez: filtro de marca visual identico ao da Análise
```

### TypeScript Check

```bash
npm run type-check  # deve passar sem erros após cada fase
npm run build       # deve completar sem erros
```

## Decisions

### Impact on Existing Decisions

| ADR | Current Decision | Proposed Change | Action |
|-----|------------------|-----------------|--------|
| ADR-001 | Next.js 15 App Router, RSC + Client Components | `BrandSelector` e período usam `useSearchParams` (client) + `searchParams` em page.tsx (server) — padrão Next.js, sem conflito | None |
| ADR-004 | Brand config registry com slugs | `BrandSelector` usa slugs da tabela `brands` do Supabase + `brandColors` inline no componente — sem conflito com registry | None |

### New Decisions Required

Nenhuma decisão arquitetural nova necessária. Escolhas de implementação:
- **Filtro de período no servidor**: opção por filtrar `content_metrics` no array após query (vs. RPC) — mais simples no MVP
- **Fallback de imagem**: placeholder com cor por slug de marca hardcoded no componente — manter simples, não buscar do brand config registry

## Reference Materials

### Design Reference

| File | Description | Key Elements |
|------|-------------|--------------|
| `/tmp/design_extracted/gohit-site/project/GoHit.html` | Protótipo GoHit completo | Plan-card layout, pill style, colors |
| `/tmp/design_extracted/gohit-site/project/assets/colors_and_type.css` | Design tokens | `--gg-blue: #2659a5`, `--gg-yellow: #d7d900`, `--gg-blue-050: #eaf1fa` |

**⚠️ Executor Note:** Ler esses arquivos antes de implementar para garantir que novos componentes seguem os tokens visuais Gogroup.

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| `useSearchParams` requer `<Suspense>` no Next.js 15 | Alta | Médio | Envolver `<BrandSelector>` em `<Suspense fallback={null}>` em cada page |
| Filtro de período exclui hits sem métricas, deixando grid vazio | Médio | Médio | Mostrar mensagem "Nenhum hit com métricas nos últimos X dias — tente 'Tudo'" |
| `content.image_url` pode ser URL de storage Supabase com autenticação | Baixo | Alto | Verificar se URLs são públicas antes de exibir; se não, usar placeholder |
| Planejamento filtrado por marca no server pode quebrar `hitId` filter | Baixo | Médio | Combinar ambos os filtros: `brand_id AND origin_content_id` |
| Thumbnail de hit sem aspect-ratio fixo pode distorcer a imagem | Médio | Baixo | Usar `object-cover` com altura fixa (`h-36`) no container |

## Final Checklist

```
[ ] npm run type-check passing após cada fase
[ ] npm run build passing
[ ] BrandSelector funciona com Suspense boundary em todas as pages
[ ] Filtro ?brand= persiste ao navegar entre tabs
[ ] Filtro ?period=7d é o default; "Tudo" remove o filtro
[ ] Imagem no plan-card não quebra quando image_url é null
[ ] Placeholder de marca fallback visível quando content.image_url é null
[ ] Ranking mostra CTR e ROAS corretos do período
[ ] Todos os pills de filtro: padding 6px 14px, radius 999px, azul ativo / #eaf1fa inativo
[ ] Sem regressões no Xadrez e Alertas após refatoração
```

---

**Created:** 2026-04-25
**Author:** Lucas Braide
**Status:** Completed
