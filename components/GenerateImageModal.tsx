'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface GenerateImageModalProps {
  suggestionId: string
  hook: string
  open: boolean
  onClose: () => void
  onSuccess: (imageUrl: string) => void
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES = 3

interface PreparedFile {
  file: File
  previewUrl: string
}

export default function GenerateImageModal({
  suggestionId,
  hook,
  open,
  onClose,
  onSuccess,
}: GenerateImageModalProps) {
  const [files, setFiles] = useState<PreparedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])

  // Revoke object URLs on unmount (parent unmounts modal when imageModal becomes null)
  useEffect(
    () => () => {
      filesRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    },
    [],
  )

  function validateAndAdd(incoming: File[]) {
    const errors: string[] = []
    const accepted: File[] = []

    for (const f of incoming) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        errors.push(`${f.name}: tipo não suportado (use PNG, JPG ou WEBP)`)
        continue
      }
      if (f.size > MAX_FILE_SIZE) {
        errors.push(`${f.name}: arquivo excede 10MB`)
        continue
      }
      accepted.push(f)
    }

    setFiles((prev) => {
      const remainingSlots = MAX_FILES - prev.length
      if (accepted.length > remainingSlots) {
        errors.push(`Máximo de ${MAX_FILES} imagens — ${accepted.length - remainingSlots} ignorada(s)`)
      }
      const next = accepted.slice(0, remainingSlots).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      return [...prev, ...next]
    })

    errors.forEach((e) => toast.error(e))
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (submitting) return
    const dropped = Array.from(e.dataTransfer.files ?? [])
    if (dropped.length) validateAndAdd(dropped)
  }

  async function handleSubmit() {
    if (files.length === 0 || submitting) return
    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('suggestionId', suggestionId)
      files.forEach((p) => formData.append('references', p.file))

      const res = await fetch('/api/image', { method: 'POST', body: formData })
      const data = (await res.json().catch(() => ({}))) as { image_url?: string; error?: string }

      if (!res.ok) {
        toast.error(data.error ?? 'Falha ao gerar imagem')
        setSubmitting(false)
        return
      }
      if (!data.image_url) {
        toast.error('Resposta inválida do servidor')
        setSubmitting(false)
        return
      }

      toast.success('Imagem gerada!')
      onSuccess(data.image_url)
      onClose()
    } catch (err) {
      console.error('Image generation request failed:', err)
      toast.error('Erro de rede ao gerar imagem')
      setSubmitting(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (submitting) return
    if (!next) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: '#2659a5' }}>Gerar Imagem</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="p-3 rounded-xl" style={{ background: '#eaf1fa' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#7ba1d8' }}>
              Hook que será sobreposto
            </p>
            <p className="text-sm font-semibold leading-snug" style={{ color: '#2659a5' }}>
              {hook}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#7ba1d8' }}>
              Imagens de referência ({files.length}/{MAX_FILES})
            </p>

            <div
              role="button"
              tabIndex={0}
              onClick={() => !submitting && inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (!submitting) setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className="rounded-xl text-center transition-colors cursor-pointer"
              style={{
                padding: '24px 16px',
                background: isDragging ? '#eaf1fa' : '#f8fafc',
                border: `2px dashed ${isDragging ? '#2659a5' : 'rgba(38,89,165,0.28)'}`,
                opacity: submitting || files.length >= MAX_FILES ? 0.5 : 1,
                pointerEvents: files.length >= MAX_FILES ? 'none' : 'auto',
              }}
            >
              <p className="text-sm font-medium" style={{ color: '#2659a5' }}>
                {files.length >= MAX_FILES
                  ? 'Limite de 3 imagens atingido'
                  : 'Clique ou arraste imagens do produto'}
              </p>
              <p className="text-xs mt-1" style={{ color: '#7ba1d8' }}>
                PNG, JPG ou WEBP — até 10MB cada
              </p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? [])
                  if (picked.length) validateAndAdd(picked)
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {files.map((p, i) => (
                <div
                  key={p.previewUrl}
                  className="relative rounded-xl overflow-hidden"
                  style={{ aspectRatio: '1', border: '1px solid rgba(38,89,165,0.14)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt={p.file.name}
                    className="w-full h-full object-cover"
                  />
                  {!submitting && (
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-opacity hover:opacity-80"
                      style={{ background: 'rgba(38,89,165,0.85)', color: '#ffffff' }}
                      aria-label={`Remover ${p.file.name}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={files.length === 0 || submitting}
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{ padding: '8px 16px', borderRadius: 999, background: '#2659a5', color: '#ffffff' }}
            >
              {submitting ? 'Gerando…' : 'Gerar imagem'}
            </button>
            <button
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{ padding: '8px 16px', borderRadius: 999, background: 'transparent', color: '#7ba1d8' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
