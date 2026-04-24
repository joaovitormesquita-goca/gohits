import { createClient } from '@/lib/supabase/server'
import PlanejamentoClient from './client'

export default async function PlanejamentoPage() {
  const supabase = await createClient()

  const { data: brands } = await supabase.from('brands').select('id, slug, name')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: suggestions } = await (supabase.from('content_suggestions') as any)
    .select('*, origin_content:contents!origin_content_id(id, name, hook, platform, brand_id, brands!brand_id(name, slug)), target_brand:brands!target_brand_id(id, name, slug)')
    .order('estimated_impact_score', { ascending: false })

  return (
    <PlanejamentoClient
      brands={brands ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialSuggestions={(suggestions ?? []) as any[]}
    />
  )
}
