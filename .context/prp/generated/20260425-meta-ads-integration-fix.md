# PRP: Correção e Validação do Módulo Meta Ads

> Product Requirements Prompt - Planning document for complex features

<!--
PROGRESS TRACKING:
- Mark tasks as [x] when completed
- Mark success criteria as [x] when verified
- Update Status below when starting (In Progress) and finishing (Completed)
- Add "✅ Completed: YYYY-MM-DD" after each phase validation
-->

## Summary

Corrigir os bugs críticos na integração com a Facebook Marketing API (Graph API v21.0) que impedem o botão "Publicar no Facebook Ads" de funcionar, validar o fluxo completo de upload de imagem + criação de creative + criação de ad, e melhorar a experiência do usuário no modal. Escopo: apenas Gocase.

## Context

### Problem

O botão "🚀 Publicar no Facebook Ads" em `components/LigarNoPlayModal.tsx` sempre retorna 500. Há três camadas de problema:

1. **Env vars vazias**: `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_CAMPAIGN_ID` e `META_PAGE_ID` no `.env.local` estão sem valores — nenhuma credencial real está conectada.

2. **Bugs na implementação de `lib/meta/ads.ts`**:
   - `createAdCreative`: o upload de imagem usa `Content-Type: application/json` com `{ url: imageUrl }`, mas a Meta API `/adimages` espera multipart form data ou bytes base64 — a URL passada via JSON provavelmente é ignorada e não retorna hash válido.
   - `createAdCreative`: `link_data` não tem o campo `link` obrigatório (URL de destino do anúncio).
   - `createAdCreative`: `call_to_action` está sendo stringificado como JSON dentro de outro JSON — deve ser objeto aninhado direto.
   - Imagens no Supabase Storage podem ser signed URLs (privadas) — o Meta não consegue acessar URLs privadas para upload; é necessário fazer download server-side e re-upload como bytes.

3. **UX do modal**: o botão aparece mas não há feedback proativo quando as credenciais não estão configuradas (aparece como habilitado e só falha ao clicar).

### Affected Users

Operadores internos da Gocase que usam o modal "Ligar no Play" para publicar criativos no Facebook Ads a partir de uma content_suggestion já com imagem gerada.

### Success Criteria

- [ ] Clicar em "Publicar no Facebook Ads" com credenciais configuradas cria um ad real pausado no Ads Manager do Facebook (verificável via Ad ID retornado)
- [ ] O modal exibe botão "Ver no Ads Manager" clicável após publicação bem-sucedida
- [ ] Quando `META_ACCESS_TOKEN` não está configurado, o botão aparece desabilitado (cinza) com tooltip explicativo
- [ ] Erros da API do Meta são exibidos no toast com a mensagem exata retornada
- [ ] ADR-005 criado e registrado em `.context/decisions/`
- [ ] `.env.local` documentado com instruções de como obter cada credencial

## Scope

### Included

- Criação do ADR-005 (decisão de integração Meta Ads)
- Correção do fluxo de image upload em `lib/meta/ads.ts` (multipart form ou base64 bytes)
- Adição do campo `link` obrigatório no `link_data` do ad creative (hardcoded `https://gocase.com.br` por agora)
- Correção do `call_to_action` como objeto aninhado (não stringificado)
- Download server-side da imagem Supabase + re-upload para Meta via bytes base64
- Endpoint `GET /api/meta/status` que retorna `{ configured: boolean }` 
- `LigarNoPlayModal`: botão desabilitado com tooltip quando Meta não está configurado
- `LigarNoPlayModal`: botão "Ver no Ads Manager" após publicação bem-sucedida (usa `ads_manager_url` já retornado pela rota)
- `LigarNoPlayModal`: propagação da mensagem de erro exata da API Meta no toast
- Documentação das credenciais necessárias no `.env.local` (como obter cada uma)

### Excluded (not doing now)

- Multi-brand: outras marcas (Apice, Rituaria) ficam para o futuro
- OAuth flow para conectar conta Meta no UI — credenciais ficam em env vars
- Refresh automático de token expirado
- Polling de status do ad (verificar se foi aprovado/rejeitado pelo Meta)
- Métricas/insights do ad no modal
- Configuração de orçamento — herdado do adset original na duplicação

## Technical Design

### Affected Areas

| Area | Changes |
|------|---------|
| `lib/meta/ads.ts` | Corrigir image upload (multipart/bytes), adicionar `link` ao `link_data`, corrigir `call_to_action` como objeto aninhado |
| `app/api/meta/publish/route.ts` | Sem mudanças estruturais — já está correto conceitualmente |
| `app/api/meta/status/route.ts` | Novo endpoint GET para checar se env vars estão configuradas |
| `components/LigarNoPlayModal.tsx` | Consumir `/api/meta/status`, botão disabled+tooltip, link Ads Manager |
| `.env.local` | Documentar como obter META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_CAMPAIGN_ID, META_PAGE_ID |
| `.context/decisions/005-meta-ads-integration.md` | Novo ADR |

### Data Model

Sem alterações no schema do Supabase — `meta_ad_id`, `meta_adset_id`, `meta_status` já existem em `content_suggestions`.

### API/Interface Changes

```typescript
// NOVO: GET /api/meta/status
// Response: { configured: boolean }

// CORRIGIDO: lib/meta/ads.ts — createAdCreative
// Antes (bugado):
metaPost(`/${adAccountId()}/adimages`, { url: imageUrl }) // JSON, sem link no creative

// Depois (correto):
// 1. Fetch da imagem server-side
const imageRes = await fetch(imageUrl)
const imageBuffer = await imageRes.arrayBuffer()
const base64 = Buffer.from(imageBuffer).toString('base64')

// 2. Upload como form data (multipart) ou bytes
const form = new FormData()
form.append('bytes', base64)
form.append('access_token', token())
await fetch(`${META_API_BASE}/act_${adAccountId()}/adimages`, { method: 'POST', body: form })

// 3. Creative com link obrigatório e call_to_action como objeto
{
  object_story_spec: {
    page_id: pageId(),
    link_data: {
      image_hash: imageHash,
      message: body,
      name: title,
      link: 'https://gocase.com.br',  // ← campo obrigatório ausente hoje
      call_to_action: {               // ← objeto direto, não stringificado
        type: 'LEARN_MORE',
        value: { link: 'https://gocase.com.br' }
      }
    }
  }
}
```

## Implementation Plan

### Phase 1: ADR e Credenciais

1. [x] Criar `.context/decisions/005-meta-ads-integration.md` com:
   - Decisão: usar User Access Token (long-lived via token exchange, ~60 dias) para MVP
   - Recomendação futura: migrar para System User Token (não expira) quando houver BM Admin
   - Escopo inicial: apenas Gocase (`act_GOCASE_AD_ACCOUNT_ID`)
   - Permissões necessárias: `ads_management`, `pages_read_engagement`
2. [x] Atualizar `.env.local` com comentários descrevendo como obter cada credencial:
   - `META_ACCESS_TOKEN`: Graph API Explorer → gerar token com `ads_management` + `pages_read_engagement`, depois trocar por long-lived via `/oauth/access_token`
   - `META_AD_ACCOUNT_ID`: Business Manager → Contas de Anúncio → ID no formato `act_XXXXXXXXXX`
   - `META_CAMPAIGN_ID`: Ads Manager → Campanhas → ID numérico da campanha base
   - `META_PAGE_ID`: facebook.com/about → ID da Page da Gocase

**Validation:** ADR-005 existe em `.context/decisions/`. `.env.local` tem comentários de como obter credenciais.

### Phase 2: Correção de `lib/meta/ads.ts`

1. [x] Refatorar `createAdCreative` para fazer download server-side da imagem (fetch + ArrayBuffer → Buffer base64)
2. [x] Refatorar upload de imagem para usar `FormData` multipart com campo `bytes` (base64) e `access_token`
   - Nota: a função `metaPost` atual usa `Content-Type: application/json` e não serve para upload de imagem — criar função separada `metaUploadImage`
3. [x] Adicionar campo `link: 'https://gocase.com.br'` no `link_data` do ad creative
4. [x] Corrigir `call_to_action` de string JSON stringificada para objeto aninhado com `value: { link: 'https://gocase.com.br' }`
5. [x] Corrigir `object_story_spec` — remover `JSON.stringify()` que estava sendo aplicado onde não devia
6. [x] Validar se imagem Supabase Storage é URL pública ou signed — se signed, o fetch server-side a resolve antes de enviar para Meta

**Validation:** Chamar `publishImageAd()` diretamente em um script de teste manual com credenciais reais retorna `{ ad_id, adset_id }` sem erros. Ad aparece pausado no Ads Manager.

### Phase 3: Novo Endpoint `/api/meta/status`

1. [x] Criar `app/api/meta/status/route.ts`:
   ```typescript
   export async function GET() {
     const configured = Boolean(
       process.env.META_ACCESS_TOKEN &&
       process.env.META_AD_ACCOUNT_ID &&
       process.env.META_CAMPAIGN_ID &&
       process.env.META_PAGE_ID
     )
     return NextResponse.json({ configured })
   }
   ```

**Validation:** `GET /api/meta/status` retorna `{ configured: false }` sem credenciais e `{ configured: true }` com credenciais.

### Phase 4: Melhorias no `LigarNoPlayModal.tsx`

1. [x] Adicionar `useState<boolean | null>(null)` para `metaConfigured` e buscar `/api/meta/status` no `useEffect` quando o modal abre
2. [x] Botão "Publicar no Facebook Ads": se `metaConfigured === false`, renderizar desabilitado com `title="Meta Ads não configurado — contate o admin"` (tooltip nativo HTML)
3. [x] Após publicação bem-sucedida: exibir botão `<a href={data.ads_manager_url} target="_blank">🔗 Ver no Ads Manager</a>` no bloco verde de confirmação
4. [x] No `catch` de `publishToMeta`: propagar `data.error` (mensagem exata da Meta API) no toast de erro em vez de mensagem genérica

**Validation:** Com credenciais ausentes, botão aparece cinza com tooltip. Com credenciais e publicação bem-sucedida, link "Ver no Ads Manager" aparece clicável.

## Testing

### Unit Tests

```
Sem unit tests automatizados para esta integração — a Meta API não tem sandbox.
```

### Integration Tests

```
Teste manual obrigatório antes de considerar completo:

1. Configurar .env.local com credenciais reais da conta Gocase
2. Gerar uma content_suggestion com image_url válida
3. Abrir modal "Ligar no Play"
4. Verificar: botão "Publicar" aparece habilitado (Meta configurado)
5. Clicar em "Publicar no Facebook Ads"
6. Verificar: toast de sucesso aparece com "Ad publicado!"
7. Verificar: bloco verde mostra Ad ID e Adset ID
8. Verificar: botão "Ver no Ads Manager" leva ao ad correto no Facebook
9. Verificar no Ads Manager: ad está com status PAUSED (não active)
10. Verificar no Supabase: content_suggestions.meta_status = 'in_test', meta_ad_id preenchido

Teste de erro:
11. Usar token inválido → verificar que toast mostra a mensagem exata da API Meta
12. Remover env vars → verificar que botão fica desabilitado (cinza) com tooltip
```

## Decisions

### Impact on Existing Decisions

| ADR | Current Decision | Proposed Change | Action |
|-----|------------------|-----------------|--------|
| ADR-001 | Next.js API Routes para server-side | Novo endpoint GET /api/meta/status | None — compatível |
| ADR-004 | Brand Config Registry | Meta config (token, ad account) fica em env vars, não no brand registry para MVP | None — separação clara |

### New Decisions Required

| Decision | Context | Options to Consider |
|----------|---------|---------------------|
| Tipo de token Meta | User Access Token expira em 60 dias; System User Token não expira mas requer BM Admin | User token (MVP, simples), System User token (produção, recomendado) |

**Action:** Criar ADR-005 em Phase 1 documentando a decisão e roadmap de migração.

## Credenciais Necessárias

```
META_ACCESS_TOKEN=
# Como obter: https://developers.facebook.com/tools/explorer
# 1. Selecionar App com acesso à conta de anúncios Gocase
# 2. Gerar token com permissões: ads_management, pages_read_engagement
# 3. Trocar por long-lived (60 dias):
#    GET /oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=TOKEN
# Migração futura: usar System User Token (não expira) via Meta Business Suite

META_AD_ACCOUNT_ID=act_
# Como obter: Meta Business Suite → Contas de Anúncio → ID da conta Gocase
# Formato: act_XXXXXXXXXX (incluir o prefixo "act_")

META_CAMPAIGN_ID=
# Como obter: Ads Manager Gocase → Campanhas → selecionar campanha base para Gohits
# Formato: número inteiro (ex: 120213456789)

META_PAGE_ID=
# Como obter: facebook.com/gocase → About → Page ID
# Formato: número inteiro (ex: 123456789)

META_ADSET_MAX_ADS=10
# Número máximo de ads por adset antes de duplicar (padrão: 10)
```

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User Access Token expira em 60 dias | Alta | Alto — publicação para de funcionar silenciosamente | Documentar processo de refresh; adicionar check de validade do token na rota |
| Imagem Supabase Storage é signed URL com curta expiração | Média | Alto — Meta não consegue fazer fetch da imagem | Fazer download server-side antes de enviar para Meta (Phase 2, item 1-2) |
| Meta rejeita creative por violação de política | Média | Médio — ad não é criado | Propagar mensagem exata da API no toast (Phase 4, item 4) |
| Adset duplicado herda audience targeting incompatível | Baixa | Baixo — ad fica pausado e pode ser corrigido manualmente | Documentado no ADR-005; sem mitigação no MVP |
| Rate limits da Marketing API (80004) | Baixa | Baixo — apenas em uso intensivo | Propagar mensagem de erro; sem retry automático por ora |

## Final Checklist

```
[x] ADR-005 criado
[x] lib/meta/ads.ts corrigido (image upload, link, call_to_action)
[x] GET /api/meta/status criado
[x] LigarNoPlayModal.tsx atualizado (disabled+tooltip, Ads Manager link)
[x] .env.local documentado com instruções de credenciais
[ ] Teste manual end-to-end realizado com credenciais reais
[x] npm run type-check passando
[x] npm run lint passando
```

---

**Created:** 2026-04-25
**Author:** joaovitor.mesquita@gocase.com
**Status:** Completed (pending manual test with real credentials)
