import { NextRequest, NextResponse } from 'next/server'

interface PipelineRunRequest {
  originContentId: string
  targetBrandId: string
  outputMode: 'image' | 'video'
}

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
  : 'http://localhost:3000'

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `API call to ${path} failed: ${res.status}`)
  }
  return res.json()
}

export async function POST(req: NextRequest) {
  const { originContentId, targetBrandId, outputMode }: PipelineRunRequest = await req.json()

  const origin = req.nextUrl.origin

  // Step 1: Evaluate replicability
  const evaluateResult = await apiPost.call({ origin }, '/api/evaluate', {
    contentId: originContentId,
    targetBrandId,
    outputMode,
  }).catch(async () => {
    // Use request origin for self-calls
    const res = await fetch(`${origin}/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId: originContentId, targetBrandId, outputMode }),
    })
    return res.json()
  })

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

  if (outputMode === 'image') {
    // Step 3a: Generate image (synchronous)
    const imageRes = await fetch(`${origin}/api/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId }),
    })
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
    }
    const imageData = await imageRes.json()
    return NextResponse.json({ status: 'done', suggestionId, image_url: imageData.image_url })
  }

  // Step 3b: Start video generation (async)
  await fetch(`${origin}/api/video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestionId }),
  })

  return NextResponse.json({ status: 'processing', suggestionId })
}
