'use client'

import type { Content, ContentSuggestion, ContentMetrics } from '@/lib/supabase/types'

interface ContentCardProps {
  content?: Content & { content_metrics?: ContentMetrics[] }
  suggestion?: ContentSuggestion
  showMetrics?: boolean
  showOutputMode?: boolean
  onLigarNoPlay?: () => void
  onApprove?: () => void
  onReject?: () => void
  onViewOrigin?: () => void
  onGenerate?: (outputMode: 'image' | 'video') => void
  /** 'plan' = full horizontal card (Planejamento), 'hit' = compact vertical (Radar/Análise) */
  variant?: 'plan' | 'hit'
}

function fmt(n: number | null | undefined, suffix = '') {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M${suffix}`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k${suffix}`
  return `${n}${suffix}`
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  return `${(n * 100).toFixed(1)}%`
}

function ScoreBadge({ score }: { score: number }) {
  const isN1 = score >= 75
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={isN1
        ? { background: '#2659a5', color: '#d7d900' }
        : { background: '#d7d900', color: '#2659a5' }
      }
    >
      {isN1 ? 'N1' : 'N2'}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null
  const map: Record<string, { label: string; style: React.CSSProperties }> = {
    not_replicable: { label: 'Não replicável', style: { background: 'rgba(38,89,165,0.08)', color: '#7ba1d8' } },
    approved: { label: 'Aprovado', style: { background: '#eaf1fa', color: '#2659a5' } },
    in_play: { label: 'In Play', style: { background: '#2659a5', color: '#d7d900' } },
    published: { label: 'Publicado', style: { background: '#2659a5', color: '#ffffff' } },
    draft: { label: 'Draft', style: { background: 'rgba(248,174,19,0.2)', color: '#7a5400' } },
    rejected: { label: 'Rejeitado', style: { background: 'rgba(229,39,60,0.12)', color: '#e5273c' } },
  }
  const cfg = map[status]
  if (!cfg) return null
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={cfg.style}
    >
      {cfg.label}
    </span>
  )
}

function OutputBadge({ mode }: { mode: string | null | undefined }) {
  if (!mode) return null
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={mode === 'video'
        ? { background: '#e61782', color: '#ffffff' }
        : { background: '#3dbfef', color: '#2659a5' }
      }
    >
      {mode === 'video' ? 'Vídeo' : 'Imagem'}
    </span>
  )
}

export default function ContentCard({
  content,
  suggestion,
  showMetrics = true,
  showOutputMode = false,
  onLigarNoPlay,
  onApprove,
  onReject,
  onViewOrigin,
  onGenerate,
  variant = 'plan',
}: ContentCardProps) {
  const item = suggestion ?? content
  const metrics = content?.content_metrics?.[0]

  const hook = suggestion?.hook ?? content?.hook
  const product = suggestion?.product ?? content?.product
  const score = suggestion?.estimated_impact_score
  const imageUrl = suggestion?.image_url ?? content?.image_url
  const isNotReplicable = suggestion?.status === 'not_replicable' || suggestion?.is_replicable === false
  const outputMode = suggestion?.output_mode

  if (!item) return null

  if (variant === 'hit') {
    return <HitCard {...{ hook, product, score, metrics, isNotReplicable, outputMode, showMetrics, onLigarNoPlay, onApprove, onReject, onGenerate }} />
  }

  /* ── Plan-card (horizontal) ── */
  return (
    <div
      className="flex overflow-hidden transition-colors duration-200"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(38,89,165,0.14)',
        borderRadius: 22,
        opacity: isNotReplicable ? 0.72 : 1,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'rgba(38,89,165,0.28)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'rgba(38,89,165,0.14)'
      }}
    >
      {/* Left panel — image or status indicator */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center relative"
        style={{
          width: 140,
          background: isNotReplicable
            ? '#fbf2e7'
            : outputMode === 'video' ? '#d7d900' : '#2659a5',
          color: isNotReplicable
            ? '#7ba1d8'
            : outputMode === 'video' ? '#2659a5' : '#d7d900',
        }}
      >
        {/* 3-dot signature */}
        {!isNotReplicable && (
          <div
            className="absolute top-3.5 left-3.5 w-2 h-2 rounded-full"
            style={{
              background: outputMode === 'video' ? '#2659a5' : '#d7d900',
              boxShadow: outputMode === 'video'
                ? '14px 0 0 #2659a5, 28px 0 0 #2659a5'
                : '14px 0 0 #d7d900, 28px 0 0 #d7d900',
            }}
          />
        )}

        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={hook ?? ''} className="w-full h-full object-cover absolute inset-0" />
        ) : (
          <span className="text-xs font-semibold text-center px-3 tracking-wide uppercase leading-relaxed">
            {isNotReplicable ? 'Não\nreplicável' : outputMode === 'video' ? 'Vídeo\ngerado' : 'Imagem\ngerada'}
          </span>
        )}
      </div>

      {/* Right panel — content */}
      <div className="flex-1 p-5 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {score != null && <ScoreBadge score={score} />}
            {showOutputMode && <OutputBadge mode={outputMode} />}
            {score != null && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ background: '#eaf1fa', color: '#2659a5' }}
              >
                Score {score.toFixed(0)}
              </span>
            )}
            <StatusBadge status={suggestion?.status} />
          </div>
        </div>

        {/* Hook / title */}
        <p className="text-sm font-semibold leading-snug" style={{ color: '#2659a5', letterSpacing: '-0.005em' }}>
          {hook ?? '—'}
        </p>
        {product && (
          <p className="text-xs" style={{ color: '#7ba1d8' }}>{product}</p>
        )}

        {/* Estimated metrics */}
        {showMetrics && suggestion && (
          <div className="flex gap-4 flex-wrap text-xs" style={{ color: '#7ba1d8' }}>
            {suggestion.estimated_ctr != null && (
              <span>CTR est. <strong style={{ color: '#2659a5' }}>{fmtPct(suggestion.estimated_ctr)}</strong></span>
            )}
            {suggestion.estimated_roas != null && (
              <span>ROAS est. <strong style={{ color: '#2659a5' }}>{suggestion.estimated_roas.toFixed(1)}x</strong></span>
            )}
            {suggestion.estimated_views != null && (
              <span>Views est. <strong style={{ color: '#2659a5' }}>{fmt(suggestion.estimated_views)}</strong></span>
            )}
          </div>
        )}

        {/* Real metrics for content */}
        {showMetrics && metrics && (
          <div className="flex gap-4 flex-wrap text-xs" style={{ color: '#7ba1d8' }}>
            {metrics.ctr != null && (
              <span>CTR <strong style={{ color: '#2659a5' }}>{fmtPct(metrics.ctr)}</strong></span>
            )}
            {metrics.roas != null && (
              <span>ROAS <strong style={{ color: '#2659a5' }}>{metrics.roas.toFixed(1)}x</strong></span>
            )}
            {metrics.views != null && (
              <span>Views <strong style={{ color: '#2659a5' }}>{fmt(metrics.views)}</strong></span>
            )}
          </div>
        )}

        {/* Score bar */}
        {score != null && !isNotReplicable && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#7ba1d8' }}>Score</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#eaf1fa' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${score}%`,
                  background: score >= 75 ? '#2659a5' : '#d7d900',
                }}
              />
            </div>
            <span className="text-xs font-bold min-w-12 text-right" style={{ color: '#2659a5' }}>
              {score.toFixed(0)}/100
            </span>
          </div>
        )}

        {/* Replicability reason */}
        {isNotReplicable && suggestion?.replicability_reason && (
          <p className="text-xs italic border-l-2 pl-2" style={{ color: '#7ba1d8', borderColor: 'rgba(38,89,165,0.28)' }}>
            {suggestion.replicability_reason}
          </p>
        )}

        {/* Actions */}
        {!isNotReplicable && (
          <div className="flex gap-2 pt-1 flex-wrap">
            {onLigarNoPlay && (
              <PillButton variant="primary" onClick={onLigarNoPlay}>Ligar no Play</PillButton>
            )}
            {onApprove && (
              <PillButton variant="default" onClick={onApprove}>Aprovar</PillButton>
            )}
            {onReject && (
              <PillButton variant="ghost" onClick={onReject}>Rejeitar</PillButton>
            )}
            {onGenerate && (
              <PillButton variant="ghost" onClick={() => onGenerate('image')}>Gerar imagem</PillButton>
            )}
            {onViewOrigin && (
              <PillButton variant="ghost" onClick={onViewOrigin}>Ver hit origem</PillButton>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Compact hit-card (vertical) ── */
function HitCard({
  hook, product, score, metrics, isNotReplicable, outputMode, showMetrics,
  onLigarNoPlay, onApprove, onReject, onGenerate,
}: {
  hook?: string | null
  product?: string | null
  score?: number | null
  metrics?: ContentMetrics
  isNotReplicable: boolean
  outputMode?: string | null
  showMetrics: boolean
  onLigarNoPlay?: () => void
  onApprove?: () => void
  onReject?: () => void
  onGenerate?: (mode: 'image' | 'video') => void
}) {
  return (
    <div
      className="relative flex flex-col gap-3 p-5 overflow-hidden transition-colors duration-200"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(38,89,165,0.14)',
        borderRadius: 22,
        opacity: isNotReplicable ? 0.72 : 1,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(38,89,165,0.28)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(38,89,165,0.14)'
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[22px]"
        style={{ background: score != null && score >= 75 ? '#2659a5' : '#d7d900' }}
      />

      {/* Top: badges + output mode */}
      <div className="flex items-center gap-2 flex-wrap pl-2">
        {score != null && <ScoreBadge score={score} />}
        {outputMode && <OutputBadge mode={outputMode} />}
        {isNotReplicable && (
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
            style={{ background: 'rgba(38,89,165,0.08)', color: '#7ba1d8' }}
          >
            Não replicável
          </span>
        )}
      </div>

      {/* Hook */}
      <p className="text-sm font-semibold leading-snug pl-2" style={{ color: '#2659a5' }}>
        {hook ?? '—'}
      </p>
      {product && (
        <p className="text-xs pl-2" style={{ color: '#7ba1d8' }}>{product}</p>
      )}

      {/* Metrics */}
      {showMetrics && metrics && (
        <div
          className="flex gap-4 pt-3 border-t text-xs pl-2"
          style={{ borderColor: 'rgba(38,89,165,0.14)', color: '#7ba1d8' }}
        >
          {metrics.ctr != null && (
            <span>CTR <strong style={{ color: '#2659a5' }}>{(metrics.ctr * 100).toFixed(1)}%</strong></span>
          )}
          {metrics.views != null && (
            <span>Views <strong style={{ color: '#2659a5' }}>{fmt(metrics.views)}</strong></span>
          )}
          {metrics.roas != null && (
            <span>ROAS <strong style={{ color: '#2659a5' }}>{metrics.roas.toFixed(1)}x</strong></span>
          )}
        </div>
      )}

      {/* Actions */}
      {!isNotReplicable && (
        <div className="flex gap-2 flex-wrap pl-2">
          {onLigarNoPlay && <PillButton variant="primary" onClick={onLigarNoPlay}>Ligar no Play</PillButton>}
          {onApprove && <PillButton variant="default" onClick={onApprove}>Aprovar</PillButton>}
          {onReject && <PillButton variant="ghost" onClick={onReject}>Rejeitar</PillButton>}
          {onGenerate && <PillButton variant="ghost" onClick={() => onGenerate('image')}>Gerar</PillButton>}
        </div>
      )}
    </div>
  )
}

/* ── Shared pill button ── */
function PillButton({
  variant,
  onClick,
  children,
}: {
  variant: 'primary' | 'yellow' | 'default' | 'ghost'
  onClick: () => void
  children: React.ReactNode
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: '#2659a5', color: '#ffffff', border: '1px solid #2659a5' },
    yellow: { background: '#d7d900', color: '#2659a5', border: '1px solid #d7d900' },
    default: { background: '#ffffff', color: '#2659a5', border: '1px solid rgba(38,89,165,0.28)' },
    ghost: { background: 'transparent', color: '#7ba1d8', border: '1px solid transparent' },
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer"
      style={{ padding: '6px 12px', borderRadius: 999, ...styles[variant] }}
    >
      {children}
    </button>
  )
}
