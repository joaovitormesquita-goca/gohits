import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { generateImageWithReferences, type ReferenceImage } from '@/lib/ai/openai'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_REFS = 3

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart/form-data' }, { status: 400 })
  }

  const suggestionId = formData.get('suggestionId')
  if (typeof suggestionId !== 'string' || !suggestionId) {
    return NextResponse.json({ error: 'Missing suggestionId' }, { status: 400 })
  }

  const refFiles = formData.getAll('references').filter((v): v is File => v instanceof File)
  if (refFiles.length === 0) {
    return NextResponse.json({ error: 'No references provided' }, { status: 400 })
  }
  if (refFiles.length > MAX_REFS) {
    return NextResponse.json({ error: 'Too many references (max 3)' }, { status: 400 })
  }
  for (const f of refFiles) {
    if (!ALLOWED_TYPES.has(f.type)) {
      return NextResponse.json({ error: `Invalid file type: ${f.type || 'unknown'}` }, { status: 400 })
    }
    if (f.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large: ${f.name} (max 10MB)` }, { status: 400 })
    }
  }

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
  if (suggestion.image_url) {
    return NextResponse.json(
      { error: 'Image already exists for this suggestion' },
      { status: 409 },
    )
  }

  const isVertical = suggestion.platform === 'tiktok'
  const size = isVertical ? '1024x1536' : '1024x1024'

  const refs: ReferenceImage[] = []
  for (const file of refFiles) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = EXT_BY_TYPE[file.type] ?? 'png'
    const refPath = `${suggestionId}/references/${randomUUID()}.${ext}`

    const { error: refUploadError } = await supabase.storage
      .from('suggestions')
      .upload(refPath, buffer, { contentType: file.type, upsert: false })

    if (refUploadError) {
      console.error('Reference upload error:', refUploadError)
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }

    refs.push({ buffer, filename: `ref-${refs.length + 1}.${ext}`, contentType: file.type })
  }

  const prompt = `Gere um anúncio usando o hook "${suggestion.hook}" como texto sobreposto na imagem, ao lado do(s) produto(s) anexado(s).`

  let imageBuffer: Buffer
  try {
    imageBuffer = await generateImageWithReferences(prompt, refs, size as '1024x1536' | '1024x1024')
  } catch (err) {
    console.error('Image generation failed:', err)
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
