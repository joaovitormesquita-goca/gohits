import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateImage } from '@/lib/ai/openai'

interface ImageRequest {
  suggestionId: string
}

export async function POST(req: NextRequest) {
  const { suggestionId }: ImageRequest = await req.json()

  const supabase = createServiceClient()

  const { data: rawSuggestion } = await supabase
    .from('content_suggestions')
    .select('*, target_brand:brands!target_brand_id(*)')
    .eq('id', suggestionId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestion = rawSuggestion as any

  if (!suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
  }

  const targetBrand = suggestion.target_brand
  const isVertical = suggestion.platform === 'tiktok'
  const size = isVertical ? '1024x1536' : '1024x1024'

  const prompt = `Imagem de referência para vídeo publicitário da marca ${targetBrand?.name}.
Produto: ${suggestion.product}
Cenário: ${suggestion.scenery}
Estilo visual: ${(targetBrand?.context ?? '').substring(0, 200)}
Hook: ${suggestion.hook}
Formato: ${isVertical ? '9:16 vertical (TikTok/Reels)' : '1:1 quadrado (feed)'}

Fotorrealista, alta qualidade, luz natural, foco no produto. Sem texto na imagem.`

  let imageBuffer: Buffer
  try {
    imageBuffer = await generateImage(prompt, size as '1024x1536' | '1024x1024')
  } catch (err) {
    console.error('GPT-image-1 failed:', err)
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
  }

  const storagePath = `${suggestionId}/image.png`
  const { error: uploadError } = await supabase.storage
    .from('suggestions')
    .upload(storagePath, imageBuffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    console.error('Supabase storage upload error:', uploadError)
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
  }

  const { data: publicData } = supabase.storage.from('suggestions').getPublicUrl(storagePath)
  const imageUrl = publicData.publicUrl

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('content_suggestions') as any)
    .update({ image_url: imageUrl, output_mode: 'image', status: 'draft' })
    .eq('id', suggestionId)

  return NextResponse.json({ image_url: imageUrl })
}
