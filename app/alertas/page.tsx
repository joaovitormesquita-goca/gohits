import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AlertasClient from './client'

export default async function AlertasPage() {
  const supabase = await createClient()

  const [{ data: alerts }, { data: brands }] = await Promise.all([
    supabase
      .from('alerts')
      .select('*, brands!brand_id(name, slug), contents!content_id(name, hook, platform)')
      .order('created_at', { ascending: false }),
    supabase.from('brands').select('id, slug, name'),
  ])

  return (
    <Suspense>
      <AlertasClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alerts={(alerts ?? []) as any[]}
        brands={brands ?? []}
      />
    </Suspense>
  )
}
