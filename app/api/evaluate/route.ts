import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { callClaudeJSON } from '@/lib/ai/claude'

interface EvaluateRequest {
  contentId: string
  targetBrandId: string
  outputMode?: 'image' | 'video'
}

interface EvaluateResult {
  is_replicable: boolean
  reason: string
}

interface ContentRow {
  id: string; brand_id: string; platform: string | null
  hook: string | null; product: string | null; scenery: string | null
  description: string | null; transcription: string | null
  brands: { name: string; context: string | null; products_context: string | null } | null
  content_metrics: Array<{ ctr: number; roas: number; views: number }> | null
}

const SYSTEM_PROMPT = `Você é especialista em marketing de performance para e-commerce.
Sua tarefa é avaliar se um conteúdo HIT de uma marca pode ser replicado para outra marca do mesmo grupo.`

export async function POST(req: NextRequest) {
  const { contentId, targetBrandId, outputMode = 'image' }: EvaluateRequest = await req.json()

  const supabase = await createAdminClient()

  const { data: rawContent } = await supabase
    .from('contents')
    .select('*, brands!brand_id(*), content_metrics(*)')
    .eq('id', contentId)
    .single()

  const { data: rawTarget } = await supabase
    .from('brands')
    .select('*')
    .eq('id', targetBrandId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = rawContent as any as ContentRow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = rawTarget as any

  if (!content || !target) {
    return NextResponse.json({ error: 'Content or brand not found' }, { status: 404 })
  }

  const metrics = content.content_metrics?.[0]
  const originBrand = content.brands

  const userPrompt = `<HIT_ORIGEM>
Marca: ${originBrand?.name}
Contexto: ${originBrand?.context}
Plataforma: ${content.platform}
Hook: ${content.hook}
Produto: ${content.product}
Cenário: ${content.scenery}
Descrição: ${content.description}
Transcrição: ${content.transcription}
Métricas: CTR ${((metrics?.ctr ?? 0) * 100).toFixed(1)}% · ROAS ${metrics?.roas ?? 0}x · Views ${metrics?.views ?? 0}
</HIT_ORIGEM>

<MARCA_DESTINO>
Nome: ${target.name}
Contexto: ${target.context}
Produtos: ${target.products_context}
</MARCA_DESTINO>

AVALIE se é replicável.
Critérios de NÃO REPLICÁVEL:
- Produto origem não tem equivalente na marca destino
- Tom de voz incompatível com a persona destino
- Cenário/contexto específico demais da origem
- Público-alvo incompatível

Retorne SOMENTE JSON válido:
{ "is_replicable": true | false, "reason": "explicação curta (máx 300 chars)" }`

  const result = await callClaudeJSON<EvaluateResult>(SYSTEM_PROMPT, userPrompt, {
    temperature: 0.2,
    maxTokens: 500,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: suggestion, error } = await (supabase.from('content_suggestions') as any)
    .upsert(
      {
        origin_content_id: contentId,
        origin_brand_id: content.brand_id,
        target_brand_id: targetBrandId,
        platform: content.platform,
        output_mode: outputMode,
        is_replicable: result.is_replicable,
        replicability_reason: result.reason,
        status: result.is_replicable ? 'draft' : 'not_replicable',
        ai_model_version: 'claude-sonnet-4-6',
      },
      { onConflict: 'origin_content_id,target_brand_id,output_mode' },
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    is_replicable: result.is_replicable,
    reason: result.reason,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    suggestionId: (suggestion as any)?.id,
  })
}
