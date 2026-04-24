'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ContentSuggestion } from '@/lib/supabase/types'

interface LigarNoPlayModalProps {
  suggestion: ContentSuggestion & { origin_brand_name?: string; target_brand_name?: string }
  open: boolean
  onClose: () => void
  onMarkInPlay?: () => void
}

function buildPackageText(s: LigarNoPlayModalProps['suggestion']): string {
  const outputLabel = s.output_mode === 'image' ? '🖼️ Imagem' : '🎥 Vídeo'
  const mediaLine = s.output_mode === 'image'
    ? `🖼️ Imagem de referência: ${s.image_url ?? '[sem imagem]'}`
    : `🎥 Vídeo pronto: ${s.final_video_url ?? '[processando]'}
     🎙️ Áudio isolado: ${s.audio_url ?? '[sem áudio]'}`

  return `━━━━━━━━━━━━━━━━━━━━━━━━━
🎬 PACOTE DE PRODUÇÃO — ${s.name ?? 'Sugestão'}
━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 MARCA: ${s.target_brand_name ?? '—'}
📱 PLATAFORMA: ${s.platform?.toUpperCase() ?? '—'}
🏷️ PRODUTO: ${s.product ?? '—'}
🎨 OUTPUT: ${outputLabel}

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
${mediaLine}

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

  const packageText = buildPackageText(suggestion)

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ▶️ Ligar no Play
            <Badge variant="secondary">{suggestion.output_mode === 'image' ? '🖼️ Imagem' : '🎥 Vídeo'}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media preview */}
          {suggestion.output_mode === 'image' && suggestion.image_url && (
            <div className="rounded-lg overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={suggestion.image_url} alt="Imagem gerada" className="w-full max-h-64 object-contain bg-muted" />
            </div>
          )}
          {suggestion.output_mode === 'video' && suggestion.final_video_url && (
            <div className="rounded-lg overflow-hidden border">
              <video src={suggestion.final_video_url} controls className="w-full max-h-64" />
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

            {suggestion.output_mode === 'image' && suggestion.image_url && (
              <Button variant="outline" onClick={() => downloadFile(suggestion.image_url!, `${suggestion.name ?? 'imagem'}.png`)}>
                💾 Download PNG
              </Button>
            )}

            {suggestion.output_mode === 'video' && (
              <>
                {suggestion.final_video_url && (
                  <Button variant="outline" onClick={() => downloadFile(suggestion.final_video_url!, `${suggestion.name ?? 'video'}.mp4`)}>
                    💾 Download MP4
                  </Button>
                )}
                {suggestion.audio_url && (
                  <Button variant="outline" onClick={() => downloadFile(suggestion.audio_url!, `${suggestion.name ?? 'audio'}.mp3`)}>
                    🎙️ Download MP3
                  </Button>
                )}
              </>
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
