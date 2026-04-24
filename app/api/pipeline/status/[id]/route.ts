import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data: rawSuggestion, error } = await supabase
    .from('content_suggestions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !rawSuggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestion = rawSuggestion as any

  return NextResponse.json({ status: suggestion.status, suggestion })
}
