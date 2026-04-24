import { createClient } from '@/lib/supabase/server'
import AlertasClient from './client'

export default async function AlertasPage() {
  const supabase = await createClient()

  const { data: alerts } = await supabase
    .from('alerts')
    .select('*, brands!brand_id(name, slug), contents!content_id(name, hook, platform)')
    .order('created_at', { ascending: false })

  return (
    <AlertasClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alerts={(alerts ?? []) as any[]}
    />
  )
}
