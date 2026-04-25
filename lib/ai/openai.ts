import OpenAI, { toFile } from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type ImageSize = '1024x1536' | '1024x1024'

// Modelo decidido em 2026-04-25 (PRP image-generation-pauta-references):
// gpt-image-1.5 é o mais recente da família suportado pelo SDK openai@^6.34.
// gpt-image-2 não existe publicamente.
const IMAGE_MODEL = 'gpt-image-1.5'

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

export interface ReferenceImage {
  buffer: Buffer
  filename: string
  contentType: string
}

export async function generateImageWithReferences(
  prompt: string,
  references: ReferenceImage[],
  size: ImageSize = '1024x1536',
): Promise<Buffer> {
  if (references.length === 0) {
    throw new Error('At least one reference image is required')
  }
  if (references.length > 3) {
    throw new Error('Maximum of 3 reference images allowed')
  }

  const uploadables = await Promise.all(
    references.map((ref) => toFile(ref.buffer, ref.filename, { type: ref.contentType })),
  )

  const response = await client.images.edit({
    model: IMAGE_MODEL,
    image: uploadables,
    prompt,
    size,
    quality: 'high',
    n: 1,
  })

  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error(`No image data returned from ${IMAGE_MODEL}`)
  return Buffer.from(b64, 'base64')
}
