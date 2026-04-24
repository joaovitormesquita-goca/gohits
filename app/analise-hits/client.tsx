'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import ContentCard from '@/components/ContentCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AnaliseHitsClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brands: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contents: any[]
}

export default function AnaliseHitsClient({ brands, contents }: AnaliseHitsClientProps) {
  const [filterBrand, setFilterBrand] = useState<string>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [generateModal, setGenerateModal] = useState<{ contentId: string; contentName: string } | null>(null)
  const [outputMode, setOutputMode] = useState<'image' | 'video'>('image')
  const [generating, setGenerating] = useState(false)

  const filtered = useMemo(() => {
    return contents.filter((c) => {
      if (filterBrand !== 'all' && c.brands?.slug !== filterBrand) return false
      if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false
      return true
    })
  }, [contents, filterBrand, filterPlatform])

  const top5 = useMemo(() => {
    return [...contents]
      .sort((a, b) => (b.content_metrics?.[0]?.views ?? 0) - (a.content_metrics?.[0]?.views ?? 0))
      .slice(0, 5)
  }, [contents])

  async function generateReplicas(contentId: string) {
    setGenerating(true)
    const otherBrands = brands.filter((b) => {
      const content = contents.find((c) => c.id === contentId)
      return b.slug !== content?.brands?.slug
    })

    let success = 0
    for (const brand of otherBrands) {
      try {
        await fetch('/api/pipeline/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originContentId: contentId,
            targetBrandId: brand.id,
            outputMode,
          }),
        })
        success++
      } catch {
        // continue
      }
    }

    setGenerating(false)
    setGenerateModal(null)
    toast.success(`${success} réplicas iniciadas!`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Análise de Hits</h1>
        <p className="text-muted-foreground text-sm">{filtered.length} hits</p>
      </div>

      {/* Top 5 */}
      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          🔥 Top 5 Hits
          <Badge variant="secondary">por views</Badge>
        </h2>
        <div className="flex flex-wrap gap-2">
          {top5.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 bg-muted rounded-full px-3 py-1 text-sm">
              <span className="font-bold text-muted-foreground">#{i + 1}</span>
              <span>{c.name ?? c.hook?.substring(0, 30)}</span>
              <Badge variant="outline" className="text-xs">{c.brands?.name}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterBrand} onValueChange={(v) => v && setFilterBrand(v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {brands.map((b) => <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={(v) => v && setFilterPlatform(v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="meta">Meta</SelectItem>
            <SelectItem value="archive">Archive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((c) => (
          <div key={c.id}>
            {c.brands && (
              <div className="mb-1">
                <Badge variant="outline" className="text-xs">{c.brands.name}</Badge>
              </div>
            )}
            <ContentCard
              content={c}
              showMetrics
              onGenerate={() => setGenerateModal({ contentId: c.id, contentName: c.name ?? c.hook ?? '' })}
            />
          </div>
        ))}
      </div>

      {/* Generate replicas modal */}
      {generateModal && (
        <Dialog open onOpenChange={() => setGenerateModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar réplicas para outras marcas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{generateModal.contentName}</p>
              <div>
                <label className="text-sm font-medium mb-2 block">Output mode</label>
                <Select value={outputMode} onValueChange={(v) => v && setOutputMode(v as 'image' | 'video')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">🖼️ Imagem</SelectItem>
                    <SelectItem value="video">🎥 Vídeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setGenerateModal(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={() => generateReplicas(generateModal.contentId)}
                  disabled={generating}
                  className="flex-1"
                >
                  {generating ? 'Gerando...' : 'Gerar réplicas'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
