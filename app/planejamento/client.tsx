'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import ContentCard from '@/components/ContentCard'
import LigarNoPlayModal from '@/components/LigarNoPlayModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Brand { id: string; slug: string; name: string }

interface PlanejamentoClientProps {
  brands: Brand[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialSuggestions: any[]
}

export default function PlanejamentoClient({ brands, initialSuggestions }: PlanejamentoClientProps) {
  const [suggestions] = useState(initialSuggestions)
  const [filterBrand, setFilterBrand] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMode, setFilterMode] = useState<string>('all')
  const [ligarModal, setLigarModal] = useState<typeof initialSuggestions[number] | null>(null)

  const filtered = useMemo(() => {
    return suggestions.filter((s) => {
      if (filterBrand !== 'all' && s.target_brand?.slug !== filterBrand) return false
      if (filterStatus !== 'all' && s.status !== filterStatus) return false
      if (filterMode !== 'all' && s.output_mode !== filterMode) return false
      return true
    })
  }, [suggestions, filterBrand, filterStatus, filterMode])

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planejamento</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} sugestões</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => toast.info('Batch geração em desenvolvimento')}>
          ⚡ Gerar pendentes
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterBrand} onValueChange={(v) => v && setFilterBrand(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Marca destino" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as marcas</SelectItem>
            {brands.map((b) => <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
            <SelectItem value="in_play">In Play</SelectItem>
            <SelectItem value="not_replicable">Não replicável</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterMode} onValueChange={(v) => v && setFilterMode(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Output mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="image">🖼️ Imagem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Nenhuma sugestão encontrada</p>
          <p className="text-sm mt-1">Execute o pipeline para gerar sugestões</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((s) => (
            <div key={s.id}>
              {s.target_brand && (
                <div className="mb-1">
                  <Badge variant="outline" className="text-xs">{s.target_brand.name}</Badge>
                </div>
              )}
              <ContentCard
                suggestion={s}
                showMetrics
                showOutputMode
                onLigarNoPlay={() => setLigarModal({ ...s, target_brand_name: s.target_brand?.name })}
                onApprove={() => updateStatus(s.id, 'approved')}
                onReject={() => updateStatus(s.id, 'rejected')}
              />
            </div>
          ))}
        </div>
      )}

      {ligarModal && (
        <LigarNoPlayModal
          suggestion={ligarModal}
          open={!!ligarModal}
          onClose={() => setLigarModal(null)}
          onMarkInPlay={() => {
            updateStatus(ligarModal.id, 'in_play')
            setLigarModal(null)
          }}
        />
      )}
    </div>
  )
}
