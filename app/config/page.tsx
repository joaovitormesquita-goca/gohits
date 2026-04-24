import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Brand } from '@/lib/supabase/types'

export default async function ConfigPage() {
  const supabase = await createClient()
  const { data: rawBrands } = await supabase.from('brands').select('*')
  const brands = (rawBrands ?? []) as unknown as Brand[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Config</h1>
        <p className="text-muted-foreground text-sm">Contexto de marcas e configurações do pipeline</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {brands.map((brand) => (
          <Card key={brand.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {brand.name}
                <Badge variant="outline">{brand.slug}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-muted-foreground text-xs mb-1">Contexto / Tom de voz</p>
                <p className="text-xs leading-relaxed">{brand.context ?? '—'}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground text-xs mb-1">Produtos</p>
                <p className="text-xs leading-relaxed line-clamp-4">{brand.products_context ?? '—'}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground text-xs mb-1">ElevenLabs Voice ID</p>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">{brand.elevenlabs_voice_id ?? '—'}</code>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline config</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex gap-4">
            <div>
              <span className="text-muted-foreground">Modelo Claude:</span>
              <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">claude-sonnet-4-6</code>
            </div>
            <div>
              <span className="text-muted-foreground">Modelo imagem:</span>
              <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">gpt-image-1</code>
            </div>
            <div>
              <span className="text-muted-foreground">Modelo áudio:</span>
              <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">eleven_multilingual_v2</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
