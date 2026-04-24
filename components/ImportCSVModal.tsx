'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { downloadTemplate, CSV_HEADERS } from '@/lib/csv/template'
import { validateHeaders, parseCSV } from '@/lib/csv/parser'
import type { ParsedHitRow } from '@/lib/csv/parser'

interface ImportCSVModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const PREVIEW_ROWS = 5

export default function ImportCSVModal({ open, onClose, onSuccess }: ImportCSVModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<ParsedHitRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFile(null)
    setPreviewRows([])
    setParseErrors([])
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0] ?? ''
      const headers = firstLine.split(',').map((h) => h.trim().toLowerCase())
      const missing = validateHeaders(headers)

      if (missing.length > 0) {
        setParseErrors([`Colunas obrigatórias ausentes: ${missing.join(', ')}`])
        setPreviewRows([])
        return
      }

      const { rows, errors } = parseCSV(text)
      setPreviewRows(rows.slice(0, PREVIEW_ROWS))
      setParseErrors(errors.slice(0, 5))
    }
    reader.readAsText(selected, 'UTF-8')
  }

  async function handleImport() {
    if (!file) return
    setImporting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import/hits', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao importar')
        return
      }

      const { imported, metrics_inserted, skipped, errors } = data
      toast.success(
        `${imported} hits importados, ${metrics_inserted} métricas inseridas${skipped > 0 ? `, ${skipped} puladas` : ''}`,
      )
      if (errors?.length > 0) {
        toast.warning(`${errors.length} avisos — veja o console para detalhes`)
        console.warn('Import errors:', errors)
      }

      handleClose()
      onSuccess()
    } catch {
      toast.error('Falha na conexão ao importar')
    } finally {
      setImporting(false)
    }
  }

  const canImport = previewRows.length > 0 && parseErrors.filter(e => e.startsWith('Colunas')).length === 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📥 Importar Hits via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1: Download template */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-sm">1. Baixe o template</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Preencha com seus hits e salve como CSV UTF-8
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              📄 Baixar template CSV
            </Button>
          </div>

          {/* Step 2: Upload */}
          <div className="space-y-2">
            <p className="font-medium text-sm">2. Selecione o arquivo CSV preenchido</p>
            <label className="flex items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="text-2xl">📂</span>
              <div className="text-center">
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Clique para selecionar ou arraste o arquivo CSV</p>
                )}
              </div>
            </label>
          </div>

          {/* Validation errors */}
          {parseErrors.length > 0 && (
            <div className="space-y-1">
              {parseErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded p-2">
                  <span>⚠️</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">
                  3. Preview — {PREVIEW_ROWS} primeiras linhas
                </p>
                <Badge variant="secondary">{previewRows.length} de {PREVIEW_ROWS} mostradas</Badge>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(['brand_slug', 'hook', 'platform', 'product', 'date', 'views', 'roas'] as const).map((col) => (
                        <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs"><Badge variant="outline">{row.brand_slug}</Badge></TableCell>
                        <TableCell className="text-xs max-w-48 truncate">{row.hook}</TableCell>
                        <TableCell className="text-xs">{row.platform}</TableCell>
                        <TableCell className="text-xs max-w-32 truncate">{row.product ?? '—'}</TableCell>
                        <TableCell className="text-xs">{row.date}</TableCell>
                        <TableCell className="text-xs">{row.views?.toLocaleString('pt-BR') ?? '—'}</TableCell>
                        <TableCell className="text-xs">{row.roas?.toFixed(1) ?? '—'}x</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={importing} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            {file && (
              <Button variant="ghost" size="sm" onClick={reset} disabled={importing}>
                Trocar arquivo
              </Button>
            )}
            <Button
              onClick={handleImport}
              disabled={!canImport || importing}
              className="ml-auto"
            >
              {importing ? 'Importando...' : `✅ Importar ${previewRows.length > 0 ? 'CSV' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { CSV_HEADERS }
