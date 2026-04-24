'use client'

import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type StepStatus = 'idle' | 'loading' | 'done' | 'error'

interface PipelineProgressProps {
  steps: { label: string; status: StepStatus }[]
}

export default function PipelineProgress({ steps }: PipelineProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          {step.status === 'idle' && <Circle className="h-4 w-4 text-muted-foreground" />}
          {step.status === 'loading' && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
          {step.status === 'done' && <CheckCircle className="h-4 w-4 text-green-500" />}
          {step.status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
          <span className={cn('text-xs', step.status === 'idle' && 'text-muted-foreground')}>
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="text-muted-foreground">→</span>}
        </div>
      ))}
    </div>
  )
}
