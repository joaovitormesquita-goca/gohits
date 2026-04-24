// Desativado temporariamente — ADR-002 v2.0
// Geração de vídeo pausada enquanto pipeline foca em imagem para validação CTR Meta Ads.

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Geração de vídeo temporariamente desativada. Use output_mode=image.' },
    { status: 503 },
  )
}

/*
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { synthesize } from '@/lib/ai/elevenlabs'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

... (código original preservado — reativar junto com ElevenLabs)
*/
