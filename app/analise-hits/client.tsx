'use client'

import { Suspense, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import ContentCard from '@/components/ContentCard'
import ContentPreviewModal from '@/components/ContentPreviewModal'
import BrandSelector from '@/components/BrandSelector'
import ImportCSVModal from '@/components/ImportCSVModal'
import HitInsightsCard, { type HitInsights } from '@/components/HitInsightsCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AnaliseHitsClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brands: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contents: any[]
  metaStatusMap?: Record<string, { meta_status: string | null; meta_ad_id: string | null; suggestion_id: string }>
  period: string
  brand: string
}

const META_STATUS_LABEL: Record<string, string> = {
  in_test: '⏳ Em teste no Facebook',
  result_available: '✅ Resultado disponível',
}

const PERIOD_OPTS = [
  { value: '7d', label: '7 dias', isDefault: false },
  { value: '30d', label: '30 dias', isDefault: false },
  { value: '90d', label: '90 dias', isDefault: false },
  { value: 'all', label: 'Tudo', isDefault: true },
]

function fmt(n: number | null | undefined) {
  if (n == null || n === 0) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return `${n}`
}

export default function AnaliseHitsClient({
  brands,
  contents,
  metaStatusMap = {},
  period,
  brand,
}: AnaliseHitsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [generateModal, setGenerateModal] = useState<{ contentId: string; contentName: string } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [insights, setInsights] = useState<Record<string, HitInsights>>({})
  const [metaInsights, setMetaInsights] = useState<Record<string, { ctr: number; impressions: number; spend: number }>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewContent, setPreviewContent] = useState<any | null>(null)

  const filtered = useMemo(() => {
    return contents.filter((c) => {
      if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false
      return true
    })
  }, [contents, filterPlatform])

  const ranking = useMemo(() => {
    return [...contents]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metrics: any[] = c.content_metrics ?? []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalViews = metrics.reduce((s: number, m: any) => s + (m.views ?? 0), 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalClicks = metrics.reduce((s: number, m: any) => s + (m.click_count ?? 0), 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalImpressions = metrics.reduce((s: number, m: any) => s + (m.impressions ?? 0), 0)
        // CTR = total clicks / total impressions (same formula the DB uses for the computed column)
        const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : null
        // ROAS pulled directly from DB field, averaged across metric rows
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const roasValues = metrics.map((m: any) => m.roas).filter((v: number | null) => v != null) as number[]
        const roas = roasValues.length > 0 ? roasValues.reduce((s, v) => s + v, 0) / roasValues.length : null
        return { ...c, _views: totalViews, _ctr: ctr, _roas: roas }
      })
      .sort((a, b) => b._views - a._views)
      .slice(0, 5)
  }, [contents])

  function selectPeriod(p: string) {
    const params = new URLSearchParams()
    if (brand && brand !== 'all') params.set('brand', brand)
    if (p !== 'all') params.set('period', p)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

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

  const periodLabel = PERIOD_OPTS.find((o) => o.value === period)?.label ?? '7 dias'

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

      {/* Brand Selector */}
      <Suspense fallback={null}>
        <BrandSelector brands={brands} />
      </Suspense>

      {/* Period filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold" style={{ color: '#7ba1d8' }}>Período:</span>
        {PERIOD_OPTS.map((opt) => {
          const isActive = period === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => selectPeriod(opt.value)}
              className="inline-flex items-center gap-1.5 text-xs transition-all"
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                background: isActive ? '#2659a5' : '#eaf1fa',
                color: isActive ? '#ffffff' : '#7ba1d8',
                fontWeight: isActive ? 600 : 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {opt.label}
              {opt.isDefault && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(38,89,165,0.12)',
                    color: isActive ? '#ffffff' : '#7ba1d8',
                    fontWeight: 700,
                  }}
                >
                  padrão
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Ranking table */}
      {ranking.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#d7d900' }} />
            <span className="text-sm font-semibold" style={{ color: '#2659a5' }}>Top 5 Hits</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: '#eaf1fa', color: '#7ba1d8' }}>
              {periodLabel}
            </span>
          </div>
          <div className="overflow-x-auto" style={{ border: '1px solid rgba(38,89,165,0.14)', borderRadius: 22 }}>
            <table className="w-full border-collapse" style={{ minWidth: 540 }}>
              <thead>
                <tr style={{ background: '#2659a5', color: '#ffffff' }}>
                  {['#', 'Hit', 'Marca', 'CTR', 'ROAS', 'Views'].map((h, i) => (
                    <th
                      key={h}
                      className="py-3 text-[10px] font-semibold uppercase tracking-[0.1em]"
                      style={{
                        padding: '12px 16px',
                        textAlign: i === 0 ? 'center' : i <= 2 ? 'left' : 'right',
                        borderRight: i < 5 ? '1px solid rgba(255,255,255,0.12)' : 'none',
                        minWidth: i === 1 ? 200 : undefined,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranking.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: i < ranking.length - 1 ? '1px solid rgba(38,89,165,0.08)' : 'none' }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLTableRowElement).style.background = '#eaf1fa'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                  >
                    <td className="text-center text-xs font-bold" style={{ padding: '10px 16px', color: '#7ba1d8', borderRight: '1px solid rgba(38,89,165,0.08)' }}>
                      {i + 1}
                    </td>
                    <td className="text-sm font-medium" style={{ padding: '10px 16px', color: '#2659a5', borderRight: '1px solid rgba(38,89,165,0.08)', maxWidth: 240 }}>
                      <span className="line-clamp-1">{c.name ?? c.hook?.substring(0, 50) ?? '—'}</span>
                    </td>
                    <td className="text-xs" style={{ padding: '10px 16px', color: '#7ba1d8', borderRight: '1px solid rgba(38,89,165,0.08)' }}>
                      {c.brands?.name ?? '—'}
                    </td>
                    <td className="text-xs text-right font-medium" style={{ padding: '10px 16px', color: '#2659a5', borderRight: '1px solid rgba(38,89,165,0.08)' }}>
                      {c._ctr != null ? `${(c._ctr * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="text-xs text-right font-medium" style={{ padding: '10px 16px', color: '#2659a5', borderRight: '1px solid rgba(38,89,165,0.08)' }}>
                      {c._roas != null ? `${c._roas.toFixed(1)}x` : '—'}
                    </td>
                    <td className="text-xs text-right font-semibold" style={{ padding: '10px 16px', color: '#2659a5' }}>
                      {fmt(c._views)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Platform filter */}
      <div className="flex flex-wrap gap-3 items-center">
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
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#7ba1d8' }}>
          <p className="text-lg font-medium">Nenhum hit com métricas nos últimos {periodLabel.toLowerCase()}</p>
          {period !== 'all' && (
            <p className="text-sm mt-1">
              <button
                className="underline underline-offset-2 hover:opacity-80"
                onClick={() => selectPeriod('all')}
              >
                Tente &quot;Tudo&quot;
              </button>
              {' '}para ver todos os hits
            </p>
          )}
        </div>
      ) : (
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
                  onPreview={() => setPreviewContent(c)}
                  onGenerate={() => setGenerateModal({ contentId: c.id, contentName: c.name ?? c.hook ?? '' })}
                  onNavigatePautas={() => router.push(`/planejamento?hitId=${encodeURIComponent(c.id)}`)}
                  onNavigateImagens={() => router.push(`/imagens?hitId=${encodeURIComponent(c.id)}`)}
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
      )}

      {/* Generate replicas modal */}
      {generateModal && (
        <Dialog open onOpenChange={() => setGenerateModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: '#2659a5' }}>Gerar pautas para outras marcas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm" style={{ color: '#7ba1d8' }}>{generateModal.contentName}</p>
              <p className="text-xs" style={{ color: '#7ba1d8' }}>Gera pautas adaptadas (hook, cenário, roteiro) para cada marca. Imagens são geradas depois na aba Imagens.</p>
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

      {previewContent && (
        <ContentPreviewModal
          content={previewContent}
          open={!!previewContent}
          onClose={() => setPreviewContent(null)}
          onGenerate={() => {
            setPreviewContent(null)
            setGenerateModal({ contentId: previewContent.id, contentName: previewContent.name ?? previewContent.hook ?? '' })
          }}
          onNavigatePautas={() => {
            setPreviewContent(null)
            router.push(`/planejamento?hitId=${encodeURIComponent(previewContent.id)}`)
          }}
          onNavigateImagens={() => {
            setPreviewContent(null)
            router.push(`/imagens?hitId=${encodeURIComponent(previewContent.id)}`)
          }}
        />
      )}
    </div>
  )
}
