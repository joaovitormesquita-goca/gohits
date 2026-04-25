import { createClient } from '@/lib/supabase/server'
import AnaliseHitsClient from './client'

export default async function AnaliseHitsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; period?: string }>
}) {
  const supabase = await createClient()
  const { brand, period } = await searchParams

  // Resolve brand slug → id
  let brandId: string | undefined
  if (brand && brand !== 'all') {
    const { data: brandRow } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', brand)
      .single()
    brandId = (brandRow as { id: string } | null)?.id ?? undefined
  }

  // Period cutoff
  const activePeriod = (period ?? 'all') as '7d' | '30d' | '90d' | 'all'
  const periodDays: Record<string, number | null> = { '7d': 7, '30d': 30, '90d': 90, 'all': null }
  const days = periodDays[activePeriod] ?? null
  // eslint-disable-next-line react-hooks/purity
  const cutoffDate = days ? new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10) : null

  let contentsQuery = supabase
    .from('contents')
    .select('*, brands!brand_id(id, name, slug), content_metrics(*)')
    .eq('is_hit', true)
    .order('created_at', { ascending: false })

  if (brandId) {
    contentsQuery = contentsQuery.eq('brand_id', brandId)
  }

  const [{ data: brands }, { data: rawContents }, { data: suggestions }] = await Promise.all([
    supabase.from('brands').select('*'),
    contentsQuery,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('content_suggestions') as any)
      .select('id, origin_content_id, meta_ad_id, meta_status')
      .not('meta_status', 'is', null),
  ])

  // Filter content_metrics by period on server
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents = (rawContents ?? []).map((c: any) => ({
    ...c,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content_metrics: (c.content_metrics ?? []).filter((m: any) =>
      !cutoffDate || m.date >= cutoffDate
    ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })).filter((c: any) => activePeriod === 'all' || c.content_metrics.length > 0)

  // Build meta status map
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
      contents={contents as any[]}
      metaStatusMap={metaStatusMap}
      period={activePeriod}
      brand={brand ?? 'all'}
    />
  )
}
