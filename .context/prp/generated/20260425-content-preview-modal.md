# PRP: Content Preview Modal — Cards de Hit e Planejamento

> Product Requirements Prompt - Planning document for complex features

<!--
PROGRESS TRACKING:
- Mark tasks as [x] when completed
- Mark success criteria as [x] when verified
- Update Status below when starting (In Progress) and finishing (Completed)
- Add "✅ Completed: YYYY-MM-DD" after each phase validation
-->

## Summary

Adicionar um modal de preview ao clicar em qualquer card nas abas **Análise de Hits** e **Planejamento**. Um único componente `ContentPreviewModal` adapta seu conteúdo dependendo do tipo de dado (hit real vs. sugestão IA), exibindo todos os campos relevantes e replicando as ações disponíveis no card.

## Context

### Problem

Os cards de Análise de Hits e Planejamento expõem apenas um subconjunto das informações (hook, métricas resumidas, status). Campos como criador, cenário, roteiro completo e todas as métricas estão ocultos, obrigando o usuário a ir até outra tela ou não ter acesso a esses dados. Não há forma de inspecionar um hit ou pauta rapidamente sem sair do contexto da lista.

### Affected Users

Time de criação e marketing da Gogroup que usa as abas Análise de Hits e Planejamento para avaliar hits e aprovar/rejeitar pautas geradas pela IA.

### Success Criteria

- [x] Clicar em qualquer área do card (fora dos botões de ação) abre o `ContentPreviewModal`
- [x] Botões de ação dentro do card usam `stopPropagation` e continuam funcionando normalmente
- [x] Preview de **hit** exibe: hook, produto, criador, plataforma, cenário, roteiro, imagem, e métricas completas (views, impressions, clicks, spend, CTR, ROAS, thumbstop_ratio, engagement_rate)
- [x] Preview de **sugestão** exibe: hook, produto, score N1/N2, cenário, roteiro, métricas estimadas (CTR, ROAS, views), imagem gerada
- [x] Ações do card são replicadas no rodapé do modal (com stopPropagation implícito)
- [x] Modal responsivo: funciona em 390px (mobile) e 1440px (desktop)
- [x] Na aba Planejamento, o modal de preview coexiste com o `PautaDetailModal` (dois níveis: preview leve → pauta completa)
- [x] Sem nenhuma quebra nas ações existentes (gerar, aprovar, rejeitar, ver pauta)

## Scope

### Included

- Componente `ContentPreviewModal` único e reutilizável
- Prop `onPreview` adicionada ao `ContentCard` (ambas as variantes: `hit` e `plan`)
- Card inteiro com `cursor-pointer` e `onClick` → `onPreview`
- `stopPropagation` em todos os `PillButton` e botões de ação dentro do card
- Integração no `AnaliseHitsClient` (bind do estado `previewContent`)
- Integração no `PlanejamentoClient` (bind do estado `previewSuggestion`)
- Layout do modal: cabeçalho com badges, campos em seções, métricas em grid, rodapé com ações

### Excluded (not doing now)

- Navegação entre cards dentro do modal (prev/next)
- Edição de campos dentro do modal
- Histórico de métricas (gráfico de série temporal)
- Remoção ou substituição do `PautaDetailModal` — ele continua existindo como segundo nível

## Technical Design

### Affected Areas

| Area | Changes |
|------|---------|
| `components/ContentPreviewModal.tsx` | **Novo arquivo** — modal unificado para hit e sugestão |
| `components/ContentCard.tsx` | Adicionar prop `onPreview?: () => void`; card wrapper com `onClick`; `stopPropagation` nos PillButtons |
| `app/analise-hits/client.tsx` | Estado `previewContent`, bind `onPreview` em cada ContentCard, renderizar `<ContentPreviewModal>` |
| `app/planejamento/client.tsx` | Estado `previewSuggestion`, bind `onPreview` em cada ContentCard, renderizar `<ContentPreviewModal>` |

### Data Model

Sem alterações no banco de dados. O modal usa dados já disponíveis nos props existentes:

```ts
// Campos exibidos no preview de hit (Content + ContentMetrics)
{
  // Identity
  name, hook, product, creator, platform,
  // Descriptive
  scenery, content_description, description,
  // Media
  image_url, video_url,
  // Metrics (content_metrics[0])
  views, impressions, click_count, spend, ctr, roas,
  thumbstop_ratio, engagement_rate
}

// Campos exibidos no preview de sugestão (ContentSuggestion)
{
  // Identity
  name, hook, product, platform,
  // Score
  estimated_impact_score, status,
  // Descriptive
  scenery, content_description,
  // Media
  image_url,
  // Estimated metrics
  estimated_ctr, estimated_roas, estimated_views
}
```

### API/Interface Changes

```ts
// components/ContentPreviewModal.tsx
interface ContentPreviewModalProps {
  // Exatamente um dos dois deve ser fornecido
  content?: Content & {
    content_metrics?: ContentMetrics[]
    brands?: { id: string; name: string; slug: string } | null
  }
  suggestion?: ContentSuggestion & {
    origin_brand_name?: string
    target_brand_name?: string
  }
  open: boolean
  onClose: () => void
  // Ações replicadas do card (todas opcionais)
  onGenerate?: (mode: 'image' | 'video') => void
  onApprove?: () => void
  onReject?: () => void
  onOpenPauta?: () => void   // Planejamento: abre PautaDetailModal
  onViewOrigin?: () => void
  onNavigatePautas?: () => void
  onNavigateImagens?: () => void
}

// components/ContentCard.tsx — prop adicionada
interface ContentCardProps {
  // ... props existentes mantidas ...
  onPreview?: () => void  // NOVO — abre ContentPreviewModal
}
```

### Layout do Modal

```
┌─────────────────────────────────────────────────┐
│ [Badge Marca] [N1/N2] [Status] [Platform]  [✕] │
│ ─────────────────────────────────────────────── │
│ Hook (texto completo, sem truncamento)          │
│                                                 │
│ [Imagem — se existir, max-h-48 object-contain] │
│                                                 │
│ PRODUTO        CRIADOR         PLATAFORMA       │
│ Sérum Vit.C    @maria.sk       TikTok           │
│                                                 │
│ CENÁRIO                                         │
│ Banheiro iluminado com boa iluminação...        │
│                                                 │
│ ROTEIRO                                         │
│ Abrir com close no rosto → mostrar sérum...     │
│                                                 │
│ ┌──────┬──────┬──────┬──────┬──────┬──────┐   │
│ │Views │Impr. │Click │CTR   │ROAS  │Thumb │   │
│ │234k  │1.2M  │15k   │2.1%  │4.2x  │22%   │   │
│ └──────┴──────┴──────┴──────┴──────┴──────┘   │
│ ─────────────────────────────────────────────── │
│ [Gerar Pauta]  [Aprovar]  [Rejeitar]  [Fechar] │
└─────────────────────────────────────────────────┘
```

Mobile (< 640px): métricas em grid 2×3 ou 3×2; imagem full-width; ações em `flex-wrap`.

## Implementation Plan

### Phase 1: Componente ContentPreviewModal

1. [x] Criar `components/ContentPreviewModal.tsx`
2. [x] Seção de cabeçalho: badges (marca, score, status, platform) + botão fechar
3. [x] Hook em destaque (`text-base font-semibold`, sem truncamento)
4. [x] Bloco de imagem condicional (`image_url` → `<img>` com `max-h-48 object-contain`)
5. [x] Grid de metadados (produto, criador, plataforma) em 3 colunas, responsivo
6. [x] Seção de cenário (`scenery`) — exibe somente se preenchido
7. [x] Seção de roteiro (`content_description`) — exibe somente se preenchido
8. [x] Grid de métricas reais (hit) ou estimadas (sugestão) em 2×3 responsivo
9. [x] Rodapé com ações replicadas usando os mesmos `PillButton` do ContentCard

**Validation:** Renderizar o modal isoladamente com dados mockados de hit e de sugestão, verificar todos os campos e responsividade.

✅ **Completed:** 2026-04-25 — Componente criado com suporte a hit e suggestion, layout responsivo, métricas condicionais e ações no rodapé.

### Phase 2: Integrar no ContentCard

1. [x] Adicionar prop `onPreview?: () => void` à interface `ContentCardProps`
2. [x] Variante `plan` (card horizontal): wrapper `<div>` recebe `onClick={() => onPreview?.()}` e `cursor-pointer` quando `onPreview` definido
3. [x] Variante `hit` (card vertical): mesmo padrão no wrapper de `HitCard`
4. [x] Adicionar `e.stopPropagation()` em **todos** os `PillButton` dentro de ambas as variantes
5. [x] Adicionar `e.stopPropagation()` nos botões de geração inline (se existirem)

**Validation:** Clicar no card abre o preview. Clicar em "Gerar Pauta" / "Aprovar" / "Rejeitar" executa a ação sem abrir o preview.

✅ **Completed:** 2026-04-25 — Prop `onPreview` adicionada, `onClick` no wrapper, `stopPropagation` centralizado no `PillButton`.

### Phase 3: Integrar no AnaliseHitsClient

1. [x] Adicionar estado: `const [previewContent, setPreviewContent] = useState<typeof contents[number] | null>(null)`
2. [x] Passar `onPreview={() => setPreviewContent(content)}` em cada `<ContentCard>`
3. [x] Renderizar `<ContentPreviewModal content={previewContent} open={!!previewContent} onClose={() => setPreviewContent(null)} onGenerate={...} />`
4. [x] Garantir que os callbacks de ação dentro do modal chamam `setPreviewContent(null)` após executar (ou não — a critério do UX)

**Validation:** Na aba Análise de Hits, clicar em um card abre o preview com todos os campos do hit. Métricas reais exibidas corretamente. Ações funcionam.

✅ **Completed:** 2026-04-25 — Estado e modal integrados. Ações fecham o preview antes de navegar/gerar.

### Phase 4: Integrar no PlanejamentoClient

1. [x] Adicionar estado: `const [previewSuggestion, setPreviewSuggestion] = useState<typeof initialSuggestions[number] | null>(null)`
2. [x] Passar `onPreview={() => setPreviewSuggestion(suggestion)}` em cada `<ContentCard>`
3. [x] Renderizar `<ContentPreviewModal suggestion={previewSuggestion} open={!!previewSuggestion} onClose={() => setPreviewSuggestion(null)} onOpenPauta={() => { setPreviewSuggestion(null); setPautaModal(suggestion) }} onApprove={...} onReject={...} />`
4. [x] Garantir coexistência: "Ver Pauta" no preview fecha o preview e abre `PautaDetailModal`

**Validation:** Na aba Planejamento, clicar no card abre o preview leve. Clicar em "Ver Pauta" dentro do preview fecha o preview e abre o `PautaDetailModal` completo com briefing. Fluxo de dois níveis funciona sem conflito.

✅ **Completed:** 2026-04-25 — Estado e modal integrados. Fluxo dois-níveis: preview → PautaDetailModal implementado sem conflito.

## Testing

### Unit Tests

```
Não há testes unitários automatizados no projeto (sem jest/vitest configurado).
Verificação manual:
- ContentPreviewModal com content mockado (hit com métricas)
- ContentPreviewModal com suggestion mockada (pauta com score)
- ContentPreviewModal com campos ausentes (cenário null, imagem null)
```

### Integration Tests

```
Cenários manuais a verificar:

1. Analise-Hits — hit com métricas completas:
   - Clicar no card → modal abre com todos os campos
   - Clicar em "Gerar Pauta" no card → não abre modal
   - Clicar em "Gerar Pauta" no modal → dispara geração e fecha

2. Analise-Hits — hit sem métricas / sem imagem:
   - Seções ausentes não geram espaços vazios
   - Grid de métricas não aparece se não há dados

3. Planejamento — sugestão aprovada com imagem:
   - Preview mostra imagem + métricas estimadas + badge Aprovado
   - "Ver Pauta" no modal fecha preview e abre PautaDetailModal

4. Mobile (390px):
   - Modal ocupa largura full (w-[calc(100%-2rem)] da base DialogContent)
   - Métricas em grid 2×3
   - Ações em flex-wrap, não overflow

5. stopPropagation:
   - Testar cada botão de ação no card (hit e plan) sem abrir preview
```

## Decisions

### Impact on Existing Decisions

| ADR | Current Decision | Proposed Change | Action |
|-----|------------------|-----------------|--------|
| ADR-001 | Next.js 15 + Dialog via base-ui | Reutilizar o mesmo `Dialog`/`DialogContent` | None |
| ADR-002 | 4-step AI pipeline isolado | Nenhum passo do pipeline é alterado | None |

### New Decisions Required

Nenhuma decisão arquitetural nova é necessária. O componente segue os padrões estabelecidos: `Dialog` do `@base-ui/react`, `PillButton` inline, estilos via Tailwind + inline style com a paleta Gogroup.

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| `stopPropagation` esquecido em algum botão | Medium | Medium | Testar cada botão individualmente na fase de validação |
| `previewSuggestion` e `pautaModal` em conflito (ambos abertos) | Low | Low | `onOpenPauta` no modal fecha preview antes de abrir `PautaDetailModal` |
| Campos nulos causando espaços em branco no modal | Medium | Low | Renderizar cada seção condicionalmente; testar com dados incompletos |
| Performance com muitos cards e estado local | Low | Low | Estado é apenas um `id`/referência — sem problema de escala no MVP |

## Final Checklist

```
[ ] ContentPreviewModal renderiza hit sem erros
[ ] ContentPreviewModal renderiza suggestion sem erros
[ ] Clique no card abre modal nas duas abas
[ ] Botões de ação no card não disparam preview (stopPropagation)
[ ] Fluxo dois-níveis Planejamento (preview → PautaDetailModal) funciona
[ ] Responsivo: mobile 390px + desktop 1440px verificados
[ ] Linting sem erros (npm run lint)
[ ] Type-check sem erros (npm run type-check)
```

---

**Created:** 2026-04-25
**Author:** lucas.braide@gocase.com
**Status:** Completed
