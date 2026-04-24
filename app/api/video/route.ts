import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { synthesize } from '@/lib/ai/elevenlabs'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

interface VideoRequest {
  suggestionId: string
}

export async function POST(req: NextRequest) {
  const { suggestionId }: VideoRequest = await req.json()

  const supabase = await createAdminClient()

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

  const voiceId: string = suggestion.target_brand?.elevenlabs_voice_id ?? 'EXAVITQu4vr4xnSDe4oz'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('content_suggestions') as any)
    .update({ status: 'draft', output_mode: 'video' })
    .eq('id', suggestionId)

  const { data: rawTemplate } = await supabase
    .from('video_templates')
    .select('*')
    .eq('brand_id', suggestion.target_brand?.id ?? '')
    .eq('is_default', true)
    .eq('platform', suggestion.platform ?? 'tiktok')
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const template = rawTemplate as any

  generateVideoAsync({
    suggestionId,
    hook: suggestion.hook ?? '',
    voiceId,
    templateUrl: template?.video_file_url ?? null,
    platform: suggestion.platform ?? 'tiktok',
  }).catch(console.error)

  return NextResponse.json({ status: 'processing', suggestionId })
}

async function generateVideoAsync({
  suggestionId,
  hook,
  voiceId,
  templateUrl,
}: {
  suggestionId: string
  hook: string
  voiceId: string
  templateUrl: string | null
  platform: string
}) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  try {
    const audioBuffer = await synthesize(hook, voiceId)
    const audioPath = `${suggestionId}/audio.mp3`

    const { error: audioUploadError } = await supabase.storage
      .from('suggestions')
      .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

    if (audioUploadError) throw audioUploadError

    const { data: audioPublic } = supabase.storage.from('suggestions').getPublicUrl(audioPath)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('content_suggestions') as any)
      .update({ audio_url: audioPublic.publicUrl })
      .eq('id', suggestionId)

    if (templateUrl) {
      const { error: fnError } = await supabase.functions.invoke('video-merge', {
        body: { suggestionId, audioUrl: audioPublic.publicUrl, templateUrl },
      })
      if (fnError) console.error('video-merge error:', fnError)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('content_suggestions') as any)
      .update({ status: 'draft' })
      .eq('id', suggestionId)
  } catch (err) {
    console.error('Video generation failed:', err)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('content_suggestions') as any)
      .update({ status: 'draft' })
      .eq('id', suggestionId)
  }
}
