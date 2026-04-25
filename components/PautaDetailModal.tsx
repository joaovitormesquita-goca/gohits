'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface PautaSuggestion {
  id: string
  name?: string | null
  hook?: string | null
  scenery?: string | null
  content_description?: string | null
  briefing?: string | null
  estimated_ctr?: number | null
  estimated_roas?: number | null
  estimated_views?: number | null
  estimated_impact_score?: number | null
  status?: string | null
  target_brand_name?: string | null
}

interface PautaDetailModalProps {
  suggestion: PautaSuggestion
  open: boolean
  onClose: () => void
  onApprove?: () => void
  onReject?: () => void
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  return `${(n * 100).toFixed(1)}%`
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return `${n}`
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  in_play: 'In Play',
  not_replicable: 'Não replicável',
}

export default function PautaDetailModal({ suggestion, open, onClose, onApprove, onReject }: PautaDetailModalProps) {
  const [copied, setCopied] = useState(false)

  async function copyBriefing() {
    if (!suggestion.briefing) return
    await navigator.clipboard.writeText(suggestion.briefing)
    setCopied(true)
    toast.success('Briefing copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap" style={{ color: '#2659a5' }}>
            <span>Pauta</span>
            {suggestion.target_brand_name && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
                style={{ background: '#2659a5', color: '#d7d900' }}
              >
                {suggestion.target_brand_name}
              </span>
            )}
            {suggestion.status && STATUS_LABELS[suggestion.status] && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
                style={suggestion.status === 'approved'
                  ? { background: '#eaf1fa', color: '#2659a5' }
                  : suggestion.status === 'in_play'
                  ? { background: '#2659a5', color: '#d7d900' }
                  : { background: 'rgba(248,174,19,0.2)', color: '#7a5400' }
                }
              >
                {STATUS_LABELS[suggestion.status]}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Estimated metrics */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl"
            style={{ background: '#eaf1fa' }}
          >
            {[
              { label: 'Score', value: suggestion.estimated_impact_score != null ? `${suggestion.estimated_impact_score.toFixed(0)}/100` : '—' },
              { label: 'CTR est.', value: fmtPct(suggestion.estimated_ctr) },
              { label: 'ROAS est.', value: suggestion.estimated_roas != null ? `${suggestion.estimated_roas.toFixed(1)}x` : '—' },
              { label: 'Views est.', value: fmt(suggestion.estimated_views) },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#7ba1d8' }}>{m.label}</p>
                <p className="text-lg font-bold" style={{ color: '#2659a5' }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Hook */}
          {suggestion.hook && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7ba1d8' }}>Hook (primeiros 3s)</p>
              <p className="text-sm font-semibold leading-snug" style={{ color: '#2659a5' }}>{suggestion.hook}</p>
            </div>
          )}

          {/* Cenário */}
          {suggestion.scenery && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7ba1d8' }}>Cenário</p>
              <p className="text-sm leading-relaxed" style={{ color: '#2659a5' }}>{suggestion.scenery}</p>
            </div>
          )}

          {/* Roteiro */}
          {suggestion.content_description && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7ba1d8' }}>Roteiro</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#2659a5' }}>{suggestion.content_description}</p>
            </div>
          )}

          {/* Briefing */}
          {suggestion.briefing && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7ba1d8' }}>Briefing completo</p>
              <div
                className="p-4 rounded-xl text-xs leading-relaxed whitespace-pre-wrap font-mono"
                style={{ background: '#f8fafc', border: '1px solid rgba(38,89,165,0.12)', color: '#2659a5' }}
              >
                {suggestion.briefing}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={copyBriefing}
              disabled={!suggestion.briefing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 cursor-pointer"
              style={{ padding: '8px 16px', borderRadius: 999, background: '#2659a5', color: '#ffffff' }}
            >
              {copied ? '✅ Copiado!' : '📋 Copiar Briefing (WhatsApp)'}
            </button>

            {onApprove && suggestion.status !== 'approved' && (
              <button
                onClick={() => { onApprove(); onClose() }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer"
                style={{ padding: '8px 16px', borderRadius: 999, background: '#ffffff', color: '#2659a5', border: '1px solid rgba(38,89,165,0.28)' }}
              >
                Aprovar
              </button>
            )}

            {onReject && (
              <button
                onClick={() => { onReject(); onClose() }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer"
                style={{ padding: '8px 16px', borderRadius: 999, background: 'transparent', color: '#7ba1d8', border: '1px solid transparent' }}
              >
                Rejeitar
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
