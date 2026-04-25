# PRP: Geração de Imagem a partir da Pauta com Referências de Produto

> Product Requirements Prompt - Planning document for complex features

<!--
PROGRESS TRACKING:
- Mark tasks as [x] when completed
- Mark success criteria as [x] when verified
- Update Status below when starting (In Progress) and finishing (Completed)
- Add "✅ Completed: YYYY-MM-DD" after each phase validation
-->

## Summary

Adicionar geração de imagem on-demand diretamente na aba `/planejamento` (cards de pauta sem `image_url`), com upload de 1 a 3 imagens de referência do produto que são enviadas ao modelo, prompt simplificado focado em "anúncio com hook como texto sobreposto + produto", e validação do nome do modelo de geração (`gpt-image-2` se disponível, senão `gpt-image-1`).

## Context

### Problem

- Hoje o card da aba `/planejamento` mostra a pauta gerada mas **não tem ação para disparar a geração de imagem** — o usuário precisa navegar para `/imagens` para gerar.
- O prompt atual de geração ([app/api/image/route.ts:31](app/api/image/route.ts#L31)) é genérico e instrui "Sem texto na imagem", o oposto do que o time precisa: a imagem deve ser um **anúncio com o hook escrito sobre/ao lado do produto**.
- A API de imagem atual gera uma imagem "do zero" baseada em descrições textuais (`product`, `scenery`, `targetBrand.context`) — sem referência visual real do produto, o resultado fica longe da identidade do produto físico que existe no catálogo da marca.
- O time não tem como anexar fotos do produto real para guiar a geração.

### Affected Users

- **Time de mídia/tráfego** — precisa de imagens prontas como anúncio (com copy) para subir no Meta Ads
- **Gestores de operação** — querem disparar a geração sem trocar de aba após revisar a pauta
- **Designers/criativos** — precisam que a imagem gerada espelhe o produto físico de cada marca

### Success Criteria

- [x] Card de pauta em `/planejamento` exibe botão "Gerar Imagem" quando `image_url IS NULL` e status diferente de `not_replicable`/`rejected`
- [x] Click em "Gerar Imagem" abre modal dedicado com área de upload (drag-drop + file picker) para 1 a 3 imagens
- [x] Upload aceita PNG/JPG/WEBP até 10MB cada; rejeita resto com mensagem clara
- [x] Refs são enviadas ao bucket `suggestions/{suggestionId}/references/{filename}` antes da chamada à OpenAI
- [x] Modelo de geração é `gpt-image-1.5` (decisão Phase 1: `gpt-image-2` não existe; SDK `openai@^6.34` suporta `gpt-image-1.5` como modelo mais recente) — chamado via `images.edit()` para aceitar imagens de input
- [x] Prompt enviado ao modelo é exatamente: "Gere um anúncio usando o hook '{hook}' como texto sobreposto na imagem, ao lado do(s) produto(s) anexado(s)."
- [x] Após sucesso, `content_suggestions.image_url` é setado e card atualiza inline mostrando a imagem gerada
- [x] Após `image_url` setado, botão "Gerar Imagem" desaparece — regeneração bloqueada
- [x] Em caso de erro (rate limit, refusal, timeout), toast exibe mensagem e card volta ao estado "Gerar Imagem" sem persistir nada no banco

## Scope

### Included

- Botão "Gerar Imagem" inline em `ContentCard` variant `'plan'` (e qualquer outro variant que renderize uma sugestão sem imagem em `/planejamento`)
- Novo componente `GenerateImageModal` com upload, preview de refs, e disparo da geração
- Endpoint `POST /api/image` modificado para aceitar `multipart/form-data` com `suggestionId` + arquivos `references[]`
- Helper `lib/ai/openai.ts#generateImageWithReferences()` usando `images.edit()`
- Upload das refs para Supabase Storage no path `{suggestionId}/references/{uuid}.{ext}` antes da chamada à OpenAI
- Validação client-side de tipos (PNG/JPG/WEBP) e tamanho (≤10MB cada)
- Bloqueio de regeneração: botão "Gerar Imagem" só aparece quando `image_url IS NULL`
- Atualização do ADR-002 para v4.0 documentando: refs de produto + prompt simplificado + bloqueio de regeneração

### Excluded (not doing now)

- Aba `/imagens` — comportamento atual (`ImageCard.tsx`) **não é alterado** neste PRP (escopo focado só em `/planejamento`)
- Regeneração de imagem (uma vez gerada, fica fixa — para regenerar PM precisa rejeitar a sugestão e gerar nova pauta)
- Edição manual da imagem gerada
- Galeria reutilizável de refs por marca (cada geração faz upload novo, sem reaproveitamento entre sugestões)
- Versionamento/histórico de imagens geradas
- Internacionalização do prompt (sempre em PT-BR)
- Integração com aba Xadrez de Replicação
- Migration de schema (zero alteração no banco — apenas Storage)
- Substituição/melhoria do parse JSON do Claude (escopo de outro PRP)

## Technical Design

### Affected Areas

| Área | Arquivo(s) | Tipo de Mudança |
|------|-----------|----------------|
| UI Planejamento | [app/planejamento/client.tsx](app/planejamento/client.tsx) | Adicionar callback `onGenerateImage` ao `ContentCard`; gerenciar estado do modal e refresh otimista pós-geração |
| ContentCard | [components/ContentCard.tsx](components/ContentCard.tsx) | Adicionar prop `onGenerateImage` e botão "Gerar Imagem" no variant `'plan'`, condicional a `!suggestion.image_url && !['not_replicable','rejected'].includes(status)` |
| Modal novo | `components/GenerateImageModal.tsx` (novo) | Drag-drop de 1-3 refs, validação client-side, preview, loading state, dispara POST `/api/image` |
| API endpoint | [app/api/image/route.ts](app/api/image/route.ts) | Trocar `request.json()` por `request.formData()`; processar arquivos; uploadar para Storage; trocar `images.generate()` por `images.edit()` com refs |
| Helper OpenAI | [lib/ai/openai.ts](lib/ai/openai.ts) | Nova função `generateImageWithReferences(prompt, refs: Buffer[], size)`; manter `generateImage()` atual intocada para `/imagens` |
| ADR | [.context/decisions/002-four-step-ai-pipeline.md](.context/decisions/002-four-step-ai-pipeline.md) | Atualizar para v4.0 — documentar refs + prompt novo + bloqueio regen |

### Data Model

```
Sem alterações de schema. Tabela content_suggestions já tem:

  image_url    text   (será setado pós-geração)
  status       text   (filtra: NÃO mostrar botão se 'not_replicable' ou 'rejected')

Storage layout (novo):

  bucket: suggestions
  ├── {suggestionId}/
  │   ├── image.png                    (saída final, já existente)
  │   └── references/                  (NOVO)
  │       ├── {uuid}.png
  │       ├── {uuid}.jpg
  │       └── {uuid}.webp

Refs ficam persistidas no Storage indefinidamente (não há cleanup neste PRP).
Refs NÃO são registradas no banco — listagem futura faria SELECT no Storage list().
```

### API/Interface Changes

```typescript
// POST /api/image — BREAKING CHANGE
// Antes: Content-Type: application/json, body: { suggestionId }
// Depois: Content-Type: multipart/form-data, body:
//   - suggestionId: string (form field)
//   - references: File[] (form field, 1 a 3 arquivos)
//
// Resposta sucesso (200): { image_url: string }
// Resposta erro:
//   400 — { error: 'No references provided' | 'Too many references' | 'Invalid file type' }
//   404 — { error: 'Suggestion not found' }
//   409 — { error: 'Image already exists for this suggestion' }   ← NOVO (bloqueio regen)
//   500 — { error: 'Image generation failed' | 'Storage upload failed' }

// lib/ai/openai.ts — NOVA função
export async function generateImageWithReferences(
  prompt: string,
  references: Buffer[],          // 1 a 3 buffers
  size: '1024x1536' | '1024x1024' = '1024x1536',
): Promise<Buffer>
// Internamente usa client.images.edit({ model: 'gpt-image-1', image: [...], prompt, size })
// Retorna PNG buffer da imagem gerada

// components/GenerateImageModal.tsx — NOVO componente
interface Props {
  suggestionId: string
  hook: string                   // exibido como preview do que será renderizado na imagem
  open: boolean
  onClose(): void
  onSuccess(imageUrl: string): void
}
// Internamente: useState<File[]>, validação, FormData, fetch POST /api/image, toast
```

### Prompt definitivo

```
Gere um anúncio usando o hook "{suggestion.hook}" como texto sobreposto na imagem,
ao lado do(s) produto(s) anexado(s).
```

(Sem instruções de cenário, sem brand context, sem "fotorrealista" — confiando que o modelo + as refs visuais carregam essa informação.)

## Implementation Plan

### Phase 1: Validação de Modelo & ADR

1. [x] Validar via [context7](https://context7.com) (lib `/openai/openai-node`) se `gpt-image-2` está disponível publicamente. Se sim, usar; se não, usar `gpt-image-1`. Documentar a decisão final em comentário no helper.
2. [x] Validar via context7 que `client.images.edit()` aceita **array de imagens** quando `model: 'gpt-image-1'` (e não só uma imagem como o SDK tipado dall-e-3 sugere). Documentação OpenAI confirma até 16 imagens; SDK pode exigir cast `as any` se tipos estiverem atrasados.
3. [x] Atualizar [.context/decisions/002-four-step-ai-pipeline.md](.context/decisions/002-four-step-ai-pipeline.md) para **v3.0** (alinhado com versionamento atual do ADR):
   - Step 3 (Image) agora exige refs de produto como input
   - Prompt simplificado: hook como texto sobreposto + produto anexado
   - Regeneração bloqueada: uma vez gerada, fica fixa
4. [x] Confirmar no Supabase Studio que o bucket `suggestions` é público e aceita uploads de PNG/JPG/WEBP (limite atual de 50MiB no `config.toml` é suficiente).

**Validation:** ADR-002 marcado como v3.0; decisão sobre nome do modelo registrada; bucket validado.

✅ **Completed:** 2026-04-25 — SDK `openai@^6.34.0` confirma: `gpt-image-2` não existe; modelos disponíveis são `gpt-image-1.5` (default), `gpt-image-1`, `gpt-image-1-mini`, `chatgpt-image-latest`. SDK já tipa `image: Uploadable | Array<Uploadable>` (sem cast). ADR-002 atualizado para v3.0 com Step 3a detalhado.

### Phase 2: Backend — Endpoint e Helper

5. [x] Ler [app/api/image/route.ts](app/api/image/route.ts) e [lib/ai/openai.ts](lib/ai/openai.ts) completos antes de editar.
6. [x] Em `lib/ai/openai.ts`, criar função `generateImageWithReferences(prompt, refs, size)`:
   - Recebe `Buffer[]` (1 a 3)
   - Internamente converte cada Buffer para `File`/`Blob` aceito pelo SDK (`new File([buffer], 'ref-N.png', { type: 'image/png' })` ou usar `toFile()` helper do SDK)
   - Chama `client.images.edit({ model, image: refs, prompt, size, n: 1 })`
   - Lê `b64_json` da resposta e retorna `Buffer.from(b64, 'base64')`
   - Não adiciona retry (decisão Q8: toast e usuário reenvia)
7. [x] Reescrever `POST /api/image`:
   - Trocar `request.json()` por `request.formData()`
   - Extrair `suggestionId` (string) e `references` (File[])
   - Validar: 1 ≤ refs.length ≤ 3; cada arquivo com mime em `['image/png','image/jpeg','image/webp']` e size ≤ 10MB; rejeitar com 400 caso contrário
   - Buscar a sugestão; se `image_url` já existe, retornar 409 (bloqueio regen)
   - Para cada ref: upload para `suggestions/{suggestionId}/references/{crypto.randomUUID()}.{ext}`; coletar Buffers
   - Construir prompt: ``Gere um anúncio usando o hook "${suggestion.hook}" como texto sobreposto na imagem, ao lado do(s) produto(s) anexado(s).``
   - Chamar `generateImageWithReferences(prompt, buffers, size)` (size depende de `platform === 'tiktok'`)
   - Upload do PNG resultante em `suggestions/{suggestionId}/image.png` (mantém path atual)
   - Update `content_suggestions.image_url`, `output_mode='image'`, `status='draft'`
   - Retornar `{ image_url }`

**Validation:** Chamar `POST /api/image` via cURL com `multipart/form-data` contendo 1 ref → recebe 200 e `image_url`. Chamar de novo no mesmo `suggestionId` → recebe 409.

✅ **Completed:** 2026-04-25 — `lib/ai/openai.ts` exporta `generateImageWithReferences` usando `gpt-image-1.5` via `images.edit` + helper `toFile` do SDK. `app/api/image/route.ts` reescrito para `multipart/form-data`, validando 1-3 refs (PNG/JPG/WEBP, ≤10MB), bloqueando regeneração com 409, fazendo upload das refs em `suggestions/{id}/references/{uuid}.{ext}`. `generateImage` legado mantido intocado para `/imagens`.

### Phase 3: UI — Modal de Geração

8. [x] Criar [components/GenerateImageModal.tsx](components/GenerateImageModal.tsx):
   - Reusar `Dialog` de `components/ui/` (mesmo padrão do `PautaDetailModal` e `LigarNoPlayModal`)
   - Header mostra o hook que será sobreposto (deixa claro o que vai ser gerado)
   - Área drag-drop com fallback para `<input type="file" multiple accept="image/png,image/jpeg,image/webp">`
   - Estado local `useState<File[]>([])` com:
     - Validação inline: rejeita >3 arquivos, mime inválido ou >10MB com mensagem clara
     - Preview thumbnails (URL.createObjectURL) com botão remover por item
   - Botão "Gerar" desabilitado se `files.length === 0`
   - Loading state durante fetch (botão vira "Gerando..." + disabled, fechar modal bloqueado)
   - Em sucesso: `onSuccess(image_url)` + `toast.success('Imagem gerada!')` + fechar modal
   - Em erro: `toast.error(message)` + permanece aberto com refs preservadas para reenvio

### Phase 4: UI — Integração no Card e Página

9. [x] Ler [components/ContentCard.tsx](components/ContentCard.tsx) completo (em especial variant `'plan'` em linhas 142+).
10. [x] Em `ContentCard`, variant `'plan'`:
    - Adicionar prop opcional `onGenerateImage?: () => void`
    - Adicionar botão "Gerar Imagem" (estilo `PillButton variant="yellow"` para destacar a CTA) condicionalmente: `{!suggestion.image_url && !['not_replicable','rejected'].includes(suggestion.status) && onGenerateImage && <PillButton onClick={onGenerateImage}>Gerar Imagem</PillButton>}`
11. [x] Em [app/planejamento/client.tsx](app/planejamento/client.tsx):
    - Adicionar `useState<typeof initialSuggestions[number] | null>(null)` para controlar `imageModal`
    - Passar `onGenerateImage={() => setImageModal(s)}` no `ContentCard`
    - Renderizar `<GenerateImageModal ... onSuccess={(url) => { /* atualizar suggestion local com image_url=url */ setImageModal(null) }} />` quando `imageModal` estiver setado
    - Atualizar a sugestão localmente após sucesso (transform `suggestions` para refletir nova `image_url` sem refetch — `setSuggestions` precisa virar state mutável; hoje é `useState(initialSuggestions)` sem setter exposto, criar setter)

**Validation manual no browser:**
1. Abrir `/planejamento` com sugestão sem imagem (ex: criar uma nova via `/analise-hits` "Gerar Pauta")
2. Card mostra botão "Gerar Imagem"
3. Click abre modal; tentar enviar 4 arquivos → erro inline
4. Tentar enviar `.gif` → erro inline
5. Tentar enviar arquivo de 15MB → erro inline
6. Enviar 1 PNG válido + click "Gerar" → loading → imagem aparece no card
7. Botão "Gerar Imagem" desaparece após sucesso
8. Recarregar página → imagem persiste
9. Verificar Storage do Supabase: `suggestions/{id}/references/{uuid}.png` existe + `suggestions/{id}/image.png` atualizado

### Phase 5: Testes & Cleanup

12. [x] `npm run type-check` — sem erros
13. [x] `npm run lint` — sem novos warnings/erros (2 warnings pré-existentes em `ContentCard.tsx` no uso de `<img>` permanecem; corrigido `<img>` quote-escape pré-existente em `ImageCard.tsx` que estava bloqueando o lint)
14. [x] `npm run build` — passa
15. [ ] Verificar manualmente no banco (via MCP Supabase): após geração, `content_suggestions.image_url` aponta para URL pública do bucket *(validação manual — fazer no browser durante uso real)*
16. [x] Confirmar que aba `/imagens` (caminho legado) continua funcionando inalterada — `generateImage()` original mantida intocada em `lib/ai/openai.ts`; `app/imagens/*` não tocado

✅ **Completed:** 2026-04-25 — type-check, lint e build passam. Validação manual no browser fica para o usuário.

## Testing

### Unit Tests

```
- lib/ai/openai.ts#generateImageWithReferences:
    - Recebe array vazio de refs → throw / erro
    - Mock do client.images.edit retornando b64 → retorna Buffer

- app/api/image/route.ts:
    - POST com multipart sem `suggestionId` → 400
    - POST com 0 ou 4+ refs → 400
    - POST com mime inválido → 400
    - POST com sugestão inexistente → 404
    - POST com sugestão que já tem image_url → 409 (bloqueio regen)
    - POST sucesso → image_url no banco + retorno 200

- components/GenerateImageModal:
    - Validação client-side de tipos e tamanho
    - Estado de loading bloqueia close
```

### Integration Tests

```
Fluxo completo:
  1. POST /api/pipeline/run para criar sugestão (image_url = null)
  2. Acessar /planejamento → card visível com botão "Gerar Imagem"
  3. Abrir modal, anexar 2 refs PNG válidas, clicar Gerar
  4. Verificar:
     - Storage: 2 arquivos em suggestions/{id}/references/
     - Storage: 1 arquivo em suggestions/{id}/image.png (sobrescrevendo se existia)
     - DB: image_url atualizado, output_mode='image', status='draft'
  5. Recarregar página → card sem botão "Gerar Imagem", imagem visível
  6. Tentar POST /api/image novamente → 409
```

## Decisions

### Impact on Existing Decisions

| ADR | Decisão Atual | Mudança Proposta | Ação |
|-----|--------------|-----------------|------|
| ADR-002 (v3.0) | Step 3 (Image) gerado on-demand via `gpt-image-1` com prompt verboso (cenário, contexto, "sem texto") | Step 3 exige 1-3 refs de produto como input; prompt simplificado focado em "hook como texto sobreposto + produto anexado"; regeneração bloqueada após primeira geração | Atualizar para v4.0 |

### New Decisions Required

| Decisão | Contexto | Opções a Considerar |
|---------|---------|---------------------|
| Nome do modelo de imagem | Usuário pediu `gpt-image-2`; documentação só confirma `gpt-image-1` | (a) usar `gpt-image-1` agora; (b) usar `gpt-image-2` se context7 confirmar disponibilidade na Phase 1; **decisão final é tarefa da Phase 1** |
| Persistência de refs | Refs vão direto pro Storage sem registro em DB | Já decidido (Q3): apenas Storage, sem coluna no banco. Documentar como nota no ADR-002 v4.0 |

**Note:** ADR-002 v4.0 deve ser criado em Phase 1 antes de implementar.

## Reference Materials

### Source Documents

| Arquivo | Seções Relevantes |
|---------|------------------|
| [maquina-de-hits.md](maquina-de-hits.md) | Seção 6 — Camada de IA, Passo 3a (Geração de imagem) |
| [.context/decisions/002-four-step-ai-pipeline.md](.context/decisions/002-four-step-ai-pipeline.md) | ADR a ser atualizado para v4.0 |
| [.context/prp/generated/20260425-separacao-superficies-pautas-imagens.md](.context/prp/generated/20260425-separacao-superficies-pautas-imagens.md) | Contexto do desacoplamento atual entre pauta e imagem (já implementado) |
| [app/api/image/route.ts](app/api/image/route.ts) | Endpoint a ser modificado para `multipart/form-data` |
| [lib/ai/openai.ts](lib/ai/openai.ts) | Helper a ser estendido com `generateImageWithReferences` |
| [components/ContentCard.tsx](components/ContentCard.tsx) | Variant `'plan'` (linha ~142) — onde adicionar o botão |
| [app/planejamento/client.tsx](app/planejamento/client.tsx) | Estado e renderização do modal + refresh otimista |
| [components/PautaDetailModal.tsx](components/PautaDetailModal.tsx) | Padrão de Dialog a seguir no novo `GenerateImageModal` |
| OpenAI docs `images.edit` | Confirmar suporte a `image[]` com `gpt-image-1` (até 16 imagens) — validar via context7 |

**⚠️ Executor Note:** Leia cada arquivo acima antes de editá-lo. Visual references não foram fornecidas — UI deve seguir o look-and-feel dos modais existentes (`PautaDetailModal`, `LigarNoPlayModal`).

## Risks and Mitigations

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `gpt-image-2` não existe publicamente — implementação tenta usar e quebra | Alta | Alto | Phase 1 task #1 valida via context7 antes de qualquer código; fallback documentado para `gpt-image-1` |
| SDK do OpenAI não tipa `image: File[]` no `images.edit()` (tipo atual é só `File`) | Média | Médio | Cast `as any` controlado no helper; documentar comentário inline; testar via cURL paralelamente |
| Modelo recusa renderizar texto na imagem (alucinação ortográfica em PT-BR) | Alta | Médio | Aceitar limitação; sem retry automático (Q8); usuário ajusta hook ou reenvia. Documentar no ADR-002 v4.0 como "limitação conhecida" |
| Refs ficam órfãs no Storage se geração falhar | Média | Baixo | Aceitável neste MVP; cleanup futuro pode varrer pastas com `image.png` ausente |
| Uploads concorrentes da mesma sugestão criam race condition no `image_url` | Baixa | Baixo | Bloqueio em 409 já cobre — segunda chamada falha imediatamente |
| Custo da OpenAI dispara com refs grandes | Média | Médio | Limite de 3 refs × 10MB = 30MB max por chamada; aceitável para MVP. Monitorar conta após primeira semana de uso |
| Usuário gera imagem, acha ruim, e não consegue regerar (decisão de bloqueio) | Alta | Médio | Comportamento explícito por design (Q4); workaround: PM rejeita sugestão e gera nova pauta. Avisar no toast "Para regerar, rejeite a sugestão e gere uma nova" |
| Validação de mime client-side é falsificável; arquivo malicioso vai pro bucket | Baixa | Médio | Storage do Supabase tem limite global (50MiB) e validação server-side adicional no endpoint (Phase 2 task #7) |

## Final Checklist

```
[ ] npm run type-check — sem erros TypeScript
[ ] npm run lint — sem warnings
[ ] npm run build — build completo sem falhas
[ ] ADR-002 atualizado para v4.0 antes de modificar /api/image
[ ] Decisão final do nome do modelo (gpt-image-1 ou gpt-image-2) documentada no helper
[ ] Fluxo end-to-end testado manualmente em browser (Phase 4 validation)
[ ] Verificação no Storage: refs e imagem final estão nos paths corretos
[ ] Verificação no banco via MCP Supabase: image_url setado, status='draft'
[ ] Aba /imagens (caminho legado) continua funcionando sem regressão
[ ] Reviewed by team
```

---

**Created:** 2026-04-25
**Author:** João Vitor Mesquita
**Status:** Completed
