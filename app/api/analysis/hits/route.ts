import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { callClaudeJSON } from '@/lib/ai/claude'

interface HitInsights {
  content_id: string
  score: number
  bullets: {
    porque_funciona: string[]
    marca_destino: string[]
    alertas: string[]
  }
  is_emergente: boolean
  marca_destino_recomendada: 'apice' | 'rituaria' | 'gocase' | null
}

const SYSTEM_PROMPT = `Você é especialista em análise de performance de conteúdo para e-commerce.
Analise os hits fornecidos e gere insights EXTREMAMENTE curtos e acionáveis.
Cada bullet deve ter no máximo 10 palavras. Sem explicações longas.`

export async function POST(req: NextRequest) {
  const { contentIds } = await req.json() as { contentIds: string[] }

  if (!contentIds?.length) {
    return NextResponse.json({ error: 'contentIds obrigatório' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data: rawContents } = await supabase
    .from('contents')
    .select('*, brands!brand_id(name, slug), content_metrics(*)')
    .in('id', contentIds)
    .eq('is_hit', true)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents = (rawContents ?? []) as any[]

  if (contents.length === 0) {
    return NextResponse.json({ error: 'Nenhum hit encontrado' }, { status: 404 })
  }

  // Compute brand averages for emergente detection
  const brandMetrics: Record<string, { ctrs: number[]; roas: number[] }> = {}
  for (const c of contents) {
    const slug = c.brands?.slug ?? 'unknown'
    if (!brandMetrics[slug]) brandMetrics[slug] = { ctrs: [], roas: [] }
    const m = c.content_metrics?.[0]
    if (m?.ctr) brandMetrics[slug].ctrs.push(Number(m.ctr))
    if (m?.roas) brandMetrics[slug].roas.push(Number(m.roas))
  }

  const brandAvg: Record<string, { ctr: number; roas: number }> = {}
  for (const [slug, data] of Object.entries(brandMetrics)) {
    brandAvg[slug] = {
      ctr: data.ctrs.length ? data.ctrs.reduce((a, b) => a + b, 0) / data.ctrs.length : 0,
      roas: data.roas.length ? data.roas.reduce((a, b) => a + b, 0) / data.roas.length : 0,
    }
  }

  const hitsBlock = contents.map((c) => {
    const m = c.content_metrics?.[0]
    return {
      content_id: c.id,
      marca: c.brands?.slug,
      hook: c.hook?.substring(0, 100),
      produto: c.product,
      views: m?.views ?? 0,
      ctr: m?.ctr ? (Number(m.ctr) * 100).toFixed(2) + '%' : '0%',
      roas: m?.roas ? Number(m.roas).toFixed(2) + 'x' : '0x',
      engagement: m?.engagement_rate ? (Number(m.engagement_rate) * 100).toFixed(1) + '%' : '0%',
    }
  })

  const userPrompt = `Analise estes hits e retorne um JSON com insights por hit:

<HITS>
${JSON.stringify(hitsBlock, null, 2)}
</HITS>

<MEDIA_DA_MARCA>
${JSON.stringify(brandAvg, null, 2)}
</MEDIA_DA_MARCA>

Retorne JSON exatamente neste formato:
{
  "insights": [
    {
      "content_id": "uuid",
      "score": 0-100,
      "bullets": {
        "porque_funciona": ["bullet 1", "bullet 2"],
        "marca_destino": ["Replicar para X: motivo curto"],
        "alertas": ["CTR Nx acima da média — hit emergente!"]
      },
      "is_emergente": true,
      "marca_destino_recomendada": "gocase"
    }
  ]
}

REGRAS OBRIGATÓRIAS:
- Bullets EXTREMAMENTE curtos — máx 10 palavras cada
- porque_funciona: máx 3 bullets
- marca_destino: máx 2 bullets (ou [] se serve para todas as marcas)
- alertas: [] se não emergente; 1 bullet se emergente
- is_emergente = true se CTR > 150% da média da marca OU ROAS > 5x
- score = ponderação CTR 40% + ROAS 30% + views 20% + engagement 10% (escala 0-100)
- marca_destino_recomendada: null se hit serve para todas as marcas`

  const result = await callClaudeJSON<{ insights: HitInsights[] }>(SYSTEM_PROMPT, userPrompt, {
    temperature: 0.3,
    maxTokens: 4000,
  })

  return NextResponse.json({ insights: result.insights })
}
