// Desativado temporariamente — ADR-002 v2.0
// Pipeline focado em imagem para validação de CTR via Meta Ads.
// Reativar quando fase de vídeo for retomada.

/*
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

export async function synthesize(text: string, voiceId: string): Promise<Buffer> {
  const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
      output_format: 'mp3_44100_128',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs error ${response.status}: ${error}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
*/

export {}
