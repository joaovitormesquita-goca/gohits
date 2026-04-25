'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Content, ContentMetrics, ContentSuggestion } from '@/lib/supabase/types'

interface ContentPreviewModalProps {
  content?: Content & {
    content_metrics?: ContentMetrics[]
    brands?: { id: string; name: string; slug: string } | null
  }
  suggestion?: ContentSuggestion & {
    origin_brand_name?: string
    target_brand_name?: string
  }
  open: boolean
  onClose: () => void
  onGenerate?: (mode: 'image' | 'video') => void
  onApprove?: () => void
  onReject?: () => void
  onOpenPauta?: () => void
  onViewOrigin?: () => void
  onNavigatePautas?: () => void
  onNavigateImagens?: () => void
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

function fmtCurrency(n: number | null | undefined) {
  if (n == null || n === 0) return '—'
  return `R$${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  meta: 'Meta',
  archive: 'Archive',
}

const STATUS_MAP: Record<string, { label: string; style: React.CSSProperties }> = {
  not_replicable: { label: 'Não replicável', style: { background: 'rgba(38,89,165,0.08)', color: '#7ba1d8' } },
  approved: { label: 'Aprovado', style: { background: '#eaf1fa', color: '#2659a5' } },
  in_play: { label: 'In Play', style: { background: '#2659a5', color: '#d7d900' } },
  published: { label: 'Publicado', style: { background: '#2659a5', color: '#ffffff' } },
  draft: { label: 'Draft', style: { background: 'rgba(248,174,19,0.2)', color: '#7a5400' } },
  rejected: { label: 'Rejeitado', style: { background: 'rgba(229,39,60,0.12)', color: '#e5273c' } },
}

function Badge({ label, style }: { label: string; style: React.CSSProperties }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={style}
    >
      {label}
    </span>
  )
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center p-3 rounded-xl text-center"
      style={{ background: '#eaf1fa' }}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: '#7ba1d8' }}>
        {label}
      </span>
      <span className="text-sm font-bold" style={{ color: '#2659a5' }}>
        {value}
      </span>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#7ba1d8' }}>{label}</p>
      <div className="text-sm leading-relaxed" style={{ color: '#2659a5' }}>{children}</div>
    </div>
  )
}

function PillAction({
  children,
  variant = 'default',
  onClick,
  disabled,
}: {
  children: React.ReactNode
  variant?: 'primary' | 'yellow' | 'default' | 'ghost'
  onClick: () => void
  disabled?: boolean
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
      disabled={disabled}
      className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 cursor-pointer"
      style={{ padding: '7px 14px', borderRadius: 999, ...styles[variant] }}
    >
      {children}
    </button>
  )
}

export default function ContentPreviewModal({
  content,
  suggestion,
  open,
  onClose,
  onGenerate,
  onApprove,
  onReject,
  onOpenPauta,
  onViewOrigin,
  onNavigatePautas,
  onNavigateImagens,
}: ContentPreviewModalProps) {
  const isHit = !!content
  const metrics = content?.content_metrics?.[0]

  const hook = isHit ? content.hook : suggestion?.hook
  const product = isHit ? content.product : suggestion?.product
  const creator = isHit ? content.creator : undefined
  const platform = isHit ? content.platform : suggestion?.platform
  const scenery = isHit ? content.scenery : suggestion?.scenery
  const contentDescription = isHit ? content.content_description : suggestion?.content_description
  const imageUrl = isHit ? content.image_url : suggestion?.image_url
  const brandName = isHit ? content.brands?.name : suggestion?.target_brand_name
  const score = isHit ? null : suggestion?.estimated_impact_score
  const status = suggestion?.status

  const isN1 = score != null && score >= 75

  const hasHitMetrics = metrics && (
    metrics.views || metrics.impressions || metrics.click_count ||
    metrics.spend || metrics.ctr || metrics.roas ||
    metrics.thumbstop_ratio || metrics.engagement_rate
  )

  const hasEstMetrics = !isHit && (
    suggestion?.estimated_ctr != null ||
    suggestion?.estimated_roas != null ||
    suggestion?.estimated_views != null
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap gap-1.5 items-center pr-8">
            {brandName && (
              <Badge
                label={brandName}
                style={{ background: '#2659a5', color: '#d7d900' }}
              />
            )}
            {score != null && (
              <Badge
                label={isN1 ? 'N1' : 'N2'}
                style={isN1
                  ? { background: '#2659a5', color: '#d7d900' }
                  : { background: '#d7d900', color: '#2659a5' }
                }
              />
            )}
            {score != null && (
              <Badge
                label={`Score ${score.toFixed(0)}`}
                style={{ background: '#eaf1fa', color: '#2659a5' }}
              />
            )}
            {status && STATUS_MAP[status] && (
              <Badge label={STATUS_MAP[status].label} style={STATUS_MAP[status].style} />
            )}
            {platform && (
              <Badge
                label={PLATFORM_LABEL[platform] ?? platform}
                style={{ background: '#eaf1fa', color: '#7ba1d8' }}
              />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Hook */}
          {hook && (
            <p className="text-base font-semibold leading-snug" style={{ color: '#2659a5', letterSpacing: '-0.01em' }}>
              {hook}
            </p>
          )}

          {/* Image */}
          {imageUrl && (
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(38,89,165,0.14)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                className="w-full max-h-48 object-contain"
                style={{ background: '#f8fafc' }}
              />
            </div>
          )}

          {/* Metadata grid */}
          {(product || creator || platform) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {product && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#7ba1d8' }}>Produto</p>
                  <p className="text-sm font-medium" style={{ color: '#2659a5' }}>{product}</p>
                </div>
              )}
              {creator && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#7ba1d8' }}>Criador</p>
                  <p className="text-sm font-medium" style={{ color: '#2659a5' }}>{creator}</p>
                </div>
              )}
              {platform && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#7ba1d8' }}>Plataforma</p>
                  <p className="text-sm font-medium" style={{ color: '#2659a5' }}>{PLATFORM_LABEL[platform] ?? platform}</p>
                </div>
              )}
            </div>
          )}

          {/* Cenário */}
          {scenery && (
            <Section label="Cenário">
              {scenery}
            </Section>
          )}

          {/* Roteiro */}
          {contentDescription && (
            <Section label="Roteiro">
              <span className="whitespace-pre-wrap">{contentDescription}</span>
            </Section>
          )}

          {/* Métricas reais (hit) */}
          {hasHitMetrics && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#7ba1d8' }}>Métricas</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {metrics.views ? <MetricBox label="Views" value={fmt(metrics.views)} /> : null}
                {metrics.impressions ? <MetricBox label="Impressões" value={fmt(metrics.impressions)} /> : null}
                {metrics.click_count ? <MetricBox label="Cliques" value={fmt(metrics.click_count)} /> : null}
                {metrics.ctr ? <MetricBox label="CTR" value={fmtPct(metrics.ctr)} /> : null}
                {metrics.roas ? <MetricBox label="ROAS" value={`${metrics.roas.toFixed(1)}x`} /> : null}
                {metrics.spend ? <MetricBox label="Spend" value={fmtCurrency(metrics.spend)} /> : null}
                {metrics.thumbstop_ratio ? <MetricBox label="Thumbstop" value={fmtPct(metrics.thumbstop_ratio)} /> : null}
                {metrics.engagement_rate ? <MetricBox label="Eng. Rate" value={fmtPct(metrics.engagement_rate)} /> : null}
              </div>
            </div>
          )}

          {/* Métricas estimadas (sugestão) */}
          {hasEstMetrics && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#7ba1d8' }}>Métricas estimadas</p>
              <div className="grid grid-cols-3 gap-2">
                {suggestion?.estimated_views != null && (
                  <MetricBox label="Views est." value={fmt(suggestion.estimated_views)} />
                )}
                {suggestion?.estimated_ctr != null && (
                  <MetricBox label="CTR est." value={fmtPct(suggestion.estimated_ctr)} />
                )}
                {suggestion?.estimated_roas != null && (
                  <MetricBox label="ROAS est." value={`${suggestion.estimated_roas.toFixed(1)}x`} />
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div
            className="flex flex-wrap gap-2 pt-1 border-t"
            style={{ borderColor: 'rgba(38,89,165,0.1)' }}
          >
            {onOpenPauta && (
              <PillAction variant="primary" onClick={onOpenPauta}>Ver Pauta completa</PillAction>
            )}
            {onGenerate && (
              <PillAction variant="primary" onClick={() => onGenerate('image')}>Gerar Pauta</PillAction>
            )}
            {onApprove && status !== 'approved' && (
              <PillAction variant="default" onClick={onApprove}>Aprovar</PillAction>
            )}
            {onReject && (
              <PillAction variant="ghost" onClick={onReject}>Rejeitar</PillAction>
            )}
            {onViewOrigin && (
              <PillAction variant="ghost" onClick={onViewOrigin}>Ver origem</PillAction>
            )}
            {onNavigatePautas && (
              <PillAction variant="ghost" onClick={onNavigatePautas}>Pautas</PillAction>
            )}
            {onNavigateImagens && (
              <PillAction variant="ghost" onClick={onNavigateImagens}>Imagens</PillAction>
            )}
            <PillAction variant="ghost" onClick={onClose}>Fechar</PillAction>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
