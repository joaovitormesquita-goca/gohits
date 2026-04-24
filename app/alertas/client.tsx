'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'

interface AlertasClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alerts: any[]
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'agora'
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(hours / 24)}d`
}

const TYPE_LABELS: Record<string, string> = {
  hit: 'Hit',
  daily_report: 'Relatório',
}

export default function AlertasClient({ alerts }: AlertasClientProps) {
  const [filterType, setFilterType] = useState<string>('all')
  const [filterBrand, setFilterBrand] = useState<string>('all')

  const brands = useMemo(() => {
    const seen = new Set<string>()
    const result: { slug: string; name: string }[] = []
    for (const a of alerts) {
      if (a.brands && !seen.has(a.brands.slug)) {
        seen.add(a.brands.slug)
        result.push({ slug: a.brands.slug, name: a.brands.name })
      }
    }
    return result
  }, [alerts])

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filterType !== 'all' && a.type !== filterType) return false
      if (filterBrand !== 'all' && a.brands?.slug !== filterBrand) return false
      return true
    })
  }, [alerts, filterType, filterBrand])

  async function copyWhatsApp(message: string) {
    await navigator.clipboard.writeText(message)
    toast.success('Mensagem copiada! Cole no WhatsApp.')
  }

  const typeCounts = useMemo(() => ({
    all: alerts.length,
    hit: alerts.filter((a) => a.type === 'hit').length,
    daily_report: alerts.filter((a) => a.type === 'daily_report').length,
  }), [alerts])

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: '#7ba1d8' }}>
            Disparados automaticamente
          </p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#2659a5', letterSpacing: '-0.015em' }}>
            Alertas
          </h1>
          <p className="text-sm mt-1.5" style={{ color: '#7ba1d8' }}>
            Alertas WhatsApp prontos para copiar e distribuir ao time.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Type filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'hit', 'daily_report'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-all"
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                background: filterType === t ? '#2659a5' : '#eaf1fa',
                color: filterType === t ? '#ffffff' : '#7ba1d8',
              }}
            >
              {t === 'all' ? 'Todos' : TYPE_LABELS[t]}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: filterType === t ? 'rgba(255,255,255,0.2)' : 'rgba(38,89,165,0.12)',
                  color: filterType === t ? '#ffffff' : '#7ba1d8',
                  fontWeight: 700,
                }}
              >
                {typeCounts[t]}
              </span>
            </button>
          ))}
        </div>

        {/* Brand filter */}
        {brands.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterBrand('all')}
              className="inline-flex items-center text-xs font-medium transition-all"
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                background: filterBrand === 'all' ? '#eaf1fa' : 'transparent',
                color: '#7ba1d8',
                border: '1px solid rgba(38,89,165,0.14)',
              }}
            >
              Todas as marcas
            </button>
            {brands.map((b) => (
              <button
                key={b.slug}
                onClick={() => setFilterBrand(b.slug)}
                className="inline-flex items-center text-xs font-medium transition-all"
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: filterBrand === b.slug ? '#d7d900' : 'transparent',
                  color: filterBrand === b.slug ? '#2659a5' : '#7ba1d8',
                  border: '1px solid rgba(38,89,165,0.14)',
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#7ba1d8' }}>
          <p className="text-lg font-medium">Nenhum alerta encontrado</p>
          <p className="text-sm mt-1">Alertas aparecem automaticamente quando um hit é identificado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((alert) => (
            <AlertaCard key={alert.id} alert={alert} onCopy={copyWhatsApp} />
          ))}
        </div>
      )}
    </div>
  )
}

function AlertaCard({
  alert,
  onCopy,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alert: any
  onCopy: (msg: string) => void
}) {
  const isHit = alert.type === 'hit'
  const relTime = formatRelativeTime(alert.created_at)

  return (
    <div
      className="overflow-hidden"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(38,89,165,0.14)',
        borderRadius: 22,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-4 flex-wrap px-5 py-4"
        style={{ borderBottom: '1px solid rgba(38,89,165,0.14)' }}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
            style={isHit
              ? { background: '#2659a5', color: '#d7d900' }
              : { background: '#eaf1fa', color: '#2659a5' }
            }
          >
            {isHit ? 'Hit' : 'Relatório'}
          </span>

          {alert.brands && (
            <span className="text-sm font-semibold" style={{ color: '#2659a5' }}>
              {alert.brands.name}
              {alert.contents && (
                <span className="font-normal" style={{ color: '#7ba1d8' }}>
                  {' '}— {alert.contents.name ?? alert.contents.hook?.substring(0, 50)}
                </span>
              )}
            </span>
          )}

          {alert.contents?.platform && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: '#eaf1fa', color: '#2659a5' }}
            >
              {alert.contents.platform}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: '#7ba1d8' }}>{relTime}</span>
          {alert.sent_whatsapp && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: '#eaf1fa', color: '#7ba1d8' }}
            >
              Enviado
            </span>
          )}
          <button
            onClick={() => onCopy(alert.message_formatted)}
            className="text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: '#ffffff',
              color: '#2659a5',
              border: '1px solid rgba(38,89,165,0.28)',
            }}
          >
            Copiar WhatsApp
          </button>
        </div>
      </div>

      {/* WhatsApp message block */}
      {alert.message_formatted && (
        <div className="px-5 py-4">
          <div
            className="text-sm leading-relaxed font-medium whitespace-pre-wrap"
            style={{
              background: '#2659a5',
              color: '#ffffff',
              borderRadius: 14,
              padding: '16px 18px',
              borderLeft: '4px solid #d7d900',
              fontFamily: 'inherit',
            }}
          >
            {alert.message_formatted}
          </div>
        </div>
      )}

      {/* Stats footer */}
      {(alert.brands || alert.contents) && (
        <div
          className="flex items-center gap-5 flex-wrap px-5 py-3.5"
          style={{
            borderTop: '1px solid rgba(38,89,165,0.14)',
            background: '#fbf2e7',
          }}
        >
          <span className="text-xs font-medium" style={{ color: '#7ba1d8' }}>
            Tipo: <strong style={{ color: '#2659a5' }}>{isHit ? 'Hit' : 'Relatório'}</strong>
          </span>
          {alert.brands && (
            <span className="text-xs font-medium" style={{ color: '#7ba1d8' }}>
              Marca: <strong style={{ color: '#2659a5' }}>{alert.brands.name}</strong>
            </span>
          )}
          {alert.contents?.platform && (
            <span className="text-xs font-medium" style={{ color: '#7ba1d8' }}>
              Plataforma: <strong style={{ color: '#2659a5' }}>{alert.contents.platform}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
