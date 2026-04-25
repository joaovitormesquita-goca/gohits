import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import PlanejamentoClient from './client'

export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; hitId?: string }>
}) {
  const supabase = await createClient()
  const { brand } = await searchParams

  // Resolve brand slug → id for server-side filtering
  let brandId: string | undefined
  if (brand && brand !== 'all') {
    const { data: brandRow } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', brand)
      .single()
    brandId = (brandRow as { id: string } | null)?.id ?? undefined
  }

  const { data: brands } = await supabase.from('brands').select('id, slug, name')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let suggestionsQuery = (supabase.from('content_suggestions') as any)
    .select('*, origin_content:contents!origin_content_id(id, name, hook, platform, brand_id, brands!brand_id(name, slug)), target_brand:brands!target_brand_id(id, name, slug)')
    .order('estimated_impact_score', { ascending: false })

  if (brandId) {
    suggestionsQuery = suggestionsQuery.eq('target_brand_id', brandId)
  }

  const { data: suggestions } = await suggestionsQuery

  return (
    <Suspense>
      <PlanejamentoClient
        brands={brands ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialSuggestions={(suggestions ?? []) as any[]}
      />
    </Suspense>
  )
}
