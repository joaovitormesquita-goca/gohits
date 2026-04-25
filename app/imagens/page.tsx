import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import ImagensClient from './client'

export default async function ImagensPage() {
  const supabase = await createClient()

  const { data: brands } = await supabase.from('brands').select('id, slug, name')

  // Fetch suggestions that have an image OR are approved drafts (no image yet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: suggestions } = await (supabase.from('content_suggestions') as any)
    .select('*, origin_content:contents!origin_content_id(id, name, hook, platform, brand_id), target_brand:brands!target_brand_id(id, name, slug)')
    .or('image_url.not.is.null,and(status.eq.approved,image_url.is.null)')
    .order('estimated_impact_score', { ascending: false })

  return (
    <Suspense>
      <ImagensClient
        brands={brands ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialSuggestions={(suggestions ?? []) as any[]}
      />
    </Suspense>
  )
}
