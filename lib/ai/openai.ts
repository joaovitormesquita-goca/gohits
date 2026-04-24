import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type ImageSize = '1024x1536' | '1024x1024'

export async function generateImage(
  prompt: string,
  size: ImageSize = '1024x1536',
): Promise<Buffer> {
  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    size,
    quality: 'high',
    n: 1,
  })

  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error('No image data returned from GPT-image-1')
  return Buffer.from(b64, 'base64')
}
