# PRP: Importação de Hits via CSV

> Product Requirements Prompt - Botão de importação de dados de vídeos hit em CSV na página Análise de Hits

<!--
PROGRESS TRACKING:
- Mark tasks as [x] when completed
- Mark success criteria as [x] when verified
- Update Status below when starting (In Progress) and finishing (Completed)
- Add "✅ Completed: YYYY-MM-DD" after each phase validation
-->

## Summary

Adicionar botão "Importar CSV" no topo da página `/analise-hits` que permite ao usuário baixar um template CSV, preencher com dados de hits e métricas, e importar diretamente para o banco — populando as tabelas `contents` e `content_metrics` sem precisar de SQL manual.

## Context

### Problem

Atualmente os hits são inseridos via seed SQL manual, o que exige acesso técnico ao banco e bloqueia o time de marketing de adicionar novos hits de forma autônoma. Para a demo e uso real, o time precisa conseguir popular dados de vídeos hit rapidamente a partir de planilhas que já existem internamente.

### Affected Users

Time de marketing e conteúdo do GoGroup — PMs e coordenadores que gerenciam hits das marcas Ápice, Rituaria e Gocase. Não têm acesso técnico ao banco de dados.

### Success Criteria

- [ ] Botão "📥 Importar CSV" visível no topo de `/analise-hits`
- [ ] Botão "📄 Baixar template" gera CSV com headers corretos e 2 linhas de exemplo
- [ ] Upload de CSV válido mostra preview com as 5 primeiras linhas antes de confirmar
- [ ] Validação rejeita arquivo com colunas obrigatórias ausentes (brand_slug, hook, platform)
- [ ] Import com sucesso faz upsert em `contents` + insert em `content_metrics`
- [ ] Múltiplas linhas com mesmo hit (datas diferentes) geram múltiplas métricas
- [ ] Página recarrega automaticamente após importação bem-sucedida
- [ ] Toast mostra `N hits importados, M métricas inseridas`

## Scope

### Included

- Botão de download do CSV template com headers + 2 linhas de exemplo
- Modal de upload com input file (aceita `.csv`)
- Preview das primeiras 5 linhas em tabela antes de confirmar
- Validação de colunas obrigatórias no frontend
- API route `POST /api/import/hits` para processar e inserir os dados
- Upsert em `contents` (match por `brand_slug + hook + platform`)
- Insert em `content_metrics` (uma linha por linha do CSV — permite múltiplas datas por hit)
- Reload automático da página após sucesso

### Excluded (não fazer agora)

- Histórico de batches de importação
- Validação avançada de URLs (image_url, video_url)
- Import de referências externas (coberto pelo ADR-003 / pós-MVP)
- Suporte a XLSX (só CSV por ora)
- Rollback de batch em caso de erro parcial

## Technical Design

### Affected Areas

| Area | Changes |
|------|---------|
| `app/analise-hits/client.tsx` | Adicionar botão "Importar CSV" + modal de upload no topo |
| `app/api/import/hits/route.ts` | Nova API route: parse CSV → validar → upsert contents + insert metrics |
| `lib/csv/` | Novo módulo: `template.ts` (gerar headers/exemplo) + `parser.ts` (parse + validar) |

### Data Model

```
CSV template — headers obrigatórios:
brand_slug, name, hook, product, creator, platform, scenery, description,
content_description, image_url, video_url, date,
views, impressions, click_count, spend, roas, engagement_rate, thumbstop_ratio

Regras:
- brand_slug: 'apice' | 'rituaria' | 'gocase' (obrigatório)
- hook: texto do hook (obrigatório — usado como chave de upsert junto com brand_slug + platform)
- platform: 'meta' | 'tiktok' | 'archive' (obrigatório)
- date: YYYY-MM-DD (obrigatório para content_metrics)
- Demais campos: opcionais

Upsert key para contents: (brand_slug + hook + platform)
  → Se hit com mesmo brand_slug + hook + platform já existe: atualiza campos
  → Se não existe: cria novo content com is_hit = TRUE

Insert para content_metrics:
  → Uma linha de métrica por linha do CSV
  → content_id referencia o content criado/atualizado
  → date é a data das métricas
```

### API/Interface Changes

```typescript
// Nova API route
POST /api/import/hits
  Content-Type: multipart/form-data
  body: { file: File (CSV) }

  Response (success):
  {
    imported: number        // hits criados ou atualizados
    metrics_inserted: number  // linhas de métricas inseridas
    skipped: number         // linhas inválidas puladas
    errors: string[]        // erros por linha (se houver)
  }

  Response (error 400):
  { error: "Colunas obrigatórias ausentes: brand_slug, hook" }

// Download do template (client-side — sem API, gerado no browser)
// lib/csv/template.ts exporta: downloadTemplate() → dispara download de CSV
```

```typescript
// lib/csv/parser.ts
interface ParsedHitRow {
  brand_slug: 'apice' | 'rituaria' | 'gocase'
  name?: string
  hook: string
  product?: string
  creator?: string
  platform: 'meta' | 'tiktok' | 'archive'
  scenery?: string
  description?: string
  content_description?: string
  image_url?: string
  video_url?: string
  date: string          // YYYY-MM-DD
  views?: number
  impressions?: number
  click_count?: number
  spend?: number
  roas?: number
  engagement_rate?: number
  thumbstop_ratio?: number
}

function parseCSV(text: string): { rows: ParsedHitRow[]; errors: string[] }
function validateHeaders(headers: string[]): string[]  // retorna colunas obrigatórias ausentes
```

## Implementation Plan

### Phase 1: Módulo CSV (lib/csv/)

1. [x] Criar `lib/csv/template.ts`:
   - Definir array `CSV_HEADERS` com todos os campos em ordem
   - Definir `CSV_EXAMPLE_ROWS` com 2 linhas de exemplo (1 Ápice + 1 Gocase)
   - Exportar `downloadTemplate()`: gera string CSV e dispara download via `<a>` tag
2. [x] Criar `lib/csv/parser.ts`:
   - `validateHeaders(headers: string[]): string[]` — retorna lista de colunas obrigatórias ausentes
   - `parseCSV(text: string): { rows: ParsedHitRow[]; errors: string[] }` — split por linha, parse valores numéricos, validar enum brand_slug e platform
   - Tratar valores vazios como `undefined` (não `null`)

**Validação:** `parseCSV` com CSV válido retorna rows sem erros. Com CSV sem coluna `brand_slug` retorna erro descritivo.

---

### Phase 2: API Route de Importação

1. [ ] Criar `app/api/import/hits/route.ts`:
   - Aceitar `multipart/form-data` com campo `file`
   - Ler o arquivo CSV como texto
   - Chamar `validateHeaders` — retornar 400 se headers faltando
   - Chamar `parseCSV` para obter rows
   - Para cada row:
     - Buscar `brand_id` pelo `brand_slug` da tabela `brands`
     - Fazer upsert em `contents` com `onConflict: 'brand_id,hook,platform'` (adicionar UNIQUE constraint se não existir)
     - Fazer insert em `content_metrics` com `content_id` retornado
   - Retornar `{ imported, metrics_inserted, skipped, errors }`
2. [ ] Adicionar UNIQUE constraint na migration (ou via SQL Editor):
   ```sql
   ALTER TABLE contents ADD CONSTRAINT contents_brand_hook_platform_unique 
   UNIQUE (brand_id, hook, platform);
   ```

**Validação:** `curl -X POST /api/import/hits -F "file=@test.csv"` retorna JSON com contagens corretas. Verificar no Supabase Table Editor que os registros foram inseridos.

---

### Phase 3: UI — Modal de Importação em `/analise-hits`

1. [ ] Criar `components/ImportCSVModal.tsx`:
   - Props: `open`, `onClose`, `onSuccess`
   - Seção de download: botão "📄 Baixar template CSV" chama `downloadTemplate()`
   - Seção de upload: `<input type="file" accept=".csv">` + label estilizada
   - Ao selecionar arquivo:
     - Ler conteúdo com `FileReader`
     - Chamar `validateHeaders` para feedback imediato
     - Se válido: mostrar preview das 5 primeiras linhas em `<Table>` (shadcn)
   - Botão "Importar" (desabilitado até preview estar ok):
     - Envia `FormData` para `POST /api/import/hits`
     - Mostra loading state durante upload
     - Sucesso: toast `"N hits importados, M métricas inseridas"` + chama `onSuccess()`
     - Erro: toast com mensagem de erro
2. [ ] Atualizar `app/analise-hits/client.tsx`:
   - Adicionar estado `importModalOpen`
   - Adicionar botão "📥 Importar CSV" no header da página (ao lado do título)
   - Montar `<ImportCSVModal>` com `onSuccess={() => router.refresh()}`
   - Importar `useRouter` do `next/navigation` para o refresh

**Validação:** Botão aparece no topo de `/analise-hits`. Upload de CSV válido mostra preview. Após confirmar, hits aparecem na página após reload automático.

---

## Testing

### Testes Manuais (MVP)

```
1. Baixar template → abrir no Excel/Numbers → verificar headers corretos + 2 linhas de exemplo
2. Preencher CSV com 5 hits (mistura de marcas e datas) → importar → verificar contagem no toast
3. Reimportar o mesmo CSV → verificar que hits existentes são atualizados (upsert) e não duplicados
4. Importar CSV com coluna obrigatória ausente → verificar erro antes do upload
5. Importar CSV com brand_slug inválido → verificar que linha é pulada com erro no response
6. Importar CSV com 2 linhas do mesmo hit em datas diferentes → verificar 1 hit + 2 métricas no DB
```

### Validações críticas no DB após import

```sql
-- Verificar hits importados
SELECT c.name, c.hook, b.slug, c.platform FROM contents c
JOIN brands b ON b.id = c.brand_id ORDER BY c.created_at DESC LIMIT 10;

-- Verificar métricas inseridas
SELECT cm.date, cm.views, cm.ctr, cm.roas FROM content_metrics cm
JOIN contents c ON c.id = cm.content_id ORDER BY cm.created_at DESC LIMIT 10;
```

## Decisions

### Impact on Existing Decisions

| ADR | Current Decision | Proposed Change | Action |
|-----|------------------|-----------------|--------|
| ADR-001 | Next.js API Routes para backend | Nova route `/api/import/hits` segue o padrão | None |
| ADR-002 | Pipeline de 4 passos | Import é pré-pipeline (popula `contents`), não interfere | None |
| ADR-004 | Brand config registry | `brand_slug` no CSV mapeia para `brands.slug` no DB — consistente | None |

### New Decisions Required

| Decision | Context | Options to Consider |
|----------|---------|---------------------|
| UNIQUE constraint em `contents` | Para upsert funcionar por brand+hook+platform, precisa de constraint no DB | Migration SQL via CLI vs. aplicar manualmente no SQL Editor do dashboard |

> Para MVP: aplicar via SQL Editor do Supabase (mais rápido, sem precisar de nova migration file).

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| CSV com encoding diferente (UTF-16, Latin-1) | Médio | Baixo | Instruir no template: "salvar como UTF-8". Se falhar, mostrar erro descritivo |
| Hook muito longo causa falha no UNIQUE index | Baixo | Baixo | Truncar hook a 500 chars no parser |
| brand_slug typo (ex: "apice " com espaço) | Alto | Médio | Trim + lowercase no parser antes de validar |
| Arquivo CSV muito grande (>1000 linhas) | Baixo | Médio | Limitar a 500 linhas por batch com aviso no modal |
| UNIQUE constraint não existe ainda | Alto (se não aplicar) | Alto | Fazer upsert com `.onConflict('brand_id,hook,platform')` — sem a constraint, o Supabase ignorará silenciosamente |

## Final Checklist

```
[ ] npm run type-check passa
[ ] npm run lint passa
[ ] Template CSV baixa com headers corretos
[ ] Preview mostra 5 primeiras linhas
[ ] Import popula contents + content_metrics no DB
[ ] Upsert não duplica hits existentes
[ ] Reload automático após sucesso
```

---

**Created:** 2026-04-24
**Author:** lucas.braide@gocase.com
**Status:** Completed
