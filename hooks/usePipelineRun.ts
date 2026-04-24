'use client'

import { useState, useCallback, useRef } from 'react'
import type { ContentSuggestion } from '@/lib/supabase/types'

type PipelineStatus = 'idle' | 'running' | 'done' | 'not_replicable' | 'error'

interface UsePipelineRunResult {
  status: PipelineStatus
  suggestion: ContentSuggestion | null
  error: string | null
  startRun: (originContentId: string, targetBrandId: string, outputMode: 'image' | 'video') => Promise<void>
  reset: () => void
}

export function usePipelineRun(): UsePipelineRunResult {
  const [status, setStatus] = useState<PipelineStatus>('idle')
  const [suggestion, setSuggestion] = useState<ContentSuggestion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const startRun = useCallback(
    async (originContentId: string, targetBrandId: string, outputMode: 'image' | 'video') => {
      setStatus('running')
      setSuggestion(null)
      setError(null)
      stopPolling()

      try {
        const res = await fetch('/api/pipeline/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originContentId, targetBrandId, outputMode }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error ?? 'Pipeline failed')
        }

        if (data.status === 'not_replicable') {
          setStatus('not_replicable')
          return
        }

        if (data.status === 'done') {
          setStatus('done')
          return
        }

        // Video: poll for completion
        if (data.suggestionId && outputMode === 'video') {
          const id = data.suggestionId
          pollingRef.current = setInterval(async () => {
            try {
              const pollRes = await fetch(`/api/pipeline/status/${id}`)
              const pollData = await pollRes.json()

              if (pollData.status !== 'draft') {
                // Still processing or error — keep polling
                if (pollData.suggestion) setSuggestion(pollData.suggestion as ContentSuggestion)
              }

              if (pollData.status === 'draft' && pollData.suggestion?.final_video_url) {
                setSuggestion(pollData.suggestion as ContentSuggestion)
                setStatus('done')
                stopPolling()
              }
            } catch {
              // Network error — keep polling
            }
          }, 3000)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStatus('error')
      }
    },
    [stopPolling],
  )

  const reset = useCallback(() => {
    stopPolling()
    setStatus('idle')
    setSuggestion(null)
    setError(null)
  }, [stopPolling])

  return { status, suggestion, error, startRun, reset }
}
