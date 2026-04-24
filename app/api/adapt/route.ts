import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { callClaudeJSON } from '@/lib/ai/claude'

interface AdaptRequest {
  suggestionId: string
}

interface AdaptResult {
  name: string
  product: string
  hook: string
  scenery: string
  description: string
  content_description: string
  briefing: string
  estimated_ctr: number
  estimated_roas: number
  estimated_views: number
  estimated_impact_score: number
  justificativa_adaptacao: string
}

const SYSTEM_PROMPT = `Você é criador de conteúdo especialista em adaptar hits virais entre marcas,
mantendo a estrutura que funcionou e ajustando produto, cenário, linguagem e persona.`

export async function POST(req: NextRequest) {
  const { suggestionId }: AdaptRequest = await req.json()

  const supabase = await createAdminClient()

  const { data: rawSuggestion } = await supabase
    .from('content_suggestions')
    .select('*, origin_content:contents!origin_content_id(*, brands!brand_id(*), content_metrics(*)), target_brand:brands!target_brand_id(*)')
    .eq('id', suggestionId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestion = rawSuggestion as any

  if (!suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
  }

  if (!suggestion.is_replicable) {
    return NextResponse.json({ error: 'Suggestion is not replicable' }, { status: 400 })
  }

  const content = suggestion.origin_content
  const originBrand = content?.brands
  const targetBrand = suggestion.target_brand
  const metrics = content?.content_metrics?.[0]

  const userPrompt = `<HIT_ORIGEM>
Marca: ${originBrand?.name}
Contexto: ${originBrand?.context}
Plataforma: ${content?.platform}
Hook: ${content?.hook}
Produto: ${content?.product}
Cenário: ${content?.scenery}
Descrição: ${content?.description}
Transcrição: ${content?.transcription}
Métricas: CTR ${((metrics?.ctr ?? 0) * 100).toFixed(1)}% · ROAS ${metrics?.roas ?? 0}x · Views ${metrics?.views ?? 0}
</HIT_ORIGEM>

<MARCA_DESTINO>
Nome: ${targetBrand?.name}
Contexto: ${targetBrand?.context}
Produtos: ${targetBrand?.products_context}
</MARCA_DESTINO>

Gere a ADAPTAÇÃO em JSON válido:
{
  "name": "título descritivo",
  "product": "produto da marca destino",
  "hook": "hook adaptado (PRESERVAR estrutura do original)",
  "scenery": "cenário adaptado",
  "description": "caption pronta",
  "content_description": "roteiro do vídeo em passos",
  "briefing": "briefing de 400-600 palavras para o criador",
  "estimated_ctr": número,
  "estimated_roas": número,
  "estimated_views": inteiro,
  "estimated_impact_score": 0-100,
  "justificativa_adaptacao": "racional curto"
}

REGRAS:
- Mantenha a ESTRUTURA do hook (o que viralizou)
- Adapte produto/cenário/linguagem para a marca destino
- Respeite do/don't da marca destino
- Não invente métricas — derive das fornecidas (60-100% dos valores origem)`

  const result = await callClaudeJSON<AdaptResult>(SYSTEM_PROMPT, userPrompt, {
    temperature: 0.7,
    maxTokens: 3000,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (supabase.from('content_suggestions') as any)
    .update({
      name: result.name,
      product: result.product,
      hook: result.hook,
      scenery: result.scenery,
      description: result.description,
      content_description: result.content_description,
      briefing: result.briefing,
      estimated_ctr: result.estimated_ctr,
      estimated_roas: result.estimated_roas,
      estimated_views: result.estimated_views,
      estimated_impact_score: result.estimated_impact_score,
    })
    .eq('id', suggestionId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ suggestion: updated })
}
