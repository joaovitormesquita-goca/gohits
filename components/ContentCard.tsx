'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Content, ContentSuggestion, ContentMetrics } from '@/lib/supabase/types'
import { Eye, TrendingUp, DollarSign, BarChart2, Users, Banknote } from 'lucide-react'

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
}: ContentCardProps) {
  const item = suggestion ?? content
  const metrics = content?.content_metrics?.[0]

  const hook = suggestion?.hook ?? content?.hook
  const product = suggestion?.product ?? content?.product
  const platform = suggestion?.platform ?? content?.platform
  const score = suggestion?.estimated_impact_score
  const imageUrl = suggestion?.image_url ?? content?.image_url

  const isNotReplicable = suggestion?.status === 'not_replicable' || suggestion?.is_replicable === false
  const outputMode = suggestion?.output_mode

  if (!item) return null

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {imageUrl && (
        <div className="relative h-40 bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={hook ?? ''} className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2 flex gap-1">
            {platform && <Badge variant="secondary" className="text-xs">{platform.toUpperCase()}</Badge>}
            {showOutputMode && outputMode && (
              <Badge variant="outline" className="text-xs bg-background/80">
                {outputMode === 'image' ? '🖼️ Imagem' : '🎥 Vídeo'}
              </Badge>
            )}
          </div>
          {isNotReplicable && (
            <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
              <Badge variant="destructive" className="text-sm font-bold">NÃO REPLICÁVEL</Badge>
            </div>
          )}
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {!imageUrl && (
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {platform && <Badge variant="secondary" className="text-xs">{platform.toUpperCase()}</Badge>}
              {showOutputMode && outputMode && (
                <Badge variant="outline" className="text-xs">
                  {outputMode === 'image' ? '🖼️ Imagem' : '🎥 Vídeo'}
                </Badge>
              )}
            </div>
            {isNotReplicable && <Badge variant="destructive" className="text-xs">NÃO REPLICÁVEL</Badge>}
          </div>
        )}

        <div>
          <p className="font-medium text-sm leading-snug line-clamp-2">
            {hook ?? '—'}
          </p>
          {product && (
            <p className="text-xs text-muted-foreground mt-1">{product}</p>
          )}
          {content?.creator && (
            <p className="text-xs text-muted-foreground">{content.creator}</p>
          )}
        </div>

        {showMetrics && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
              <Eye className="h-3 w-3 mb-1 text-muted-foreground" />
              <span className="font-semibold">{fmt(metrics?.views ?? suggestion?.estimated_views)}</span>
              <span className="text-muted-foreground">Views</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
              <TrendingUp className="h-3 w-3 mb-1 text-muted-foreground" />
              <span className="font-semibold">{fmtPct(metrics?.ctr ?? suggestion?.estimated_ctr)}</span>
              <span className="text-muted-foreground">CTR</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
              <DollarSign className="h-3 w-3 mb-1 text-muted-foreground" />
              <span className="font-semibold">{metrics?.roas?.toFixed(1) ?? suggestion?.estimated_roas?.toFixed(1) ?? '—'}x</span>
              <span className="text-muted-foreground">ROAS</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
              <BarChart2 className="h-3 w-3 mb-1 text-muted-foreground" />
              <span className="font-semibold">{fmt(metrics?.impressions)}</span>
              <span className="text-muted-foreground">Impress.</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
              <Users className="h-3 w-3 mb-1 text-muted-foreground" />
              <span className="font-semibold">{fmtPct(metrics?.engagement_rate)}</span>
              <span className="text-muted-foreground">Engaj.</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
              <Banknote className="h-3 w-3 mb-1 text-muted-foreground" />
              <span className="font-semibold">R${fmt(metrics?.spend)}</span>
              <span className="text-muted-foreground">Spend</span>
            </div>
          </div>
        )}

        {score != null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Score de impacto</span>
              <span className="font-semibold">{score.toFixed(0)}/100</span>
            </div>
            <Progress value={score} className="h-1.5" />
          </div>
        )}

        {isNotReplicable && suggestion?.replicability_reason && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-destructive pl-2">
            {suggestion.replicability_reason}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          {onViewOrigin && (
            <Button variant="outline" size="sm" className="text-xs" onClick={onViewOrigin}>
              Ver origem
            </Button>
          )}
          {onApprove && !isNotReplicable && (
            <Button variant="outline" size="sm" className="text-xs" onClick={onApprove}>
              Aprovar
            </Button>
          )}
          {onReject && !isNotReplicable && (
            <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={onReject}>
              Rejeitar
            </Button>
          )}
          {onGenerate && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => onGenerate('image')}>
              🖼️ Gerar
            </Button>
          )}
          {onLigarNoPlay && !isNotReplicable && (
            <Button size="sm" className="text-xs ml-auto" onClick={onLigarNoPlay}>
              ▶️ Ligar no Play
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
