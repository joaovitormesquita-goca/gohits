'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import ImageCard from '@/components/ImageCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Brand { id: string; slug: string; name: string }

interface ImagensClientProps {
  brands: Brand[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialSuggestions: any[]
}

const STATUS_OPTS = [
  { value: 'all', label: 'Todas' },
  { value: 'draft', label: 'Draft (sem imagem)' },
  { value: 'generated', label: 'Imagem gerada' },
  { value: 'published', label: 'Publicada no Meta' },
]

export default function ImagensClient({ brands, initialSuggestions }: ImagensClientProps) {
  const searchParams = useSearchParams()
  const hitId = searchParams.get('hitId')

  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [filterBrand, setFilterBrand] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')

  const stats = useMemo(() => {
    const total = suggestions.length
    const drafts = suggestions.filter((s) => !s.image_url).length
    const generated = suggestions.filter((s) => s.image_url && !s.meta_status).length
    const published = suggestions.filter((s) => s.meta_status).length
    return { total, drafts, generated, published }
  }, [suggestions])

  const filtered = useMemo(() => {
    return suggestions.filter((s) => {
      if (hitId && s.origin_content?.id !== hitId) return false
      if (filterBrand !== 'all' && s.target_brand?.slug !== filterBrand) return false
      if (filterPlatform !== 'all' && s.platform !== filterPlatform) return false
      if (filterStatus === 'draft' && s.image_url) return false
      if (filterStatus === 'generated' && (!s.image_url || s.meta_status)) return false
      if (filterStatus === 'published' && !s.meta_status) return false
      return true
    })
  }, [suggestions, hitId, filterBrand, filterStatus, filterPlatform])

  function handleImageGenerated(suggestionId: string, imageUrl: string) {
    setSuggestions((prev) =>
      prev.map((s) => s.id === suggestionId ? { ...s, image_url: imageUrl } : s)
    )
  }

  function handleMetaPublished(suggestionId: string) {
    setSuggestions((prev) =>
      prev.map((s) => s.id === suggestionId ? { ...s, meta_status: 'in_test' } : s)
    )
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: '#7ba1d8' }}>
            Geração e publicação
          </p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#2659a5', letterSpacing: '-0.015em' }}>
            Imagens
          </h1>
          <p className="text-sm mt-1.5" style={{ color: '#7ba1d8' }}>
            Gere imagens on-demand para pautas aprovadas e publique no Meta Ads.
          </p>
          {hitId && (
            <p className="text-xs mt-1 font-medium" style={{ color: '#2659a5' }}>
              Filtrando por hit de origem
              <button
                className="ml-2 underline underline-offset-2 hover:opacity-70"
                onClick={() => window.history.replaceState(null, '', '/imagens')}
                style={{ color: '#7ba1d8' }}
              >
                Limpar filtro
              </button>
            </p>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: 'Total', value: stats.total, sub: 'pautas com imagem ou draft', variant: 'default' },
          { label: 'Drafts', value: stats.drafts, sub: 'Aguardando geração', variant: 'yellow' },
          { label: 'Geradas', value: stats.generated, sub: 'Prontas para publicar', variant: 'blue' },
          { label: 'Publicadas', value: stats.published, sub: 'No Meta Ads', variant: 'default' },
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
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTS.map((opt) => {
            const isActive = filterStatus === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className="text-xs font-medium transition-all"
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: isActive ? '#2659a5' : '#eaf1fa',
                  color: isActive ? '#ffffff' : '#7ba1d8',
                  border: 'none',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Brand select */}
        <Select value={filterBrand} onValueChange={(v) => v && setFilterBrand(v)}>
          <SelectTrigger className="w-full sm:w-44 text-xs">
            <SelectValue placeholder="Marca destino" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as marcas</SelectItem>
            {brands.map((b) => <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Platform select */}
        <Select value={filterPlatform} onValueChange={(v) => v && setFilterPlatform(v)}>
          <SelectTrigger className="w-full sm:w-40 text-xs">
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

      {/* Section label */}
      <div className="flex items-center gap-2.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#d7d900' }} />
        <span className="text-sm font-semibold" style={{ color: '#2659a5' }}>
          Imagens
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ml-1"
          style={{ background: '#d7d900', color: '#2659a5' }}
        >
          {filtered.length}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#7ba1d8' }}>
          <p className="text-lg font-medium">Nenhuma imagem encontrada</p>
          <p className="text-sm mt-1">Aprove pautas em Planejamento para que apareçam aqui como drafts</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((s) => (
            <ImageCard
              key={s.id}
              suggestion={{
                ...s,
                target_brand_name: s.target_brand?.name,
              }}
              onImageGenerated={handleImageGenerated}
              onMetaPublished={handleMetaPublished}
            />
          ))}
        </div>
      )}
    </div>
  )
}
