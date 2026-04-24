'use client'

interface HitInsights {
  content_id: string
  score: number
  bullets: {
    porque_funciona: string[]
    marca_destino: string[]
    alertas: string[]
  }
  is_emergente: boolean
  marca_destino_recomendada: 'apice' | 'rituaria' | 'gocase' | null
}

interface HitInsightsCardProps {
  insights: HitInsights
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-green-100 text-green-800 border-green-200'
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

const BRAND_LABEL: Record<string, string> = {
  apice: 'Ápice',
  rituaria: 'Rituaria',
  gocase: 'Gocase',
}

export default function HitInsightsCard({ insights }: HitInsightsCardProps) {
  const { score, bullets, is_emergente, marca_destino_recomendada } = insights

  return (
    <div className="mt-2 rounded-lg border bg-background p-3 space-y-2 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border font-semibold text-xs ${scoreColor(score)}`}>
          Score {score}/100
        </span>
        {is_emergente && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-semibold text-xs">
            🔥 Hit Emergente
          </span>
        )}
        {marca_destino_recomendada && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-xs">
            🎯 {BRAND_LABEL[marca_destino_recomendada] ?? marca_destino_recomendada}
          </span>
        )}
      </div>

      {bullets.porque_funciona.length > 0 && (
        <div>
          <p className="font-semibold text-muted-foreground mb-1">⚡ Por que funciona</p>
          <ul className="space-y-0.5">
            {bullets.porque_funciona.map((b, i) => (
              <li key={i} className="flex gap-1"><span className="text-muted-foreground">·</span>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {bullets.marca_destino.length > 0 && (
        <div>
          <p className="font-semibold text-muted-foreground mb-1">🎯 Marca destino</p>
          <ul className="space-y-0.5">
            {bullets.marca_destino.map((b, i) => (
              <li key={i} className="flex gap-1"><span className="text-muted-foreground">·</span>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {bullets.alertas.length > 0 && (
        <div>
          <p className="font-semibold text-orange-600 mb-1">🚨 Alerta</p>
          <ul className="space-y-0.5">
            {bullets.alertas.map((b, i) => (
              <li key={i} className="flex gap-1 text-orange-700"><span>·</span>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export type { HitInsights }
