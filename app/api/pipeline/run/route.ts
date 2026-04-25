import { NextRequest, NextResponse } from 'next/server'

interface PipelineRunRequest {
  originContentId: string
  targetBrandId: string
  outputMode?: 'image' | 'video'
}

export async function POST(req: NextRequest) {
  const { originContentId, targetBrandId }: PipelineRunRequest = await req.json()
  // outputMode is always 'image' — video disabled per ADR-002 v3.0
  const origin = req.nextUrl.origin

  // Step 1: Evaluate replicability
  const evalRes = await fetch(`${origin}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentId: originContentId, targetBrandId, outputMode: 'image' }),
  })
  const evaluateResult = await evalRes.json()

  if (!evaluateResult.is_replicable) {
    return NextResponse.json({
      status: 'not_replicable',
      reason: evaluateResult.reason,
      suggestionId: evaluateResult.suggestionId,
    })
  }

  const { suggestionId } = evaluateResult

  // Step 2: Adapt
  const adaptRes = await fetch(`${origin}/api/adapt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestionId }),
  })
  if (!adaptRes.ok) {
    return NextResponse.json({ error: 'Adapt step failed' }, { status: 500 })
  }

  // Step 3 (image) is now on-demand via /api/image — see ADR-002 v3.0
  return NextResponse.json({ status: 'done', suggestionId })
}
