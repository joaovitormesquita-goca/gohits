# PRP: Separação de Superfícies — Pautas e Imagens

> Product Requirements Prompt - Planning document for complex features

<!--
PROGRESS TRACKING:
- Mark tasks as [x] when completed
- Mark success criteria as [x] when verified
- Update Status below when starting (In Progress) and finishing (Completed)
- Add "✅ Completed: YYYY-MM-DD" after each phase validation
-->

## Summary

Separar os outputs do pipeline de IA (pauta adaptada e imagem gerada) em superfícies de interface dedicadas e independentes, substituindo o `LigarNoPlayModal` — que hoje agrupa tudo num único dialog — por duas telas distintas: "Planejamento" reformulado como listagem de pautas e nova aba "Imagens" para gerenciar e publicar imagens geradas. A geração de imagem é desacoplada do pipeline principal e passa a ser acionada on-demand a partir de pautas aprovadas.

## Context

### Problem

- A pauta adaptada (hook, cenário, roteiro, briefing) e a imagem gerada são consumidos em contextos distintos, mas hoje ambas ficam expostas no mesmo `LigarNoPlayModal`, misturadas num único dialog.
- A geração de imagem está acoplada ao pipeline principal: toda vez que "Gerar" é clicado em Análise de Hits, os steps 1→2→3 rodam em sequência, gerando imagem sem que a pauta tenha sido sequer revisada.
- Não existe superfície dedicada para gerenciar imagens: não há tela para listar, gerar sob demanda, regenerar ou publicar imagens separadamente da pauta.
- O botão "Gerar" em Análise de Hits é ambíguo — o usuário não tem controle sobre o que está sendo gerado.
- A navegação pós-geração é confusa: o usuário gera em `/analise-hits` mas só vê o resultado em `/planejamento`, sem indicação de onde ir.
- Ações de naturezas diferentes (copiar briefing para WhatsApp vs. publicar no Meta Ads) estão colapsadas no mesmo botão "Ligar no Play".

### Affected Users

- **Time de conteúdo/criação** — consome a pauta (briefing para WhatsApp, hook, roteiro adaptado)
- **Time de mídia/tráfego** — consome a imagem (publicação no Meta Ads, download PNG)
- **Gestores de operação** — supervisionam ambas as superfícies e aprovam sugestões

### Success Criteria

- [ ] Aba "Planejamento" exibe lista de pautas geradas sem imagem misturada na view principal do card
- [ ] Nova aba "Imagens" no menu listando imagens em estado draft e geradas
- [ ] `LigarNoPlayModal` removido — suas ações distribuídas entre as duas novas superfícies
- [ ] Em Análise de Hits, botão "Gerar" substituído por "Gerar Pauta" + botões de navegação "Pautas" e "Imagens" por card
- [ ] Geração de imagem ocorre on-demand na aba Imagens, somente a partir de pautas aprovadas sem imagem
- [ ] Botão "Copiar Briefing (WhatsApp)" presente na tela de Pautas
- [ ] Botão "Publicar no Meta Ads" presente na tela de Imagens
- [ ] Filtro por `hitId` via query param funciona em `/planejamento?hitId=X` e `/imagens?hitId=X`
- [ ] Pipeline `/api/pipeline/run` não executa mais o step 3 (imagem) automaticamente

## Scope

### Included

- Reformulação da aba "Planejamento" como tela de listagem e detalhe de pautas
- Criação da nova aba "Imagens" com rota `/imagens` e componentes dedicados
- Remoção e substituição do `LigarNoPlayModal`
- Ajuste dos cards em Análise de Hits: botões "Gerar Pauta", "Pautas", "Imagens/Vídeos"
- Desacoplamento do step 3 (imagem) do pipeline principal (`/api/pipeline/run`)
- Filtro contextual por `hitId` via URL em ambas as novas telas
- Ação "Publicar no Meta Ads" migrada para tela de Imagens
- Ação "Copiar Briefing (WhatsApp)" migrada para tela de Pautas
- Atualização do ADR-002 para refletir o desacoplamento do step 3

### Excluded (not doing now)

- Edição inline de campos de pauta (hook, cenário, roteiro) — somente leitura
- Controle de acesso por perfil de usuário (sem níveis de permissão)
- Regeneração de pauta (novo PRP futuro)
- Vídeo (ainda desabilitado per ADR-002 v2.0)
- Aba Xadrez de Replicação (não afetada)
- Aba Alertas (não afetada)
- Aba Referências (não afetada)
- Versionamento independente de pauta vs imagem no banco

## Technical Design

### Affected Areas

| Área | Arquivo(s) | Tipo de Mudança |
|------|-----------|----------------|
| Navegação | `components/AppNav.tsx` | Adicionar aba "Imagens" ao array `TABS` |
| Planejamento UI | `app/planejamento/client.tsx`, `app/planejamento/page.tsx` | Reformular: remover LigarNoPlay, adicionar PautaDetailModal, filtro por hitId |
| Imagens UI | `app/imagens/page.tsx`, `app/imagens/client.tsx` (novo) | Criar do zero |
| ImageCard | `components/ImageCard.tsx` (novo) | Card dedicado para imagens |
| ContentCard | `components/ContentCard.tsx` | Ajustar variant `'hit'`: novos botões, remover "Gerar" monolítico; ajustar variant `'plan'`: remover imagem do painel esquerdo, remover "Ligar no Play" |
| LigarNoPlayModal | `components/LigarNoPlayModal.tsx` | Remover após novas superfícies estarem funcionais |
| Pipeline API | `app/api/pipeline/run/route.ts` | Remover step 3 da sequência automática |
| ADR-002 | `.context/decisions/002-four-step-ai-pipeline.md` | Atualizar para v3.0 — desacoplamento do step 3 |

### Data Model

```
Sem alterações de schema. Tabela content_suggestions já contém:

-- Campos de Pauta (step 2 - Adapt)
hook               text
scenery            text
content_description text   (roteiro)
description        text   (caption)
briefing           text
estimated_ctr      numeric
estimated_roas     numeric
estimated_views    integer
estimated_impact_score integer

-- Campos de Imagem (step 3 - Image)
image_url          text   (null se ainda não gerada)
output_mode        text   ('image' | 'video')

-- Status compartilhado
status             text   ('draft' | 'approved' | 'not_replicable' | 'in_play')

-- Publicação Meta
meta_ad_id         text
meta_adset_id      text
meta_status        text   ('in_test' | 'result_available')

Definição de "draft de imagem":
  content_suggestions WHERE status = 'approved' AND image_url IS NULL
```

### API/Interface Changes

```typescript
// POST /api/pipeline/run — CHANGE
// Antes: roda steps 1→2→3 (evaluate → adapt → image)
// Depois: roda apenas steps 1→2 (evaluate → adapt)
// Retorna: { status: 'done' | 'not_replicable', suggestionId, reason? }
// SEM image_url no retorno

// POST /api/image — SEM MUDANÇA
// Continua existindo, chamado on-demand da UI de Imagens
// Body: { suggestionId: string }
// Retorna: { image_url: string }

// POST /api/meta/publish — SEM MUDANÇA
// Chamado da tela de Imagens
// Body: { suggestionId: string }
// Retorna: { ad_id, adset_id, created_new_adset, ads_manager_url }

// Novos query params de URL (client-side, sem mudança de API):
// /planejamento?hitId=<contentId>   → filtra pautas pelo hit de origem
// /imagens?hitId=<contentId>        → filtra imagens pelo hit de origem
```

## Implementation Plan

### Phase 1: Decisions & Pipeline Decoupling

1. [ ] Atualizar ADR-002 para v3.0 — documentar o desacoplamento do step 3 (imagem passa a ser gerada on-demand, não mais como parte do pipeline run automático)
2. [ ] Ler `app/api/pipeline/run/route.ts` e remover a chamada ao `POST /api/image` (step 3)
3. [ ] Confirmar que `POST /api/image` funciona como chamada isolada — verificar que não há dependência de variáveis locais do pipeline/run
4. [ ] Auditar todos os consumidores do retorno de `/api/pipeline/run` — garantir que nenhum código espera `image_url` no response

**Validation:** `POST /api/pipeline/run` retorna `{ status: 'done', suggestionId }` sem `image_url`. `content_suggestions` salva com `image_url = null` após pipeline rodar.

### Phase 2: Análise de Hits — Ajuste de Cards

5. [ ] Ler `app/analise-hits/client.tsx` completo antes de editar
6. [ ] Atualizar `generateReplicas()` em `analise-hits/client.tsx`: remover dependência de `image_url` no resultado do pipeline
7. [ ] Ler `components/ContentCard.tsx` completo antes de editar
8. [ ] Em `ContentCard` variant `'hit'`: substituir o botão "Gerar" por "Gerar Pauta" (aciona pipeline steps 1+2 apenas)
9. [ ] Adicionar ao card variant `'hit'` dois novos botões de navegação:
   - "Pautas" → `router.push('/planejamento?hitId=' + content.id)`
   - "Imagens" → `router.push('/imagens?hitId=' + content.id)`
10. [ ] Atualizar props de `ContentCard` e callbacks em `analise-hits/client.tsx` para refletir mudanças

**Validation:** Clicar "Gerar Pauta" cria `content_suggestion` com `image_url = null`. Botão "Pautas" navega para `/planejamento?hitId=X`. Botão "Imagens" navega para `/imagens?hitId=X`. Sem erros de TypeScript.

### Phase 3: Planejamento → Tela de Pautas

11. [ ] Ler `app/planejamento/client.tsx` completo antes de editar
12. [ ] Implementar leitura do query param `hitId` em `planejamento/client.tsx` e aplicar como filtro em `filtered` (useMemo)
13. [ ] Criar `PautaDetailModal` (novo componente) exibindo apenas campos de pauta:
    - Hook, Cenário, Roteiro (`content_description`), Briefing
    - Métricas estimadas (CTR, ROAS, Views, Score)
    - Status badge + ações Aprovar / Rejeitar (mantidas)
    - Botão "Copiar Briefing (WhatsApp)" — copia apenas o campo `briefing` para clipboard
14. [ ] Substituir abertura do `LigarNoPlayModal` em `planejamento/client.tsx` pelo novo `PautaDetailModal`
15. [ ] Em `ContentCard` variant `'plan'`: remover imagem do painel esquerdo (substituir por placeholder de cor/brand), remover botão "Ligar no Play"
16. [ ] Adicionar ao `ContentCard` variant `'plan'` botão para abrir `PautaDetailModal`

**Validation:** Card de planejamento não exibe imagem. Modal de pauta abre sem referência a imagem. "Copiar Briefing" copia apenas o briefing. Filtro por hitId funciona vindo de `/analise-hits`.

### Phase 4: Nova Aba Imagens

17. [ ] Criar `app/imagens/page.tsx` (server component, estrutura mínima)
18. [ ] Criar `app/imagens/client.tsx` com:
    - Fetch de `content_suggestions` (com `image_url` preenchido OU `status = 'approved' AND image_url IS NULL`)
    - Leitura do query param `hitId` para filtro contextual
    - Filtros: por brand, por status (draft/gerada/publicada), por plataforma
    - Função `generateImage(suggestionId)` → chama `POST /api/image` e atualiza estado local
19. [ ] Criar `components/ImageCard.tsx` com:
    - Preview da imagem (se `image_url` presente) — img tag ou background
    - Estado "Draft" (sem imagem) com botão "Gerar Imagem" → chama `generateImage()`
    - Loading state durante geração
    - Botão "Download PNG" (link direto para `image_url`)
    - Botão "Publicar no Meta Ads" → chama `POST /api/meta/publish`
    - Meta status badge (`in_test`, `result_available`)
    - Badges de brand, plataforma, score
20. [ ] Adicionar aba "Imagens" ao array `TABS` em `components/AppNav.tsx`:
    ```typescript
    { label: 'Imagens', href: '/imagens', icon: ... }
    ```

**Validation:** Grid lista imagens e drafts. "Gerar Imagem" funciona on-demand e exibe imagem após geração. "Publicar Meta Ads" chama endpoint correto. Filtro por hitId funciona. Aba aparece no menu.

### Phase 5: Cleanup

21. [ ] Verificar que nenhum componente importa `LigarNoPlayModal` antes de remover
22. [ ] Remover `components/LigarNoPlayModal.tsx`
23. [ ] Remover prop `onLigarNoPlay` de `ContentCard.tsx` e todos os seus usos
24. [ ] Buscar e remover quaisquer referências órfãs a `ligarModal` e `LigarNoPlayModal`
25. [ ] Rodar `npm run type-check` — sem erros
26. [ ] Rodar `npm run lint` — sem warnings

**Validation:** Build (`npm run build`) passa sem erros. Nenhuma referência a `LigarNoPlayModal` no codebase.

## Testing

### Unit Tests

```
- app/api/pipeline/run: confirmar que step 3 (POST /api/image) NÃO é chamado
- app/api/image: confirmar que endpoint funciona quando chamado isoladamente (sem pipeline/run)
- Filtro hitId em /planejamento: query param lido corretamente e aplicado no useMemo
- Filtro hitId em /imagens: idem
- generateImage() em imagens/client.tsx: chama POST /api/image com suggestionId correto
- "Copiar Briefing": copia apenas o campo briefing (não buildPackageText completo)
```

### Integration Tests

```
Fluxo completo A (Pauta):
  1. Em /analise-hits, clicar "Gerar Pauta" em um hit
  2. Confirmar que suggestion é criada com image_url = null
  3. Clicar "Pautas" no mesmo card → navega para /planejamento?hitId=X filtrado
  4. Ver card da pauta → abrir PautaDetailModal → copiar briefing

Fluxo completo B (Imagem):
  1. Aprovar uma pauta em /planejamento
  2. Em /analise-hits, clicar "Imagens" no card do hit → navega para /imagens?hitId=X
  3. Ver card draft da pauta aprovada → clicar "Gerar Imagem"
  4. Imagem gerada exibida no card → clicar "Publicar no Meta Ads"
  5. Confirmar meta_status = 'in_test' no card

Fluxo de navegação:
  - Acessar /imagens sem filtro: listar todas as imagens e drafts
  - Acessar /planejamento sem filtro: listar todas as pautas
```

## Decisions

### Impact on Existing Decisions

| ADR | Decisão Atual | Mudança Proposta | Ação |
|-----|--------------|-----------------|------|
| ADR-002 (v2.0) | Pipeline sequencial automático: Evaluate → Adapt → Image (steps 1→2→3) | Step 3 (Image) desacoplado: pipeline roda apenas steps 1→2; imagem gerada on-demand pela aba Imagens | Atualizar para v3.0 |

### New Decisions Required

Nenhuma decisão arquitetural nova exigida. O desacoplamento do step 3 é coberto pela atualização do ADR-002.

## Reference Materials

### Source Documents

| Arquivo | Seções Relevantes |
|---------|------------------|
| `components/LigarNoPlayModal.tsx` | Modal a ser substituído — todas as seções e ações |
| `components/ContentCard.tsx` | Variants `'hit'` e `'plan'` — ações atuais a serem ajustadas |
| `app/planejamento/client.tsx` | Fluxo de abertura do modal e filtros existentes |
| `app/analise-hits/client.tsx` | Função `generateReplicas` e cards de hit |
| `app/api/pipeline/run/route.ts` | Sequência atual dos 3 steps — modificar aqui o desacoplamento |
| `.context/decisions/002-four-step-ai-pipeline.md` | ADR a ser atualizado para v3.0 |

**⚠️ Executor Note:** Leia cada arquivo acima antes de editá-lo. Nunca modifique baseado em suposições sobre o conteúdo.

## Risks and Mitigations

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Sugestões existentes com `image_url` ficam sem superfície de visualização enquanto a aba Imagens não está pronta | Alta | Médio | Implementar Phase 4 (Imagens) antes de executar Phase 5 (Cleanup/remoção do LigarNoPlayModal) |
| Pipeline/run sem step 3 quebra código que espera `image_url` no retorno | Média | Alto | Auditar todos os consumidores do retorno de `/api/pipeline/run` na Phase 1 antes de modificar |
| `ContentCard` variant `'hit'` fica sobrecarregado com 4+ botões (Gerar Pauta + Pautas + Imagens + outros existentes) | Alta | Médio | Revisar UX do card durante Phase 2 — considerar agrupamento de ações secundárias em menu dropdown |
| Filtro por `hitId` via URL pode quebrar se `content.id` for UUID com caracteres especiais | Baixa | Baixo | Usar `encodeURIComponent` no `router.push` e `decodeURIComponent` na leitura |
| Remoção prematura do `LigarNoPlayModal` antes da nova tela de Imagens estar funcional deixa o fluxo de Meta Ads inacessível | Média | Alto | Cleanup (Phase 5) só é executado após Phase 4 completa e validada |

## Final Checklist

```
[ ] npm run type-check — sem erros TypeScript
[ ] npm run lint — sem warnings
[ ] npm run build — build completo sem falhas
[ ] ADR-002 atualizado para v3.0 antes de modificar pipeline
[ ] LigarNoPlayModal removido somente após aba Imagens estar funcional (Phase 4 antes de Phase 5)
[ ] Fluxo A (Pauta) e Fluxo B (Imagem) testados manualmente end-to-end
[ ] Filtro hitId testado em ambas as telas
[ ] Reviewed by team
```

---

**Created:** 2026-04-25
**Author:** João Vitor Mesquita
**Status:** Draft
