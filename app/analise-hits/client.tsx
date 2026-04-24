'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ContentCard from '@/components/ContentCard'
import ImportCSVModal from '@/components/ImportCSVModal'
import HitInsightsCard, { type HitInsights } from '@/components/HitInsightsCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AnaliseHitsClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brands: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contents: any[]
  // contentId → { meta_status, meta_ad_id, suggestion_id }
  metaStatusMap?: Record<string, { meta_status: string | null; meta_ad_id: string | null; suggestion_id: string }>
}

const META_STATUS_LABEL: Record<string, string> = {
  in_test: '⏳ Em teste no Facebook',
  result_available: '✅ Resultado disponível',
}

export default function AnaliseHitsClient({ brands, contents, metaStatusMap = {} }: AnaliseHitsClientProps) {
  const router = useRouter()
  const [filterBrand, setFilterBrand] = useState<string>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [generateModal, setGenerateModal] = useState<{ contentId: string; contentName: string } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [insights, setInsights] = useState<Record<string, HitInsights>>({})
  const [metaInsights, setMetaInsights] = useState<Record<string, { ctr: number; impressions: number; spend: number }>>({})

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
            outputMode: 'image',
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

  async function runAnalysis() {
    const contentIds = filtered.map((c) => c.id)
    if (contentIds.length === 0) {
      toast.error('Nenhum hit para analisar')
      return
    }
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analysis/hits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentIds }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro na análise')
        return
      }
      const map: Record<string, HitInsights> = {}
      for (const ins of data.insights ?? []) {
        map[ins.content_id] = ins
      }
      setInsights(map)
      toast.success(`Análise concluída para ${data.insights?.length ?? 0} hits`)
    } catch {
      toast.error('Falha ao conectar com a análise')
    } finally {
      setAnalyzing(false)
    }
  }

  async function fetchMetaInsights(suggestionId: string, contentId: string) {
    try {
      const res = await fetch(`/api/meta/insights?suggestionId=${suggestionId}`)
      if (!res.ok) return
      const data = await res.json()
      setMetaInsights((prev) => ({ ...prev, [contentId]: data }))
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Análise de Hits</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} hits</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runAnalysis}
            disabled={analyzing}
            variant="outline"
            size="sm"
          >
            {analyzing ? '⏳ Analisando...' : '🔍 Analisar Hits'}
          </Button>
          <Button onClick={() => setImportModalOpen(true)} variant="outline" size="sm">
            📥 Importar CSV
          </Button>
        </div>
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
        {Object.keys(insights).length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setInsights({})}>
            ✕ Limpar análise
          </Button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((c) => {
          const metaInfo = metaStatusMap[c.id]
          const contentInsights = insights[c.id]
          const liveMetrics = metaInsights[c.id]
          return (
            <div key={c.id}>
              {c.brands && (
                <div className="mb-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{c.brands.name}</Badge>
                  {metaInfo?.meta_status && (
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => fetchMetaInsights(metaInfo.suggestion_id, c.id)}
                    >
                      {META_STATUS_LABEL[metaInfo.meta_status] ?? metaInfo.meta_status}
                    </button>
                  )}
                </div>
              )}
              <ContentCard
                content={c}
                showMetrics
                onGenerate={() => setGenerateModal({ contentId: c.id, contentName: c.name ?? c.hook ?? '' })}
              />
              {/* Live Meta Ads metrics */}
              {liveMetrics && (
                <div className="mt-1 rounded border bg-blue-50 p-2 text-xs text-blue-800 flex gap-3">
                  <span>CTR real: <strong>{(liveMetrics.ctr * 100).toFixed(2)}%</strong></span>
                  <span>Impressões: <strong>{liveMetrics.impressions.toLocaleString('pt-BR')}</strong></span>
                  <span>Spend: <strong>R${liveMetrics.spend.toFixed(2)}</strong></span>
                </div>
              )}
              {/* AI Insights */}
              {contentInsights && <HitInsightsCard insights={contentInsights} />}
            </div>
          )
        })}
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
              <p className="text-xs text-muted-foreground">Geração de imagem via GPT-image-1 para validação de CTR.</p>
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

      <ImportCSVModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
