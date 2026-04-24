import { createClient } from '@/lib/supabase/server'
import AnaliseHitsClient from './client'

export default async function AnaliseHitsPage() {
  const supabase = await createClient()

  const { data: brands } = await supabase.from('brands').select('*')
  const { data: contents } = await supabase
    .from('contents')
    .select('*, brands!brand_id(id, name, slug), content_metrics(*)')
    .eq('is_hit', true)
    .order('created_at', { ascending: false })

  return (
    <AnaliseHitsClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      brands={(brands ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contents={(contents ?? []) as any[]}
    />
  )
}
