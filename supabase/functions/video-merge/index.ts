import { createClient } from 'jsr:@supabase/supabase-js@2'

interface VideoMergeRequest {
  suggestionId: string
  audioUrl: string
  templateUrl: string
  platform: string
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const body: VideoMergeRequest = await req.json()
  const { suggestionId, audioUrl, templateUrl } = body

  try {
    // Download template and audio
    const [templateResp, audioResp] = await Promise.all([
      fetch(templateUrl),
      fetch(audioUrl),
    ])

    if (!templateResp.ok) throw new Error(`Failed to fetch template: ${templateResp.status}`)
    if (!audioResp.ok) throw new Error(`Failed to fetch audio: ${audioResp.status}`)

    const templateBuffer = await templateResp.arrayBuffer()
    const audioBuffer = await audioResp.arrayBuffer()

    // Write temp files to Deno tmp
    const tmpDir = await Deno.makeTempDir()
    const templatePath = `${tmpDir}/template.mp4`
    const audioPath = `${tmpDir}/audio.mp3`
    const outputPath = `${tmpDir}/output.mp4`

    await Deno.writeFile(templatePath, new Uint8Array(templateBuffer))
    await Deno.writeFile(audioPath, new Uint8Array(audioBuffer))

    // Run FFmpeg merge
    const ffmpegCmd = new Deno.Command('ffmpeg', {
      args: [
        '-i', templatePath,
        '-i', audioPath,
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        '-y',
        outputPath,
      ],
      stdout: 'piped',
      stderr: 'piped',
    })

    const { code } = await ffmpegCmd.output()

    if (code !== 0) {
      throw new Error(`FFmpeg exited with code ${code}`)
    }

    const outputData = await Deno.readFile(outputPath)
    const storagePath = `${suggestionId}/final.mp4`

    const { error: uploadError } = await supabase.storage
      .from('suggestions')
      .upload(storagePath, outputData, { contentType: 'video/mp4', upsert: true })

    if (uploadError) throw uploadError

    const { data: publicData } = supabase.storage.from('suggestions').getPublicUrl(storagePath)

    await supabase
      .from('content_suggestions')
      .update({ final_video_url: publicData.publicUrl, status: 'draft' })
      .eq('id', suggestionId)

    // Cleanup
    await Deno.remove(tmpDir, { recursive: true }).catch(() => {})

    return new Response(JSON.stringify({ final_video_url: publicData.publicUrl }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('video-merge error:', err)

    await supabase
      .from('content_suggestions')
      .update({ status: 'draft' })
      .eq('id', suggestionId)

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
