🎯 Gohit — Spec de Hackathon
Hub de Replicação de Hits Cross-Brand · GoGroup / Gobeauté MVP · Apice · Rituaria · Gocase

📑 Índice
TL;DR
Problema
Escopo do hackathon
Stack
Schema de dados
Camada de IA
Módulo de Referências de Mercado
UI — 5 abas
Card de resultado de conteúdo
Xadrez de replicação
Ligar no Play
Alerta Hit + WhatsApp
Riscos e fallbacks

1. TL;DR
📥 30 hits fixos (10 × Apice, Rituaria, Gocase) inseridos via seed
🌐 Referências externas de mercado importadas via planilha para alimentar a IA com inspiração externa
🤖 Claude API faz 2 passos: (a) checa se é replicável, (b) se sim, gera sugestão completa
🎨 Output criativo escolhível: imagem estática (GPT-image-1) OU vídeo padrão com áudio sintetizado (ElevenLabs sobre template MP4 fixo)
🖥️ 5 abas: Planejamento · Análise de Hits · Xadrez de Replicação · Alertas · Referências Externas
▶️ Botão "Ligar no Play" = modal com pacote copy-paste + mídia baixável
🔥 Alerta Hit = mensagem formatada pronta pra colar no WhatsApp
🚀 Deploy na Vercel, Supabase managed

2. Problema
~5.000 conteúdos novos/dia · 30 pessoas na operação de conteúdo
Replicação cross-brand leva até 30 dias
Hits são perdidos por ruído / dados descentralizados
Risco adicional: retroalimentação — quando só se replica o que já funcionou internamente, a marca fica presa em padrões e deixa de inovar
Objetivo: time-to-replicate de 30 dias → <24h, mantendo diversidade criativa
Ganhos-alvo: CTR · ROAS · views · economia operacional · base histórica de hits · diversidade criativa via referências externas.

3. Escopo do hackathon
✅ Dentro
Seed manual dos 30 hits
Replicability Check via Claude (economiza custo + melhora qualidade)
Geração de texto (Claude Sonnet 4.7) só pros replicáveis
Output criativo com 2 modos:
🖼️ Imagem estática via GPT-image-1
🎥 Vídeo padrão + áudio via ElevenLabs (template MP4 fixo + hook sintetizado)
Módulo de Referências Externas com upload de planilha + uso pela IA
5 abas funcionais
Card de conteúdo com views incluído
Xadrez de replicação por marca
Copy-paste do pacote "Ligar no Play"
Copy-paste da mensagem WhatsApp
Deploy Vercel + Supabase
❌ Fora (pós-hackathon)
Ingestão automática (TikTok scraper, Meta API, Archive API)
Meta Ads API (publicação automática)
Bot WhatsApp automático
Modelo ML de score
RLS multi-tenant robusta
Ingestão automática de referências externas (hoje via planilha)
Geração de vídeos 100% sintéticos (ex: Sora, Runway) — mantemos template fixo

4. Stack
Camada
Escolha
Motivo
Frontend
Next.js 15 (App Router) + TS + Tailwind + shadcn/ui
Velocidade de UI, componentes prontos
Backend
Next.js API Routes + Server Actions
Monolito funciona bem em 24h
DB / Auth / Storage
Supabase (Postgres)
Zero-ops, auth pronta, storage integrado
IA texto
Anthropic Claude Sonnet 4.7
Melhor qualidade pra adaptação criativa
IA imagem
OpenAI GPT-image-1 ("GPT 2.0")
Qualidade alta, API estável
IA áudio/voz
ElevenLabs (eleven_multilingual_v2)
Melhor TTS em PT-BR, rápido, API simples
Merge vídeo+áudio
FFmpeg (via fluent-ffmpeg no Node)
Self-hosted, zero custo extra
Fallback imagem
Flux Pro (FAL.ai)
Plano B se GPT-image-1 falhar
Parser de planilha
SheetJS (xlsx) + PapaParse
Suporta XLSX e CSV, leve
Jobs
Supabase Edge Functions + cron
Simples, sem infra extra
Deploy
Vercel
1-click, grátis pra MVP
Secrets
Vercel env
Nunca hardcoded


5. Schema de dados
Plataforma unificada em contents, métricas separadas. Adicionadas tabelas external_references (referências de mercado) e video_templates (vídeos padrão por marca).
-- BRANDS
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,            -- 'apice' | 'rituaria' | 'gocase'
  name TEXT NOT NULL,
  context TEXT,                         -- persona, tom, do/don't
  products_context TEXT,                -- catálogo + categorias
  elevenlabs_voice_id TEXT,             -- voz padrão da marca no ElevenLabs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTENTS (hits base)
CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  product TEXT,
  brand_id UUID REFERENCES brands(id) NOT NULL,
  creator TEXT,
  image_url TEXT,
  video_url TEXT,
  video_file TEXT,
  transcription TEXT,
  scenery TEXT,
  hook TEXT,
  description TEXT,
  content_description TEXT,
  platform TEXT CHECK (platform IN ('meta','tiktok','archive')),
  is_hit BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTENT METRICS
CREATE TABLE content_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  click_count INT DEFAULT 0,
  impressions INT DEFAULT 0,
  views INT DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  thumbstop_ratio NUMERIC(6,4) DEFAULT 0,
  ctr NUMERIC(6,4) GENERATED ALWAYS AS
    (CASE WHEN impressions > 0 THEN click_count::numeric / impressions ELSE 0 END) STORED,
  roas NUMERIC(8,4) DEFAULT 0,
  engagement_rate NUMERIC(6,4) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIDEO TEMPLATES (vídeos padrão por marca/plataforma — inputados por nós)
CREATE TABLE video_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) NOT NULL,
  name TEXT NOT NULL,                   -- ex: "Apice - TikTok 9x16 - Skincare"
  platform TEXT CHECK (platform IN ('tiktok','meta','archive')),
  aspect_ratio TEXT CHECK (aspect_ratio IN ('9:16','1:1','16:9')),
  video_file_url TEXT NOT NULL,         -- MP4 hospedado no Supabase Storage
  duration_seconds NUMERIC(5,2),
  has_original_audio BOOLEAN DEFAULT FALSE, -- se TRUE, áudio ElevenLabs sobrepõe
  notes TEXT,
  is_default BOOLEAN DEFAULT FALSE,     -- template padrão para a combinação marca+plataforma
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXTERNAL REFERENCES (referências de mercado importadas via planilha)
CREATE TABLE external_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  source_brand TEXT,                    -- marca/empresa externa (ex: "Sephora", "Natura")
  creator TEXT,                         -- @handle do criador
  platform TEXT CHECK (platform IN ('tiktok','meta','youtube','instagram','other')),
  category TEXT,                        -- beleza, tech, moda, lifestyle...
  video_url TEXT,
  thumb_url TEXT,
  hook TEXT,
  description TEXT,
  transcription TEXT,
  approx_views INT,
  approx_engagement NUMERIC(6,4),
  tags TEXT[],                          -- ['tendência','humor','antes-depois']
  notes TEXT,                           -- por que foi adicionada
  added_by TEXT,                        -- usuário que importou
  import_batch_id UUID,                 -- agrupa por upload de planilha
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTENT SUGGESTIONS (geradas pela IA para outras marcas)
CREATE TABLE content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_content_id UUID REFERENCES contents(id),
  origin_brand_id UUID REFERENCES brands(id),
  target_brand_id UUID REFERENCES brands(id) NOT NULL,
  platform TEXT,

  -- replicability check
  is_replicable BOOLEAN NOT NULL,
  replicability_reason TEXT,

  -- conteúdo gerado
  name TEXT,
  product TEXT,
  creator TEXT,
  transcription TEXT,
  scenery TEXT,
  hook TEXT,
  description TEXT,
  content_description TEXT,
  briefing TEXT,

  -- OUTPUT CRIATIVO (escolhível)
  output_mode TEXT CHECK (output_mode IN ('image','video')),
  image_url TEXT,                       -- output GPT-image-1
  audio_url TEXT,                       -- output ElevenLabs (MP3)
  video_template_id UUID REFERENCES video_templates(id),
  final_video_url TEXT,                 -- MP4 final (template + áudio)

  -- referências externas usadas
  external_references_used UUID[],      -- array de external_references.id

  estimated_ctr NUMERIC(6,4),
  estimated_roas NUMERIC(8,4),
  estimated_views INT,
  estimated_impact_score NUMERIC(5,2),

  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','approved','rejected','in_play','published','not_replicable')),
  ai_model_version TEXT,
  ai_generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(origin_content_id, target_brand_id, output_mode)
);

-- ALERTS
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('hit','daily_report')),
  content_id UUID REFERENCES contents(id),
  brand_id UUID REFERENCES brands(id),
  message_formatted TEXT NOT NULL,
  sent_whatsapp BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SETTINGS
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX idx_contents_brand ON contents(brand_id);
CREATE INDEX idx_metrics_content_date ON content_metrics(content_id, date DESC);
CREATE INDEX idx_suggestions_target_status ON content_suggestions(target_brand_id, status);
CREATE INDEX idx_suggestions_origin ON content_suggestions(origin_content_id);
CREATE INDEX idx_video_templates_brand_platform ON video_templates(brand_id, platform);
CREATE INDEX idx_external_category ON external_references(category);
CREATE INDEX idx_external_platform ON external_references(platform);
CREATE INDEX idx_external_tags ON external_references USING GIN(tags);

📊 View auxiliar para o xadrez
CREATE OR REPLACE VIEW v_replication_matrix AS
SELECT
  c.id           AS content_id,
  c.name         AS content_name,
  c.hook,
  c.image_url,
  c.brand_id     AS origin_brand_id,
  bo.name        AS origin_brand_name,
  bo.slug        AS origin_brand_slug,
  bt.id          AS target_brand_id,
  bt.name        AS target_brand_name,
  bt.slug        AS target_brand_slug,
  s.id           AS suggestion_id,
  s.status,
  s.is_replicable,
  s.output_mode,
  s.estimated_impact_score
FROM contents c
CROSS JOIN brands bt
JOIN brands bo ON bo.id = c.brand_id
LEFT JOIN content_suggestions s
  ON s.origin_content_id = c.id AND s.target_brand_id = bt.id
WHERE c.is_hit = TRUE
  AND bo.id <> bt.id;


6. Camada de IA
🧠 Fluxo completo (4 passos)
[Hit origem + Marca destino + Referências externas relevantes]
         ↓
 ┌───────────────────────┐
 │  PASSO 1: Claude      │
 │  Replicability Check  │
 └───────────────────────┘
         ↓
  ┌──────┴──────┐
  ↓             ↓
is_replicable  is_replicable
  = false       = true
  ↓             ↓
Status:      ┌───────────────────────┐
'not_        │  PASSO 2: Claude      │
replicable'  │  Gera sugestão        │
             │  (c/ referências ext.)│
             └───────────────────────┘
                      ↓
           ┌──────────┴──────────┐
           ↓                     ↓
    output_mode=image     output_mode=video
           ↓                     ↓
  ┌────────────────┐   ┌─────────────────────┐
  │ PASSO 3a:      │   │ PASSO 3b: ElevenLabs│
  │ GPT-image-1    │   │ TTS do hook         │
  └────────────────┘   └─────────────────────┘
           ↓                     ↓
           ↓           ┌─────────────────────┐
           ↓           │ PASSO 4: FFmpeg     │
           ↓           │ merge template MP4 +│
           ↓           │ áudio gerado        │
           ↓           └─────────────────────┘
           ↓                     ↓
           └──────────┬──────────┘
                      ↓
             Status: 'draft'

Ganhos do fluxo:
💰 Economiza custo (não gera mídia pra 30-40% que não é replicável)
🎯 Qualidade maior (só gera onde faz sentido)
🌱 Diversidade criativa (referências externas evitam retroalimentação)
🎬 Flexibilidade de output (PM escolhe imagem ou vídeo por sugestão)
🧪 Passo 1 — Replicability Check
Modelo: claude-sonnet-4-7 Temperatura: 0.2 Tokens: ~500 in / ~300 out
Prompt:
SYSTEM:
Você é especialista em marketing de performance para e-commerce.
Sua tarefa é avaliar se um conteúdo HIT de uma marca pode ser
replicado para outra marca do mesmo grupo.

USER:
<HIT_ORIGEM>
Marca: {origin.name}
Contexto: {origin.context}
Plataforma: {platform}
Hook: {content.hook}
Produto: {content.product}
Cenário: {content.scenery}
Descrição: {content.description}
Transcrição: {content.transcription}
Métricas: CTR {ctr}% · ROAS {roas}x · Views {views}
</HIT_ORIGEM>

<MARCA_DESTINO>
Nome: {target.name}
Contexto: {target.context}
Produtos: {target.products_context}
</MARCA_DESTINO>

AVALIE se é replicável.
Critérios de NÃO REPLICÁVEL:
- Produto origem não tem equivalente na marca destino
- Tom de voz incompatível com a persona destino
- Cenário/contexto específico demais da origem
- Público-alvo incompatível

Retorne SOMENTE JSON válido:
{ "is_replicable": true | false, "reason": "explicação curta (máx 300 chars)" }

✍️ Passo 2 — Geração da sugestão
Modelo: claude-sonnet-4-7 Temperatura: 0.7 Tokens: ~2k in / ~2.5k out
Prompt:
SYSTEM:
Você é criador de conteúdo especialista em adaptar hits virais
entre marcas, mantendo a estrutura que funcionou e ajustando
produto, cenário, linguagem e persona. Você também se inspira em
referências externas de mercado para trazer frescor criativo.

USER:
<HIT_ORIGEM>
[mesmo bloco do passo 1]
</HIT_ORIGEM>

<MARCA_DESTINO>
[mesmo bloco do passo 1]
</MARCA_DESTINO>


Gere a ADAPTAÇÃO em JSON válido:
{
  "name": "título descritivo",
  "product": "produto da marca destino",
  "hook": "hook adaptado (PRESERVAR estrutura do original, pode buscar frescor nas refs externas)",
  "scenery": "cenário adaptado",
  "description": "caption pronta",
  "content_description": "roteiro do vídeo em passos",
  "briefing": "briefing de 400-600 palavras para o criador",
  "estimated_ctr": número,              // 60-100% do CTR origem
  "estimated_roas": número,             // 60-100% do ROAS origem
  "estimated_views": inteiro,
  "estimated_impact_score": 0-100,
  "justificativa_adaptacao": "racional curto",
  "external_references_used": [id1, id2]  // ids das refs que mais influenciaram
}

REGRAS:
- Mantenha a ESTRUTURA do hook (o que viralizou)
- Adapte produto/cenário/linguagem para a marca destino
- Use as referências externas pra evitar padrões repetitivos
- Respeite do/don't da marca destino
- Não invente métricas — derive das fornecidas

🎨 Passo 3a — Geração de imagem (quando output_mode = 'image')
Modelo: gpt-image-1
Imagem de referência para vídeo publicitário da marca {target.name}.
Produto: {suggestion.product}
Cenário: {suggestion.scenery}
Estilo visual: {target.context - trecho visual}
Hook: {suggestion.hook}
Formato: {9:16 se tiktok/reels | 1:1 se feed}

Fotorrealista, alta qualidade, luz natural, foco no produto.

Parâmetros:
size: "1024x1536" (vertical) ou "1024x1024" (quadrado)
quality: "high"
Salvar em: suggestions/{suggestion_id}/image.png
🎙️ Passo 3b — Geração de áudio (quando output_mode = 'video')
Modelo ElevenLabs: eleven_multilingual_v2 Voice ID: brands.elevenlabs_voice_id (voz padrão da marca destino) Input:suggestion.hook (hook adaptado gerado no Passo 2)
Configuração:
{
  "text": "{suggestion.hook}",
  "voice_id": "{target.elevenlabs_voice_id}",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.3,
    "use_speaker_boost": true
  },
  "output_format": "mp3_44100_128"
}

Salvar em: suggestions/{suggestion_id}/audio.mp3
🎬 Passo 4 — Merge vídeo template + áudio (quando output_mode = 'video')
Ferramenta: fluent-ffmpeg (Node.js) no backend
Fluxo:
Buscar video_template default da combinação target_brand_id + platform
Baixar MP4 template localmente (ou stream)
Baixar MP3 do áudio gerado
FFmpeg merge:
Se template.has_original_audio = FALSE → adiciona áudio simples
Se template.has_original_audio = TRUE → substitui áudio original
Upload do MP4 final no Supabase Storage
Atualizar suggestion.final_video_url
Comando FFmpeg (substituir áudio):
ffmpeg -i template.mp4 -i audio.mp3 \
  -map 0:v -map 1:a \
  -c:v copy -c:a aac -shortest \
  output.mp4

Salvar em: suggestions/{suggestion_id}/final.mp4
💰 Custo estimado (60 combinações diárias)
Assumindo 50% imagem / 50% vídeo entre as replicáveis:
Item
Qtd
Custo
Passo 1 (replicability)
60 chamadas
~$0.30
Passo 2 (sugestão)
36 chamadas
~$0.95
Passo 3a (imagem — ~18)
18 imagens
~$1.10
Passo 3b (ElevenLabs — ~18 hooks, ~100 chars cada)
1.8k chars
~$0.35
Passo 4 (FFmpeg — self-hosted)
18 merges
$0
Total diário


~$2.70/dia
Mensal


~$80/mês


7. Módulo de Referências de Mercado
🎯 Por que existe
Se a IA só olha hits internos, os conteúdos ficam presos a padrões da casa → retroalimentação → criatividade estagna. O módulo de referências externas injeta inspiração de fora pra evitar endogamia criativa e expor o Gohit ao que está performando no mercado amplo (concorrentes, categorias adjacentes, tendências globais).
📥 Input via planilha (MVP)
Formato aceito: XLSX ou CSV
Colunas obrigatórias:
Coluna
Tipo
Exemplo
title
texto
"Antes/depois com sérum Sephora"
source_brand
texto
"Sephora"
creator
texto
"@beauty.by.ana"
platform
enum
tiktok / meta / youtube / instagram / other
category
texto
"beleza"
video_url
url
https://tiktok.com/...
hook
texto
"Eu não acreditava até testar..."
description
texto
caption original

Colunas opcionais:
Coluna
Tipo
thumb_url
url
transcription
texto
approx_views
número
approx_engagement
número (0-1)
tags
lista separada por vírgula
notes
texto

🔄 Fluxo de importação
Usuário acessa /referencias
Clica em "Importar planilha"
Faz upload de XLSX/CSV
Sistema parseia via SheetJS + valida colunas
Preview das primeiras 10 linhas
Usuário confirma → insere em external_references com import_batch_id único
Toast de sucesso: "120 referências importadas no batch #abc123"
🧠 Como a IA usa
No Passo 2 (geração da sugestão), antes de montar o prompt:
const externalRefs = await supabase
  .from('external_references')
  .select('*')
  .or(`category.eq.${targetBrand.category},platform.eq.${platform}`)
  .order('approx_engagement', { ascending: false })
  .limit(5);

As referencias externas entram como outros hits dentro da analise - se tiver alguma referencia externa com desempenho absurdo, podemos também utiliza-la para gerar sugestões de hits novas com base em referencias externas.
♻️ Anti-retroalimentação
Regras no prompt para evitar que a IA fique só replicando padrões internos:
"Use as referências externas pra evitar padrões repetitivos - mas mantenha o core do anuncio hit original”
"Priorize elementos que ainda não apareceram em hits da marca destino"
Post-hackathon: adicionar métrica de "índice de frescor" = % de sugestões com external_references_used não-vazio.
🎨 Tela de gestão
Ver seção 8 — Aba 5.

8. UI — 5 abas
🧭 Navegação
/                               → redirect /planejamento
├── /planejamento               → Aba 1 · Sugestões geradas pra marca selecionada
├── /analise-hits               → Aba 2 · Hits da própria marca
├── /xadrez                     → Aba 3 · Matriz de replicação
├── /alertas                    → Aba 4 · Feed + relatório
├── /referencias                → Aba 5 · Referências externas de mercado
├── /hits                       → CRUD seed (admin)
├── /templates                  → Gestão dos video_templates (admin)
└── /config                     → threshold, prompts, brand context, voice_id

📈 Aba 1 — Planejamento
Filtros: marca destino · plataforma · status · score mínimo · output_mode (imagem/vídeo)
Grid de cards de sugestão (ver seção 9) ordenados por score
Badge "NÃO REPLICÁVEL" para rejeitadas pelo Passo 1 (tooltip com motivo)
Cada card mostra se é imagem (🖼️) ou vídeo (🎥)
Ações do card: Aprovar · Rejeitar · Ligar no Play · Ver hit origem · Ver refs externas usadas
🔥 Aba 2 — Análise de Hits
Filtros: marca · plataforma · período
Lista de hits da própria marca (10 do seed)
Card com views, CTR, ROAS, engagement, thumbstop
Botão "Gerar réplicas para outras marcas" (modal pede output_mode)
Mini-ranking: top 5 hits do período
♟️ Aba 3 — Xadrez de Replicação
Ver seção 10.
🚨 Aba 4 — Alertas & Relatórios
Feed cronológico de alertas
Relatório diário por marca × plataforma
Botão "Copiar mensagem WhatsApp" por alerta
🌐 Aba 5 — Referências Externas
Botão topo: "Importar planilha" (abre modal upload XLSX/CSV)
Filtros: plataforma · categoria · tags · período de importação
Grid/tabela com thumb + hook + source_brand + métricas aproximadas
Indicador de uso: quantas vezes cada ref foi usada pela IA
Ações por item: editar · remover · marcar como destaque
Dashboard de topo:
Total de referências ativas: N
Categorias cobertas: N
% de sugestões que usaram ≥1 ref externa (índice de frescor): X%
Último batch importado: data + nome

9. Card de resultado de conteúdo
Componente reutilizado em Planejamento, Análise de Hits e Xadrez.
┌──────────────────────────────────────────────┐
│  [IMG/THUMB]          🎥 Vídeo · 🔥 HIT · TT │
│                                               │
│  Hook: "Antes eu sofria com..."              │
│  Produto: Creme Regenerador Apice            │
│  Creator: @maria.skincare                    │
│                                               │
│  ┌──────────┬──────────┬──────────┐          │
│  │ 👀 Views │ 📊 CTR   │ 💰 ROAS  │          │
│  │  234k    │  3.4%    │  4.2x    │          │
│  └──────────┴──────────┴──────────┘          │
│  ┌──────────┬──────────┬──────────┐          │
│  │ Impress. │ Engajam. │ Spend    │          │
│  │  1.2M    │  8.7%    │ R$ 5.4k  │          │
│  └──────────┴──────────┴──────────┘          │
│                                               │
│  Score de impacto: ████████░░ 82/100         │
│  🌐 Inspirado em: Sephora, Natura (2 refs)   │
│                                               │
│  [Ver detalhes]  [▶️ Ligar no Play]           │
└──────────────────────────────────────────────┘

Obrigatórios no card:
👀 Views
📊 CTR
💰 ROAS
Impressões · Engagement · Spend · Thumbstop ratio
Score de impacto (pra sugestões)
Hook + produto + creator
Thumb/imagem
Badge de output mode (🖼️ Imagem / 🎥 Vídeo) — só em sugestões
Badge de referências externas usadas — só em sugestões que tiveram refs

10. Xadrez de replicação
Conceito
Matriz visual que mostra quais hits foram replicados para quais marcas e quais ainda não.
Layout
                   │ Apice │ Rituaria │ Gocase │
────────────────────┼───────┼──────────┼────────┤
Hit #1 (Apice)      │   —   │   ✅🎥   │  ⏳🖼️  │
Hit #2 (Apice)      │   —   │    ❌    │  ✅🎥  │
Hit #3 (Rituaria)   │  ⬜   │    —     │  ⏳🎥  │
Hit #4 (Rituaria)   │  ✅🖼️ │    —     │   ❌   │
Hit #5 (Gocase)     │  ⏳🖼️ │   ⬜     │   —    │

Legenda
Ícone
Status
Significado
—
—
Marca origem (não aplica)
⬜
null
Ainda não gerado
❌
not_replicable
IA avaliou como não replicável
⏳
draft
Gerado, aguardando aprovação
✅
approved / in_play / published
Aprovado ou publicado
🚫
rejected
Rejeitado manualmente
🖼️
—
Output mode = imagem
🎥
—
Output mode = vídeo

Comportamento
Cada célula é clicável → abre drawer lateral com:
Mini-preview da sugestão (card reusado)
Preview da mídia gerada (imagem OU player de vídeo)
Justificativa da IA (se not_replicable)
Referências externas que inspiraram
Ações: aprovar · rejeitar · ligar no play
Linhas filtráveis por marca origem, plataforma, score, output_mode
Célula da diagonal (origem = destino) sempre —
Query base
SELECT * FROM v_replication_matrix
ORDER BY origin_brand_slug, content_id, target_brand_slug;

Indicadores topo do xadrez
Total de hits monitorados: 30
Replicações possíveis: 60 (30 × 2)
Geradas: N (%)
Aprovadas: N (%)
Não replicáveis: N (%)
Pendentes: N (%)
% com referências externas (índice de frescor): X%

11. Ligar no Play
Modal copy-paste
━━━━━━━━━━━━━━━━━━━━━━━━━
🎬 PACOTE DE PRODUÇÃO — {suggestion.name}
━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 MARCA: {target.name}
📱 PLATAFORMA: {platform}
🏷️ PRODUTO: {suggestion.product}
🎨 OUTPUT: {output_mode = 'image' ? '🖼️ Imagem' : '🎥 Vídeo'}

🪝 HOOK (primeiros 3s):
{suggestion.hook}

🎨 CENÁRIO:
{suggestion.scenery}

📖 ROTEIRO:
{suggestion.content_description}

✍️ CAPTION:
{suggestion.description}

📋 BRIEFING COMPLETO:
{suggestion.briefing}

🎞️ MÍDIA PRONTA:
{output_mode = 'image'
  ? '🖼️ Imagem de referência: [link image_url]'
  : '🎥 Vídeo pronto (template + áudio): [link final_video_url]
     🎙️ Áudio isolado: [link audio_url]
     📼 Template usado: [nome do template]'}

🌐 REFERÊNCIAS EXTERNAS USADAS:
{lista de external_references_used → source_brand + hook curto}

📊 IMPACTO ESTIMADO:
   • Score: {score}/100
   • 👀 Views estimadas: {estimated_views}
   • CTR estimado: {estimated_ctr}%
   • ROAS estimado: {estimated_roas}x

🔗 HIT ORIGEM: {origin_url} ({origin_brand})
   Métricas reais origem: 👀 {views} · CTR {ctr}% · ROAS {roas}x
━━━━━━━━━━━━━━━━━━━━━━━━━

Ações do modal
Se output_mode = 'image':
📋 Copiar briefing completo
💾 Download imagem PNG
✅ Marcar como in_play
Se output_mode = 'video':
📋 Copiar briefing completo
💾 Download MP4 final (template + áudio)
🎙️ Download MP3 (áudio isolado)
✅ Marcar como in_play
Escolha do output no momento da aprovação
Antes da geração acontecer, PM pode escolher via UI:
⚙️ Config global por marca (brands.default_output_mode)
Ou override por sugestão no momento "Gerar réplica" (aba 2 / xadrez)

12. Alerta Hit + WhatsApp
Template copy-paste
🔥 ALERTA HIT — {brand_name}

📱 Plataforma: {platform}
🎬 Conteúdo: {content.name}
🎯 Produto: {content.product}
👤 Creator: {creator}

📊 Métricas:
   👀 Views: {views}
   📈 CTR: {ctr}%
   💰 ROAS: {roas}x
   💬 Engajamento: {engagement}%

💡 Este conteúdo virou referência para replicação cross-brand.
Backlog disponível em: gohit.gogroup.com/planejamento

🔗 {video_url}

Trigger
Botão "Copiar para WhatsApp" por alerta no feed (MVP)
Pós-hackathon: envio automático via Z-API / Evolution API

13. Riscos e fallbacks
Risco
Mitigação
brands.context genérico → IA gera ruim
Marketing preenche context detalhado (1 pág por marca) antes do kick-off
GPT-image-1 com rate limit / falha
Fallback automático para Flux Pro (FAL.ai)
ElevenLabs com falha ou voz inadequada
Fallback para OpenAI TTS (tts-1-hd) com voz PT-BR
FFmpeg falha no merge (template incompatível)
Log + retry com template genérico + avisar PM
Video template de baixa qualidade
Revisão manual dos templates antes de habilitar por marca
Claude retorna JSON inválido
JSON.parse em try/catch → retry 1x com prompt "responda SOMENTE JSON válido"
Planilha de referências com colunas inválidas
Validação com Zod + preview antes do insert, rejeita batch inteiro se crítico
Referências externas puxam a IA pra fora do tom da marca
Prompt explicita "inspiração, não cópia" + respeitar do/don't
Retroalimentação apesar das referências
Monitorar % de sugestões com external_references_used não-vazio (meta: >60%)
Custo escalando no batch
Replicability check rejeita ~30-40% antes de gerar mídia
Demo quebra na hora H
Pré-gerar todas as 60 sugestões antes da demo e salvar no DB
Xadrez lento com muitos registros
Index + paginação (MVP 30 × 3 = pouco, OK)
Mídia demora pra renderizar
Placeholder + lazy load + thumbs menores


🎯 Critério de sucesso do hackathon
[ ] 60 combinações processadas (30 hits × 2 marcas destino)
[ ] Replicability check funcionando (alguns resultam not_replicable)
[ ] Pelo menos 10 sugestões com imagem gerada (GPT-image-1)
[ ] Pelo menos 10 sugestões com vídeo gerado (template + ElevenLabs + FFmpeg)
[ ] Pelo menos 1 batch de referências externas importado via planilha
[ ] ≥60% das sugestões geradas usaram ao menos 1 referência externa
[ ] 5 abas navegáveis em produção (Vercel)
[ ] Xadrez visual com 60 células preenchidas (com ícones de output mode)
[ ] "Ligar no Play" copia pacote completo com mídia baixável
[ ] "Copiar WhatsApp" gera mensagem formatada
[ ] Demo de 2-3 min gravada

Vamos nessa! 🚀


