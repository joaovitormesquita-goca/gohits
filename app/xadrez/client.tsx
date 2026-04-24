'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import LigarNoPlayModal from '@/components/LigarNoPlayModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import ContentCard from '@/components/ContentCard'

interface XadrezClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brands: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matrix: any[]
}

function cellIcon(row: { status: string | null; is_replicable: boolean | null; suggestion_id: string | null; output_mode: string | null }): string {
  if (!row.suggestion_id) return '⬜'
  if (row.status === 'not_replicable' || row.is_replicable === false) return '❌'
  if (row.status === 'draft') return '⏳'
  if (row.status === 'approved' || row.status === 'in_play' || row.status === 'published') return '✅'
  if (row.status === 'rejected') return '🚫'
  return '⬜'
}

function outputIcon(outputMode: string | null): string {
  if (outputMode === 'image') return '🖼️'
  if (outputMode === 'video') return '🎥'
  return ''
}

export default function XadrezClient({ brands, matrix }: XadrezClientProps) {
  const [selectedCell, setSelectedCell] = useState<typeof matrix[number] | null>(null)
  const [ligarModal, setLigarModal] = useState<typeof matrix[number] | null>(null)
  const [filterOriginBrand, setFilterOriginBrand] = useState<string>('all')

  // Get unique content rows (hits)
  const contents = useMemo(() => {
    const seen = new Set<string>()
    return matrix.filter((row) => {
      if (seen.has(row.content_id)) return false
      seen.add(row.content_id)
      return true
    }).filter((row) => filterOriginBrand === 'all' || row.origin_brand_slug === filterOriginBrand)
  }, [matrix, filterOriginBrand])

  // Stats
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Xadrez de Replicação</h1>
        <p className="text-muted-foreground text-sm">Clique em uma célula para ver os detalhes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.totalCells, color: '' },
          { label: 'Geradas', value: `${stats.generated} (${stats.totalCells ? Math.round(stats.generated / stats.totalCells * 100) : 0}%)`, color: 'text-blue-600' },
          { label: 'Aprovadas', value: `${stats.approved} (${stats.totalCells ? Math.round(stats.approved / stats.totalCells * 100) : 0}%)`, color: 'text-green-600' },
          { label: 'Não replicáveis', value: `${stats.notReplicable} (${stats.totalCells ? Math.round(stats.notReplicable / stats.totalCells * 100) : 0}%)`, color: 'text-red-500' },
          { label: 'Pendentes', value: `${stats.pending} (${stats.totalCells ? Math.round(stats.pending / stats.totalCells * 100) : 0}%)`, color: 'text-yellow-600' },
        ].map((s) => (
          <div key={s.label} className="bg-muted/50 rounded-lg p-3 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground self-center">Marca origem:</span>
        {['all', ...brands.map((b) => b.slug)].map((slug) => (
          <Button
            key={slug}
            variant={filterOriginBrand === slug ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterOriginBrand(slug)}
          >
            {slug === 'all' ? 'Todas' : brands.find((b) => b.slug === slug)?.name}
          </Button>
        ))}
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left p-3 border-b font-medium text-muted-foreground min-w-48">Hit</th>
              <th className="text-center p-3 border-b font-medium text-muted-foreground min-w-8">Origem</th>
              {brands.map((b) => (
                <th key={b.id} className="text-center p-3 border-b font-medium min-w-24">
                  {b.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contents.map((row) => (
              <tr key={row.content_id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3 border-b">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium line-clamp-1">{row.content_name ?? '—'}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{row.hook}</span>
                  </div>
                </td>
                <td className="p-3 border-b text-center">
                  <Badge variant="outline" className="text-xs">{row.origin_brand_slug}</Badge>
                </td>
                {brands.map((brand) => {
                  if (brand.id === row.origin_brand_id) {
                    return (
                      <td key={brand.id} className="p-3 border-b text-center text-muted-foreground text-lg">
                        —
                      </td>
                    )
                  }
                  const cell = getCell(row.content_id, brand.id)
                  const icon = cell ? cellIcon(cell) : '⬜'
                  const oIcon = cell ? outputIcon(cell.output_mode) : ''
                  return (
                    <td
                      key={brand.id}
                      className="p-3 border-b text-center cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => cell ? setSelectedCell(cell) : null}
                      title={cell?.status ?? 'Não gerado'}
                    >
                      <span className="text-lg">{icon}{oIcon}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {contents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum hit encontrado. Adicione seeds no banco de dados.</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {[
          { icon: '⬜', label: 'Não gerado' },
          { icon: '❌', label: 'Não replicável' },
          { icon: '⏳', label: 'Draft' },
          { icon: '✅', label: 'Aprovado/In Play' },
          { icon: '🚫', label: 'Rejeitado' },
          { icon: '🖼️', label: 'Imagem' },
          { icon: '🎥', label: 'Vídeo' },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            {l.icon} {l.label}
          </span>
        ))}
      </div>

      {/* Drawer lateral */}
      <Sheet open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Replicação</SheetTitle>
          </SheetHeader>
          {selectedCell && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedCell.origin_brand_name}</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge>{selectedCell.target_brand_name}</Badge>
                <span className="text-xl ml-auto">{cellIcon(selectedCell)}{outputIcon(selectedCell.output_mode)}</span>
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
                  showMetrics
                  showOutputMode
                />
              )}

              {!selectedCell.suggestion_id && (
                <div className="py-8 text-center text-muted-foreground">
                  <p>Réplica ainda não gerada</p>
                  <Button
                    className="mt-3"
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
                  </Button>
                </div>
              )}

              {selectedCell.suggestion_id && !['not_replicable', 'rejected'].includes(selectedCell.status ?? '') && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => updateStatus(selectedCell.suggestion_id, 'approved')}
                  >
                    ✅ Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus(selectedCell.suggestion_id, 'rejected')}
                  >
                    🚫 Rejeitar
                  </Button>
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      setSelectedCell(null)
                      setLigarModal({ ...selectedCell, target_brand_name: selectedCell.target_brand_name })
                    }}
                  >
                    ▶️ Ligar no Play
                  </Button>
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
