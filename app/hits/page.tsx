import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function HitsAdminPage() {
  const supabase = await createClient()

  const { data: rawContents } = await supabase
    .from('contents')
    .select('*, brands!brand_id(name, slug), content_metrics(*)')
    .eq('is_hit', true)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents = (rawContents ?? []) as unknown as any[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin — Hits</h1>
          <p className="text-muted-foreground text-sm">{contents.length} hits no banco de dados</p>
        </div>
      </div>

      <div className="space-y-2">
        {contents.map((c) => {
          const brand = c.brands
          const metrics = c.content_metrics?.[0]
          return (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline">{brand?.name}</Badge>
                  <Badge variant="secondary">{c.platform?.toUpperCase()}</Badge>
                  <span className="font-medium">{c.name ?? c.hook}</span>
                  {metrics && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      Views: {metrics.views?.toLocaleString('pt-BR')} · CTR: {(metrics.ctr * 100).toFixed(1)}% · ROAS: {metrics.roas?.toFixed(1)}x
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.hook}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
