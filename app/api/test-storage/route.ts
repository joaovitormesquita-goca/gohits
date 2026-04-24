import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Minimal 1x1 red PNG (hardcoded bytes — no external request needed)
const DUMMY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e00000000c49444154789c6260f8cfc00000000200016a9e2a00000000049454e44ae426082',
  'hex',
)

export async function GET() {
  const supabase = await createAdminClient()
  const testPath = `test/storage-check-${Date.now()}.png`

  const { error: uploadError } = await supabase.storage
    .from('suggestions')
    .upload(testPath, DUMMY_PNG, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    return NextResponse.json({ ok: false, step: 'upload', error: uploadError }, { status: 500 })
  }

  const { data: publicData } = supabase.storage.from('suggestions').getPublicUrl(testPath)

  // Verify the public URL actually resolves
  const headResp = await fetch(publicData.publicUrl, { method: 'HEAD' })

  return NextResponse.json({
    ok: headResp.ok,
    publicUrl: publicData.publicUrl,
    httpStatus: headResp.status,
    uploadError: null,
  })
}
