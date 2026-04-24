'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ContentCard from '@/components/ContentCard'
import ImportCSVModal from '@/components/ImportCSVModal'
import HitInsightsCard, { type HitInsights } from '@/components/HitInsightsCard'
import { Button } from '@/components/ui/button'
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
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: '#7ba1d8' }}>
            Monitoramento de performance
          </p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#2659a5', letterSpacing: '-0.015em' }}>
            Análise de Hits
          </h1>
          <p className="text-sm mt-1.5" style={{ color: '#7ba1d8' }}>
            {filtered.length} hits · Avalie replicabilidade e gere variações cross-brand.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ padding: '10px 18px', borderRadius: 999, background: '#ffffff', color: '#2659a5', border: '1px solid rgba(38,89,165,0.28)' }}
          >
            {analyzing ? 'Analisando...' : 'Analisar Hits'}
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ padding: '10px 18px', borderRadius: 999, background: '#2659a5', color: '#ffffff' }}
          >
            Importar CSV
          </button>
        </div>
      </div>

      {/* Top 5 */}
      {top5.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#d7d900' }} />
            <span className="text-sm font-semibold" style={{ color: '#2659a5' }}>Top 5 Hits</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: '#eaf1fa', color: '#7ba1d8' }}>
              por views
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {top5.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-full text-sm"
                style={{ background: '#eaf1fa', padding: '6px 14px' }}
              >
                <span className="font-bold text-xs" style={{ color: '#7ba1d8' }}>#{i + 1}</span>
                <span className="font-medium" style={{ color: '#2659a5' }}>{c.name ?? c.hook?.substring(0, 30)}</span>
                {c.brands && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: '#2659a5', color: '#d7d900' }}
                  >
                    {c.brands.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Brand pills */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...brands.map((b) => b.slug)].map((slug) => {
            const isActive = filterBrand === slug
            return (
              <button
                key={slug}
                onClick={() => setFilterBrand(slug)}
                className="text-xs font-medium transition-all"
                style={{
                  padding: '6px 14px', borderRadius: 999,
                  background: isActive ? '#2659a5' : '#eaf1fa',
                  color: isActive ? '#ffffff' : '#7ba1d8',
                }}
              >
                {slug === 'all' ? 'Todas as marcas' : brands.find((b) => b.slug === slug)?.name}
              </button>
            )
          })}
        </div>

        {/* Platform pills */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'tiktok', 'meta', 'archive'].map((p) => {
            const isActive = filterPlatform === p
            return (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className="text-xs font-medium transition-all"
                style={{
                  padding: '6px 12px', borderRadius: 999,
                  background: isActive ? '#d7d900' : 'transparent',
                  color: isActive ? '#2659a5' : '#7ba1d8',
                  border: '1px solid rgba(38,89,165,0.14)',
                }}
              >
                {p === 'all' ? 'Todas' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            )
          })}
        </div>

        {Object.keys(insights).length > 0 && (
          <button
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: '#7ba1d8', padding: '6px 12px', borderRadius: 999 }}
            onClick={() => setInsights({})}
          >
            Limpar análise
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const metaInfo = metaStatusMap[c.id]
          const contentInsights = insights[c.id]
          const liveMetrics = metaInsights[c.id]
          return (
            <div key={c.id} className="space-y-2">
              {c.brands && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
                    style={{ background: '#2659a5', color: '#d7d900' }}
                  >
                    {c.brands.name}
                  </span>
                  {metaInfo?.meta_status && (
                    <button
                      className="text-xs font-medium underline underline-offset-2 hover:opacity-70"
                      style={{ color: '#7ba1d8' }}
                      onClick={() => fetchMetaInsights(metaInfo.suggestion_id, c.id)}
                    >
                      {META_STATUS_LABEL[metaInfo.meta_status] ?? metaInfo.meta_status}
                    </button>
                  )}
                </div>
              )}
              <ContentCard
                content={c}
                variant="hit"
                showMetrics
                onGenerate={() => setGenerateModal({ contentId: c.id, contentName: c.name ?? c.hook ?? '' })}
              />
              {liveMetrics && (
                <div
                  className="rounded-[14px] p-3 text-xs flex gap-4"
                  style={{ background: '#eaf1fa', color: '#2659a5' }}
                >
                  <span>CTR real: <strong>{(liveMetrics.ctr * 100).toFixed(2)}%</strong></span>
                  <span>Impressões: <strong>{liveMetrics.impressions.toLocaleString('pt-BR')}</strong></span>
                  <span>Spend: <strong>R${liveMetrics.spend.toFixed(2)}</strong></span>
                </div>
              )}
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
              <DialogTitle style={{ color: '#2659a5' }}>Gerar réplicas para outras marcas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm" style={{ color: '#7ba1d8' }}>{generateModal.contentName}</p>
              <p className="text-xs" style={{ color: '#7ba1d8' }}>Geração de imagem via GPT-image-1 para validação de CTR.</p>
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
