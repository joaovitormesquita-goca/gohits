import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAdInsights } from '@/lib/meta/ads'

export async function GET(req: NextRequest) {
  const suggestionId = req.nextUrl.searchParams.get('suggestionId')
  if (!suggestionId) {
    return NextResponse.json({ error: 'suggestionId obrigatório' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data: rawSuggestion } = await supabase
    .from('content_suggestions')
    .select('meta_ad_id, meta_status')
    .eq('id', suggestionId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestion = rawSuggestion as any

  if (!suggestion?.meta_ad_id) {
    return NextResponse.json({ error: 'Ad não publicado ainda' }, { status: 404 })
  }

  const insights = await getAdInsights(suggestion.meta_ad_id)

  // Mark as result_available if there are impressions
  if (insights.impressions > 0 && suggestion.meta_status === 'in_test') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('content_suggestions') as any)
      .update({ meta_status: 'result_available' })
      .eq('id', suggestionId)
  }

  return NextResponse.json(insights)
}
