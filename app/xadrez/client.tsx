'use client'

import { Suspense, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import LigarNoPlayModal from '@/components/LigarNoPlayModal'
import ContentCard from '@/components/ContentCard'
import BrandSelector from '@/components/BrandSelector'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface XadrezClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brands: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matrix: any[]
}

type CellStatus = 'auto' | 'manual' | 'pending' | 'not_replicable' | 'rejected' | 'na' | 'empty'

function getCellStatus(row: {
  status: string | null
  is_replicable: boolean | null
  suggestion_id: string | null
  output_mode: string | null
}): CellStatus {
  if (!row.suggestion_id) return 'empty'
  if (row.status === 'not_replicable' || row.is_replicable === false) return 'not_replicable'
  if (row.status === 'rejected') return 'rejected'
  if (row.status === 'draft') return 'pending'
  if (['approved', 'in_play', 'published'].includes(row.status ?? '')) {
    return row.output_mode ? 'auto' : 'manual'
  }
  return 'pending'
}

function XCell({ status, label, onClick }: { status: CellStatus; label?: string; onClick?: () => void }) {
  const dotStyles: Record<CellStatus, React.CSSProperties> = {
    auto: { background: '#2659a5', color: '#d7d900', border: 'none' },
    manual: { background: '#d7d900', color: '#2659a5', border: 'none' },
    pending: { background: 'transparent', color: '#7ba1d8', border: '1.5px dashed rgba(38,89,165,0.28)' },
    not_replicable: { background: 'rgba(229,39,60,0.1)', color: '#e5273c', border: '1px solid rgba(229,39,60,0.2)' },
    rejected: { background: 'rgba(38,89,165,0.06)', color: '#7ba1d8', border: 'none' },
    empty: { background: 'transparent', color: 'rgba(38,89,165,0.2)', border: '1px dashed rgba(38,89,165,0.14)' },
    na: { background: 'transparent', color: 'rgba(38,89,165,0.2)', border: 'none' },
  }
  const dotLabels: Record<CellStatus, string> = {
    auto: '✓',
    manual: '✓',
    pending: '–',
    not_replicable: '✕',
    rejected: '✕',
    empty: '',
    na: '—',
  }
  const subLabels: Record<CellStatus, string> = {
    auto: label ?? 'Auto',
    manual: 'Manual',
    pending: 'Pendente',
    not_replicable: 'Inválido',
    rejected: 'Rejeitado',
    empty: 'Vazio',
    na: '',
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1.5 py-3 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm"
        style={dotStyles[status]}
      >
        {dotLabels[status]}
      </div>
      {status !== 'na' && status !== 'empty' && (
        <span className="text-[9px] font-medium text-center leading-tight" style={{ color: '#7ba1d8' }}>
          {subLabels[status]}
        </span>
      )}
    </div>
  )
}

export default function XadrezClient({ brands, matrix }: XadrezClientProps) {
  const searchParams = useSearchParams()
  const filterOriginBrand = searchParams.get('brand') ?? 'all'
  const [selectedCell, setSelectedCell] = useState<typeof matrix[number] | null>(null)
  const [ligarModal, setLigarModal] = useState<typeof matrix[number] | null>(null)
  const [hideNotReplicable, setHideNotReplicable] = useState<boolean>(true)

  const contents = useMemo(() => {
    const seen = new Set<string>()
    const unique = matrix.filter((row) => {
      if (seen.has(row.content_id)) return false
      seen.add(row.content_id)
      return true
    })

    return unique.filter((row) => {
      if (filterOriginBrand !== 'all' && row.origin_brand_slug !== filterOriginBrand) return false
      if (hideNotReplicable) {
        const nonOriginCells = matrix.filter(
          (r) => r.content_id === row.content_id && r.target_brand_id !== row.origin_brand_id
        )
        const allNotReplicable =
          nonOriginCells.length > 0 &&
          nonOriginCells.every((r) => r.status === 'not_replicable' || r.is_replicable === false)
        if (allNotReplicable) return false
      }
      return true
    })
  }, [matrix, filterOriginBrand, hideNotReplicable])

  const stats = useMemo(() => {
    const totalCells = matrix.length
    const generated = matrix.filter((r) => r.suggestion_id).length
    const approved = matrix.filter((r) => ['approved', 'in_play', 'published'].includes(r.status ?? '')).length
    const notReplicable = matrix.filter((r) => r.status === 'not_replicable' || r.is_replicable === false).length
    const pending = matrix.filter((r) => !r.suggestion_id).length
    return { totalCells, generated, approved, notReplicable, pending }
  }, [matrix])

  function getCell(contentId: string, targetBrandId: string) {
    return matrix.find((r) => r.content_id === contentId && r.target_brand_id === targetBrandId)
  }

  async function updateStatus(suggestionId: string, status: string) {
    await fetch('/api/suggestions/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: suggestionId, status }),
    })
    toast.success('Status atualizado — recarregue para ver')
    setSelectedCell(null)
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: '#7ba1d8' }}>
          Execução cross-brand · Abril 2026
        </p>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#2659a5', letterSpacing: '-0.015em' }}>
          Xadrez
        </h1>
        <p className="text-sm mt-1.5" style={{ color: '#7ba1d8' }}>
          Cada hit × cada marca, com o checklist completo de replicação.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: 'Total combinações', value: stats.totalCells, sub: `${contents.length} hits visíveis`, variant: 'default' },
          { label: 'Geradas', value: stats.generated, sub: stats.totalCells ? `${Math.round(stats.generated / stats.totalCells * 100)}% do total` : '—', variant: 'blue' },
          { label: 'Aprovadas', value: stats.approved, sub: stats.totalCells ? `${Math.round(stats.approved / stats.totalCells * 100)}% do total` : '—', variant: 'yellow' },
          { label: 'Não replicáveis', value: stats.notReplicable, sub: 'IA rejeitou', variant: 'default' },
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
              style={{ background: kpi.variant === 'yellow' ? '#2659a5' : kpi.variant === 'blue' ? '#d7d900' : '#d7d900' }}
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2.5"
              style={{ color: kpi.variant === 'yellow' ? '#2659a5' : kpi.variant === 'blue' ? 'rgba(255,255,255,0.7)' : '#7ba1d8' }}>
              {kpi.label}
            </p>
            <p className="text-4xl font-bold leading-none"
              style={{
                color: kpi.variant === 'yellow' ? '#2659a5' : kpi.variant === 'blue' ? '#ffffff' : '#2659a5',
                letterSpacing: '-0.02em',
              }}>
              {kpi.value}
            </p>
            <p className="text-[11px] mt-2 font-medium"
              style={{ color: kpi.variant === 'yellow' ? '#2659a5' : kpi.variant === 'blue' ? '#d7d900' : '#7ba1d8' }}>
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Filters + Legend */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Origin brand selector */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs font-medium" style={{ color: '#7ba1d8' }}>Marca origem:</span>
            <Suspense fallback={null}>
              <BrandSelector brands={brands} />
            </Suspense>
          </div>

          {/* Not-replicable toggle */}
          <button
            onClick={() => setHideNotReplicable((v) => !v)}
            className="inline-flex items-center gap-2 text-xs font-medium transition-all"
            style={{
              padding: '6px 14px', borderRadius: 999,
              background: hideNotReplicable ? 'rgba(229,39,60,0.08)' : '#eaf1fa',
              color: hideNotReplicable ? '#e5273c' : '#7ba1d8',
              border: hideNotReplicable ? '1px solid rgba(229,39,60,0.2)' : '1px solid transparent',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: hideNotReplicable ? '#e5273c' : '#7ba1d8' }} />
            {hideNotReplicable ? 'Não replicáveis ocultos' : 'Mostrar não replicáveis'}
            {hideNotReplicable && <span style={{ opacity: 0.6, fontSize: 10 }}>(padrão)</span>}
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap items-center text-xs" style={{ color: '#7ba1d8' }}>
          {[
            { dot: { background: '#2659a5', border: 'none' }, label: 'Auto' },
            { dot: { background: '#d7d900', border: 'none' }, label: 'Manual' },
            { dot: { background: 'transparent', border: '1.5px dashed rgba(38,89,165,0.28)' }, label: 'Pendente' },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={l.dot} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Matrix table */}
      <div
        className="overflow-x-auto"
        style={{ border: '1px solid rgba(38,89,165,0.14)', borderRadius: 22, background: '#ffffff' }}
      >
        <table className="w-full border-collapse" style={{ minWidth: 700 }}>
          <thead>
            <tr style={{ background: '#2659a5', color: '#ffffff' }}>
              <th className="text-left px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ minWidth: 220, borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                Hit / Marca
              </th>
              <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-center"
                style={{ minWidth: 80, borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                Origem
              </th>
              {brands.map((b, i) => (
                <th key={b.id}
                  className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-center"
                  style={{ minWidth: 100, borderRight: i < brands.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                  {b.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contents.map((row, rowIdx) => (
              <tr
                key={row.content_id}
                className="group transition-colors"
                style={{ borderBottom: rowIdx < contents.length - 1 ? '1px solid rgba(38,89,165,0.08)' : 'none' }}
                onMouseEnter={(e) => (e.currentTarget as HTMLTableRowElement).style.background = '#eaf1fa'}
                onMouseLeave={(e) => (e.currentTarget as HTMLTableRowElement).style.background = ''}
              >
                {/* Hit name */}
                <td className="px-4 py-3" style={{ borderRight: '1px solid rgba(38,89,165,0.08)' }}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold leading-snug line-clamp-1" style={{ color: '#2659a5' }}>
                      {row.content_name ?? '—'}
                    </span>
                    {row.hook && (
                      <span className="text-xs line-clamp-1" style={{ color: '#7ba1d8' }}>{row.hook}</span>
                    )}
                  </div>
                </td>

                {/* Origin badge */}
                <td className="px-3 py-3 text-center" style={{ borderRight: '1px solid rgba(38,89,165,0.08)' }}>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: '#eaf1fa', color: '#2659a5' }}
                  >
                    {row.origin_brand_slug}
                  </span>
                </td>

                {/* Brand cells */}
                {brands.map((brand, bIdx) => {
                  const isOrigin = brand.id === row.origin_brand_id
                  if (isOrigin) {
                    return (
                      <td key={brand.id}
                        className="px-3 py-3 text-center text-sm font-light"
                        style={{
                          color: 'rgba(38,89,165,0.2)',
                          borderRight: bIdx < brands.length - 1 ? '1px solid rgba(38,89,165,0.08)' : 'none',
                        }}>
                        —
                      </td>
                    )
                  }
                  const cell = getCell(row.content_id, brand.id)
                  const status = cell ? getCellStatus(cell) : 'empty'
                  return (
                    <td
                      key={brand.id}
                      className="px-3 text-center"
                      style={{
                        borderRight: bIdx < brands.length - 1 ? '1px solid rgba(38,89,165,0.08)' : 'none',
                        cursor: cell ? 'pointer' : 'default',
                      }}
                      onClick={() => cell && setSelectedCell(cell)}
                      title={cell?.status ?? 'Não gerado'}
                    >
                      <XCell status={status} label={cell?.output_mode ?? undefined} />
                    </td>
                  )
                })}
              </tr>
            ))}

            {contents.length === 0 && (
              <tr>
                <td colSpan={brands.length + 2} className="py-12 text-center text-sm" style={{ color: '#7ba1d8' }}>
                  Nenhum hit encontrado. Ajuste os filtros ou adicione seeds.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs" style={{ color: '#7ba1d8' }}>
        Role lateralmente para ver todas as colunas. Clique em uma célula para ver detalhes e ações.
      </p>

      {/* Detail drawer */}
      <Sheet open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle style={{ color: '#2659a5' }}>Detalhes da Replicação</SheetTitle>
          </SheetHeader>
          {selectedCell && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: '#eaf1fa', color: '#2659a5' }}
                >
                  {selectedCell.origin_brand_name}
                </span>
                <span style={{ color: '#7ba1d8' }}>→</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: '#2659a5', color: '#ffffff' }}
                >
                  {selectedCell.target_brand_name}
                </span>
                <span className="ml-auto">
                  <XCell status={getCellStatus(selectedCell)} />
                </span>
              </div>

              {selectedCell.suggestion_id && (
                <ContentCard
                  suggestion={{
                    id: selectedCell.suggestion_id,
                    status: selectedCell.status,
                    is_replicable: selectedCell.is_replicable,
                    output_mode: selectedCell.output_mode,
                    estimated_impact_score: selectedCell.estimated_impact_score,
                    hook: selectedCell.hook,
                  } as Parameters<typeof ContentCard>[0]['suggestion']}
                  variant="plan"
                  showMetrics
                  showOutputMode
                />
              )}

              {!selectedCell.suggestion_id && (
                <div className="py-8 text-center" style={{ color: '#7ba1d8' }}>
                  <p className="text-sm font-medium">Réplica ainda não gerada</p>
                  <button
                    className="mt-4 text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ padding: '10px 20px', borderRadius: 999, background: '#2659a5', color: '#ffffff' }}
                    onClick={async () => {
                      toast.loading('Iniciando pipeline...')
                      await fetch('/api/pipeline/run', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          originContentId: selectedCell.content_id,
                          targetBrandId: selectedCell.target_brand_id,
                          outputMode: 'image',
                        }),
                      })
                      toast.success('Pipeline iniciado! Recarregue em alguns instantes.')
                    }}
                  >
                    Gerar agora
                  </button>
                </div>
              )}

              {selectedCell.suggestion_id && !['not_replicable', 'rejected'].includes(selectedCell.status ?? '') && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ padding: '8px 16px', borderRadius: 999, background: '#2659a5', color: '#ffffff' }}
                    onClick={() => updateStatus(selectedCell.suggestion_id, 'approved')}
                  >
                    Aprovar
                  </button>
                  <button
                    className="text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ padding: '8px 16px', borderRadius: 999, background: '#ffffff', color: '#2659a5', border: '1px solid rgba(38,89,165,0.28)' }}
                    onClick={() => updateStatus(selectedCell.suggestion_id, 'rejected')}
                  >
                    Rejeitar
                  </button>
                  <button
                    className="text-xs font-semibold transition-opacity hover:opacity-80 ml-auto"
                    style={{ padding: '8px 16px', borderRadius: 999, background: '#d7d900', color: '#2659a5' }}
                    onClick={() => {
                      setSelectedCell(null)
                      setLigarModal({ ...selectedCell, target_brand_name: selectedCell.target_brand_name })
                    }}
                  >
                    Ligar no Play
                  </button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {ligarModal && (
        <LigarNoPlayModal
          suggestion={ligarModal}
          open={!!ligarModal}
          onClose={() => setLigarModal(null)}
          onMarkInPlay={() => {
            updateStatus(ligarModal.suggestion_id, 'in_play')
            setLigarModal(null)
          }}
        />
      )}
    </div>
  )
}
