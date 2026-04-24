import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function TemplatesAdminPage() {
  const supabase = await createClient()

  const { data: rawTemplates } = await supabase
    .from('video_templates')
    .select('*, brands!brand_id(name, slug)')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templates = (rawTemplates ?? []) as unknown as any[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin — Video Templates</h1>
        <p className="text-muted-foreground text-sm">{templates.length} templates</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => {
          const brand = t.brands
          return (
            <Card key={t.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{brand?.name}</Badge>
                  <Badge variant="secondary">{t.platform?.toUpperCase()}</Badge>
                  {t.is_default && <Badge>Default</Badge>}
                </div>
                <p className="font-medium text-sm">{t.name}</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Aspect ratio: {t.aspect_ratio}</div>
                  <div>Duração: {t.duration_seconds}s</div>
                  <div>Áudio original: {t.has_original_audio ? 'Sim' : 'Não'}</div>
                </div>
                {t.video_file_url && (
                  <a
                    href={t.video_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline block truncate"
                  >
                    {t.video_file_url}
                  </a>
                )}
              </CardContent>
            </Card>
          )
        })}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>Nenhum template cadastrado.</p>
            <p className="text-sm mt-1">Faça upload dos MP4s no Supabase Storage e execute o seed SQL.</p>
          </div>
        )}
      </div>
    </div>
  )
}
