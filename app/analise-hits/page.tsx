import { createClient } from '@/lib/supabase/server'
import AnaliseHitsClient from './client'

export default async function AnaliseHitsPage() {
  const supabase = await createClient()

  const [{ data: brands }, { data: contents }, { data: suggestions }] = await Promise.all([
    supabase.from('brands').select('*'),
    supabase
      .from('contents')
      .select('*, brands!brand_id(id, name, slug), content_metrics(*)')
      .eq('is_hit', true)
      .order('created_at', { ascending: false }),
    // Fetch suggestions that have been published to Meta Ads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('content_suggestions') as any)
      .select('id, origin_content_id, meta_ad_id, meta_status')
      .not('meta_status', 'is', null),
  ])

  // Build contentId → meta info map
   
  const metaStatusMap: Record<string, { meta_status: string | null; meta_ad_id: string | null; suggestion_id: string }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of (suggestions ?? []) as any[]) {
    if (s.origin_content_id) {
      metaStatusMap[s.origin_content_id] = {
        meta_status: s.meta_status,
        meta_ad_id: s.meta_ad_id,
        suggestion_id: s.id,
      }
    }
  }

  return (
    <AnaliseHitsClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      brands={(brands ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contents={(contents ?? []) as any[]}
      metaStatusMap={metaStatusMap}
    />
  )
}
