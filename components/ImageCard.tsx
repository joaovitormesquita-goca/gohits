'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface ImageCardSuggestion {
  id: string
  name?: string | null
  hook?: string | null
  product?: string | null
  platform?: string | null
  image_url?: string | null
  status?: string | null
  estimated_impact_score?: number | null
  meta_status?: string | null
  meta_ad_id?: string | null
  target_brand_name?: string | null
}

interface ImageCardProps {
  suggestion: ImageCardSuggestion
  onImageGenerated?: (suggestionId: string, imageUrl: string) => void
  onMetaPublished?: (suggestionId: string) => void
}

export default function ImageCard({ suggestion, onImageGenerated, onMetaPublished }: ImageCardProps) {
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<{ ad_id: string; adset_id: string; created_new_adset: boolean } | null>(null)

  const isDraft = !suggestion.image_url
  const metaStatus = suggestion.meta_status ?? null
  const score = suggestion.estimated_impact_score

  async function generateImage() {
    setGenerating(true)
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId: suggestion.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao gerar imagem')
        return
      }
      toast.success('Imagem gerada!')
      onImageGenerated?.(suggestion.id, data.image_url)
    } catch {
      toast.error('Falha de conexão')
    } finally {
      setGenerating(false)
    }
  }

  async function publishToMeta() {
    setPublishing(true)
    try {
      const res = await fetch('/api/meta/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId: suggestion.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao publicar no Facebook Ads')
        return
      }
      setPublishResult(data)
      toast.success(`Ad publicado! ${data.created_new_adset ? 'Novo adset criado.' : 'Adicionado ao adset existente.'}`)
      onMetaPublished?.(suggestion.id)
    } catch {
      toast.error('Falha de conexão ao publicar')
    } finally {
      setPublishing(false)
    }
  }

  function downloadImage() {
    if (!suggestion.image_url) return
    const a = document.createElement('a')
    a.href = suggestion.image_url
    a.download = `${suggestion.name ?? suggestion.id}.png`
    a.click()
  }

  return (
    <div
      className="flex flex-col overflow-hidden transition-colors duration-200"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(38,89,165,0.14)',
        borderRadius: 22,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(38,89,165,0.28)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(38,89,165,0.14)'
      }}
    >
      {/* Image area */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: 200,
          background: isDraft ? '#eaf1fa' : '#f8fafc',
        }}
      >
        {suggestion.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={suggestion.image_url}
            alt={suggestion.hook ?? 'Imagem gerada'}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center px-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'rgba(38,89,165,0.1)' }}
            >
              🖼️
            </div>
            <p className="text-xs font-semibold" style={{ color: '#7ba1d8' }}>Imagem não gerada</p>
            <p className="text-[10px]" style={{ color: '#7ba1d8' }}>Clique em &quot;Gerar Imagem&quot; para criar</p>
          </div>
        )}

        {/* Draft badge */}
        {isDraft && (
          <div
            className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(248,174,19,0.2)', color: '#7a5400' }}
          >
            Draft
          </div>
        )}

        {/* Meta status badge */}
        {metaStatus === 'in_test' && (
          <div
            className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: '#dbeafe', color: '#1d4ed8' }}
          >
            ⏳ Em teste
          </div>
        )}
        {metaStatus === 'result_available' && (
          <div
            className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: '#dcfce7', color: '#15803d' }}
          >
            ✅ Resultado
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="p-4 space-y-3">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {suggestion.target_brand_name && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
              style={{ background: '#2659a5', color: '#d7d900' }}
            >
              {suggestion.target_brand_name}
            </span>
          )}
          {suggestion.platform && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
              style={{ background: '#eaf1fa', color: '#7ba1d8' }}
            >
              {suggestion.platform}
            </span>
          )}
          {score != null && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
              style={score >= 75
                ? { background: '#2659a5', color: '#d7d900' }
                : { background: '#d7d900', color: '#2659a5' }
              }
            >
              {score >= 75 ? 'N1' : 'N2'} · {score.toFixed(0)}
            </span>
          )}
        </div>

        {/* Hook */}
        <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: '#2659a5' }}>
          {suggestion.hook ?? '—'}
        </p>
        {suggestion.product && (
          <p className="text-xs" style={{ color: '#7ba1d8' }}>{suggestion.product}</p>
        )}

        {/* Publish result */}
        {publishResult && (
          <div
            className="rounded-xl p-3 text-xs"
            style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}
          >
            <p className="font-semibold" style={{ color: '#15803d' }}>✅ Publicado no Facebook Ads</p>
            <p className="mt-0.5" style={{ color: '#166534' }}>Ad ID: {publishResult.ad_id}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap pt-1">
          {isDraft ? (
            <button
              onClick={generateImage}
              disabled={generating}
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 cursor-pointer"
              style={{ padding: '7px 14px', borderRadius: 999, background: '#2659a5', color: '#ffffff' }}
            >
              {generating ? '⏳ Gerando...' : '✨ Gerar Imagem'}
            </button>
          ) : (
            <>
              <button
                onClick={downloadImage}
                className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer"
                style={{ padding: '7px 14px', borderRadius: 999, background: '#ffffff', color: '#2659a5', border: '1px solid rgba(38,89,165,0.28)' }}
              >
                💾 Download PNG
              </button>

              {!metaStatus && !publishResult && (
                <button
                  onClick={publishToMeta}
                  disabled={publishing}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 cursor-pointer"
                  style={{ padding: '7px 14px', borderRadius: 999, background: '#ffffff', color: '#1d4ed8', border: '1px solid #93c5fd' }}
                >
                  {publishing ? '⏳ Publicando...' : '🚀 Publicar no Meta Ads'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
