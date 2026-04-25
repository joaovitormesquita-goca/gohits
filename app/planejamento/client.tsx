'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import ContentCard from '@/components/ContentCard'
import ContentPreviewModal from '@/components/ContentPreviewModal'
import BrandSelector from '@/components/BrandSelector'
import PautaDetailModal from '@/components/PautaDetailModal'
import GenerateImageModal from '@/components/GenerateImageModal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Brand { id: string; slug: string; name: string }

interface PlanejamentoClientProps {
  brands: Brand[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialSuggestions: any[]
}

const STATUS_OPTS = [
  { value: 'active', label: 'Replicáveis' },
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'in_play', label: 'In Play' },
  { value: 'not_replicable', label: 'Não replicável' },
]

export default function PlanejamentoClient({ brands, initialSuggestions }: PlanejamentoClientProps) {
  const searchParams = useSearchParams()
  const hitId = searchParams.get('hitId')

  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [filterMode, setFilterMode] = useState<string>('all')
  const [pautaModal, setPautaModal] = useState<typeof initialSuggestions[number] | null>(null)
  const [previewSuggestion, setPreviewSuggestion] = useState<typeof initialSuggestions[number] | null>(null)
  const [imageModal, setImageModal] = useState<typeof initialSuggestions[number] | null>(null)

  const stats = useMemo(() => {
    const total = suggestions.length
    const approved = suggestions.filter((s) => ['approved', 'in_play', 'published'].includes(s.status)).length
    const notReplicable = suggestions.filter((s) => s.status === 'not_replicable').length
    const pending = suggestions.filter((s) => s.status === 'draft').length
    return { total, approved, notReplicable, pending }
  }, [suggestions])

  const filtered = useMemo(() => {
    return suggestions.filter((s) => {
      if (hitId && s.origin_content?.id !== hitId) return false
      if (filterStatus === 'active' && s.status === 'not_replicable') return false
      if (filterStatus !== 'all' && filterStatus !== 'active' && s.status !== filterStatus) return false
      if (filterMode !== 'all' && s.output_mode !== filterMode) return false
      return true
    })
  }, [suggestions, hitId, filterStatus, filterMode])

  const hiddenCount = useMemo(() => {
    if (filterStatus !== 'active') return 0
    return suggestions.filter((s) => {
      const hitMatch = !hitId || s.origin_content?.id === hitId
      const modeMatch = filterMode === 'all' || s.output_mode === filterMode
      return s.status === 'not_replicable' && hitMatch && modeMatch
    }).length
  }, [suggestions, hitId, filterStatus, filterMode])

  async function updateStatus(id: string, status: string) {
    const res = await fetch('/api/suggestions/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) toast.success('Status atualizado')
    else toast.error('Falha ao atualizar')
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: '#7ba1d8' }}>
            Sugestões automáticas
          </p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#2659a5', letterSpacing: '-0.015em' }}>
            Planejamento
          </h1>
          <p className="text-sm mt-1.5" style={{ color: '#7ba1d8' }}>
            A IA cruza cada hit com todas as marcas e gera pautas adaptadas. Aprove ou reprove.
          </p>
          {hitId && (
            <p className="text-xs mt-1 font-medium" style={{ color: '#2659a5' }}>
              Filtrando por hit de origem
              <button
                className="ml-2 underline underline-offset-2 hover:opacity-70"
                onClick={() => window.history.replaceState(null, '', '/planejamento')}
                style={{ color: '#7ba1d8' }}
              >
                Limpar filtro
              </button>
            </p>
          )}
        </div>
        <button
          className="inline-flex items-center gap-2 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ padding: '10px 18px', borderRadius: 999, background: '#2659a5', color: '#ffffff', border: '1px solid #2659a5' }}
          onClick={() => toast.info('Batch geração em desenvolvimento')}
        >
          Gerar pendentes
        </button>
      </div>

      {/* Brand Selector */}
      <BrandSelector brands={brands} />

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: 'Pautas geradas', value: stats.total, sub: `${brands.length} marcas`, variant: 'default' },
          { label: 'Aprovadas', value: stats.approved, sub: stats.total ? `${Math.round(stats.approved / stats.total * 100)}% do total` : '—', variant: 'yellow' },
          { label: 'Não replicáveis', value: stats.notReplicable, sub: stats.total ? `IA rejeitou · ${Math.round(stats.notReplicable / stats.total * 100)}%` : '—', variant: 'muted' },
          { label: 'Pendentes', value: stats.pending, sub: 'Aguardando aprovação', variant: 'blue' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="relative p-5 overflow-hidden"
            style={{
              background: kpi.variant === 'yellow' ? '#d7d900'
                : kpi.variant === 'blue' ? '#2659a5'
                : '#ffffff',
              border: kpi.variant === 'yellow' || kpi.variant === 'blue' ? 'none' : '1px solid rgba(38,89,165,0.14)',
              borderRadius: 22,
            }}
          >
            <div
              className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full"
              style={{
                background: kpi.variant === 'yellow' ? '#2659a5'
                  : kpi.variant === 'blue' ? '#d7d900'
                  : '#d7d900',
              }}
            />
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2.5"
              style={{
                color: kpi.variant === 'yellow' ? '#2659a5'
                  : kpi.variant === 'blue' ? 'rgba(255,255,255,0.7)'
                  : '#7ba1d8',
              }}
            >
              {kpi.label}
            </p>
            <p
              className="text-4xl font-bold leading-none"
              style={{
                color: kpi.variant === 'yellow' ? '#2659a5'
                  : kpi.variant === 'blue' ? '#ffffff'
                  : '#2659a5',
                letterSpacing: '-0.02em',
              }}
            >
              {kpi.value}
            </p>
            <p
              className="text-[11px] mt-2 font-medium"
              style={{
                color: kpi.variant === 'yellow' ? '#2659a5'
                  : kpi.variant === 'blue' ? '#d7d900'
                  : '#7ba1d8',
              }}
            >
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Status pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold" style={{ color: '#7ba1d8' }}>Status:</span>
          {STATUS_OPTS.map((opt) => {
            const isActive = filterStatus === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-all"
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: isActive ? '#2659a5' : '#eaf1fa',
                  color: isActive ? '#ffffff' : '#7ba1d8',
                  border: 'none',
                }}
              >
                {opt.label}
                {opt.value === 'active' && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(38,89,165,0.12)',
                      color: isActive ? '#ffffff' : '#7ba1d8',
                    }}
                  >
                    padrão
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Mode select */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterMode} onValueChange={(v) => v && setFilterMode(v)}>
            <SelectTrigger className="w-full sm:w-40 text-xs">
              <SelectValue placeholder="Output" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os outputs</SelectItem>
              <SelectItem value="image">Imagem</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hidden count */}
        {hiddenCount > 0 && (
          <p className="text-xs flex items-center gap-2" style={{ color: '#7ba1d8' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#e5273c', opacity: 0.6 }} />
            {hiddenCount} {hiddenCount === 1 ? 'sugestão não replicável oculta' : 'sugestões não replicáveis ocultas'}
            <button
              className="underline underline-offset-2 hover:opacity-80"
              onClick={() => setFilterStatus('all')}
            >
              Exibir todas
            </button>
          </p>
        )}
      </div>

      {/* Section title */}
      <div className="flex items-center gap-2.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#d7d900' }} />
        <span className="text-sm font-semibold" style={{ color: '#2659a5' }}>
          Pautas — ordenadas por score de impacto
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ml-1"
          style={{ background: '#d7d900', color: '#2659a5' }}
        >
          {filtered.length}
        </span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#7ba1d8' }}>
          <p className="text-lg font-medium">Nenhuma pauta encontrada</p>
          {filterStatus === 'active' && stats.notReplicable > 0 ? (
            <p className="text-sm mt-1">
              {stats.notReplicable} não replicáveis ocultas.{' '}
              <button className="underline underline-offset-2" onClick={() => setFilterStatus('all')}>
                Exibir todas
              </button>
            </p>
          ) : (
            <p className="text-sm mt-1">Execute o pipeline em Análise de Hits para gerar pautas</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((s) => (
            <ContentCard
              key={s.id}
              suggestion={s}
              variant="plan"
              showMetrics
              showOutputMode
              onPreview={() => setPreviewSuggestion(s)}
              onOpenPauta={() => setPautaModal({ ...s, target_brand_name: s.target_brand?.name })}
              onApprove={() => updateStatus(s.id, 'approved')}
              onReject={() => updateStatus(s.id, 'rejected')}
              onGenerateImage={() => setImageModal(s)}
            />
          ))}
        </div>
      )}

      {pautaModal && (
        <PautaDetailModal
          suggestion={pautaModal}
          open={!!pautaModal}
          onClose={() => setPautaModal(null)}
          onApprove={() => updateStatus(pautaModal.id, 'approved')}
          onReject={() => updateStatus(pautaModal.id, 'rejected')}
        />
      )}

      {imageModal && (
        <GenerateImageModal
          suggestionId={imageModal.id}
          hook={imageModal.hook ?? ''}
          open={!!imageModal}
          onClose={() => setImageModal(null)}
          onSuccess={(url) => {
            setSuggestions((prev) =>
              prev.map((s) => (s.id === imageModal.id ? { ...s, image_url: url } : s)),
            )
          }}
        />
      )}

      {previewSuggestion && (
        <ContentPreviewModal
          suggestion={{ ...previewSuggestion, target_brand_name: previewSuggestion.target_brand?.name }}
          open={!!previewSuggestion}
          onClose={() => setPreviewSuggestion(null)}
          onOpenPauta={() => {
            const s = previewSuggestion
            setPreviewSuggestion(null)
            setPautaModal({ ...s, target_brand_name: s.target_brand?.name })
          }}
          onApprove={() => {
            updateStatus(previewSuggestion.id, 'approved')
            setPreviewSuggestion(null)
          }}
          onReject={() => {
            updateStatus(previewSuggestion.id, 'rejected')
            setPreviewSuggestion(null)
          }}
        />
      )}
    </div>
  )
}
