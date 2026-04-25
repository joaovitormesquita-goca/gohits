'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ContentSuggestion } from '@/lib/supabase/types'

interface LigarNoPlayModalProps {
  suggestion: ContentSuggestion & {
    origin_brand_name?: string
    target_brand_name?: string
    meta_ad_id?: string | null
    meta_adset_id?: string | null
    meta_status?: string | null
  }
  open: boolean
  onClose: () => void
  onMarkInPlay?: () => void
}

function buildPackageText(s: LigarNoPlayModalProps['suggestion']): string {
  return `━━━━━━━━━━━━━━━━━━━━━━━━━
🎬 PACOTE DE PRODUÇÃO — ${s.name ?? 'Sugestão'}
━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 MARCA: ${s.target_brand_name ?? '—'}
📱 PLATAFORMA: ${s.platform?.toUpperCase() ?? '—'}
🏷️ PRODUTO: ${s.product ?? '—'}
🎨 OUTPUT: 🖼️ Imagem

🪝 HOOK (primeiros 3s):
${s.hook ?? '—'}

🎨 CENÁRIO:
${s.scenery ?? '—'}

📖 ROTEIRO:
${s.content_description ?? '—'}

✍️ CAPTION:
${s.description ?? '—'}

📋 BRIEFING COMPLETO:
${s.briefing ?? '—'}

🎞️ MÍDIA PRONTA:
🖼️ Imagem de referência: ${s.image_url ?? '[sem imagem]'}

📊 IMPACTO ESTIMADO:
   • Score: ${s.estimated_impact_score?.toFixed(0) ?? '—'}/100
   • 👀 Views estimadas: ${s.estimated_views?.toLocaleString('pt-BR') ?? '—'}
   • CTR estimado: ${s.estimated_ctr ? (s.estimated_ctr * 100).toFixed(1) + '%' : '—'}
   • ROAS estimado: ${s.estimated_roas ? s.estimated_roas.toFixed(1) + 'x' : '—'}

🔗 HIT ORIGEM: (${s.origin_brand_name ?? '—'})
━━━━━━━━━━━━━━━━━━━━━━━━━`
}

export default function LigarNoPlayModal({
  suggestion,
  open,
  onClose,
  onMarkInPlay,
}: LigarNoPlayModalProps) {
  const [copied, setCopied] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<{
    ad_id: string
    adset_id: string
    created_new_adset: boolean
    ads_manager_url?: string
  } | null>(null)
  const [metaConfigured, setMetaConfigured] = useState<boolean | null>(null)

  const packageText = buildPackageText(suggestion)
  const metaStatus = (suggestion as { meta_status?: string | null }).meta_status ?? null

  useEffect(() => {
    if (!open) return
    fetch('/api/meta/status')
      .then((r) => r.json())
      .then((d: { configured: boolean }) => setMetaConfigured(d.configured))
      .catch(() => setMetaConfigured(false))
  }, [open])

  async function copyAll() {
    await navigator.clipboard.writeText(packageText)
    setCopied(true)
    toast.success('Pacote copiado para o clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadFile(url: string, filename: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
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
    } catch {
      toast.error('Falha de conexão ao publicar')
    } finally {
      setPublishing(false)
    }
  }

  const metaButtonDisabled = publishing || metaConfigured === false

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ▶️ Ligar no Play
            <Badge variant="secondary">🖼️ Imagem</Badge>
            {metaStatus === 'in_test' && (
              <Badge className="bg-blue-100 text-blue-800 text-xs">⏳ Em teste no Facebook</Badge>
            )}
            {metaStatus === 'result_available' && (
              <Badge className="bg-green-100 text-green-800 text-xs">✅ Resultado disponível</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image preview */}
          {suggestion.image_url && (
            <div className="rounded-lg overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={suggestion.image_url} alt="Imagem gerada" className="w-full max-h-64 object-contain bg-muted" />
            </div>
          )}

          {/* Meta Ads publish result */}
          {publishResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-green-800">✅ Ad publicado no Facebook Ads</p>
              <p className="text-green-700 text-xs mt-1">Ad ID: {publishResult.ad_id} · Adset ID: {publishResult.adset_id}</p>
              {publishResult.created_new_adset && (
                <p className="text-green-600 text-xs">Adset anterior estava cheio — novo adset criado automaticamente.</p>
              )}
              {publishResult.ads_manager_url && (
                <a
                  href={publishResult.ads_manager_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-blue-700 underline hover:text-blue-900"
                >
                  🔗 Ver no Ads Manager
                </a>
              )}
            </div>
          )}

          {/* Package text */}
          <div className="bg-muted rounded-lg p-4">
            <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{packageText}</pre>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={copyAll} className="flex-1 sm:flex-none">
              {copied ? '✅ Copiado!' : '📋 Copiar tudo'}
            </Button>

            {suggestion.image_url && (
              <Button variant="outline" onClick={() => downloadFile(suggestion.image_url!, `${suggestion.name ?? 'imagem'}.png`)}>
                💾 Download PNG
              </Button>
            )}

            {/* Publish to Meta Ads — only when image exists and not yet published */}
            {suggestion.image_url && !metaStatus && !publishResult && (
              <Button
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={metaButtonDisabled}
                title={metaConfigured === false ? 'Meta Ads não configurado — contate o admin' : undefined}
                onClick={publishToMeta}
              >
                {publishing ? '⏳ Publicando...' : '🚀 Publicar no Facebook Ads'}
              </Button>
            )}

            {onMarkInPlay && (
              <Button variant="default" className="ml-auto" onClick={onMarkInPlay}>
                ✅ Marcar in_play
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
