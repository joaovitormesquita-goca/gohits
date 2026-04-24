'use client'

import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface AlertasClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alerts: any[]
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'agora'
  if (hours < 24) return `${hours}h atrás`
  return `${Math.floor(hours / 24)}d atrás`
}

export default function AlertasClient({ alerts }: AlertasClientProps) {
  async function copyWhatsApp(message: string) {
    await navigator.clipboard.writeText(message)
    toast.success('Mensagem copiada! Cole no WhatsApp.')
  }

  if (alerts.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Alertas</h1>
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Nenhum alerta ainda</p>
          <p className="text-sm mt-1">Alertas aparecem automaticamente quando um hit é identificado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alertas</h1>
        <p className="text-muted-foreground text-sm">{alerts.length} alertas</p>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={alert.type === 'hit' ? 'default' : 'secondary'}>
                      {alert.type === 'hit' ? '🔥 Hit' : '📊 Relatório'}
                    </Badge>
                    {alert.brands && (
                      <Badge variant="outline">{alert.brands.name}</Badge>
                    )}
                    {alert.contents?.platform && (
                      <Badge variant="outline" className="text-xs">{alert.contents.platform.toUpperCase()}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatRelativeTime(alert.created_at)}
                    </span>
                  </div>

                  {alert.contents && (
                    <p className="text-sm font-medium">{alert.contents.name ?? alert.contents.hook}</p>
                  )}

                  <div className="bg-muted rounded p-3">
                    <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed line-clamp-6">
                      {alert.message_formatted}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyWhatsApp(alert.message_formatted)}
                >
                  📱 Copiar para WhatsApp
                </Button>
                {alert.sent_whatsapp && (
                  <Badge variant="secondary" className="text-xs self-center">✓ Enviado</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
