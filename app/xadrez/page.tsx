import { createClient } from '@/lib/supabase/server'
import XadrezClient from './client'

export default async function XadrezPage() {
  const supabase = await createClient()

  const { data: brands } = await supabase.from('brands').select('id, slug, name')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: matrix } = await (supabase.from('v_replication_matrix') as any)
    .select('*')
    .order('origin_brand_slug')
    .order('content_name')

  return (
    <XadrezClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      brands={(brands ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matrix={(matrix ?? []) as any[]}
    />
  )
}
