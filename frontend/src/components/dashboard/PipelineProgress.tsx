import { Link } from 'react-router-dom'
import { CheckCircle2, Circle } from 'lucide-react'

import { Card } from '@/components/ui/card'

export interface PipelineStep {
  key: string
  label: string
  hint: string
  done: boolean
  to: string
}

interface PipelineProgressProps {
  steps: PipelineStep[]
}

export function PipelineProgress({ steps }: PipelineProgressProps) {
  if (steps.every((s) => s.done)) return null

  const nextIndex = steps.findIndex((s) => !s.done)

  return (
    <Card className="mb-6 p-5">
      <p className="mb-4 text-body-sm font-medium text-text-primary">Getting started</p>
      <div className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
        {steps.map((step, i) => {
          const isNext = i === nextIndex
          const isLast = i === steps.length - 1
          return (
            <div key={step.key} className="flex flex-1 sm:flex-col">
              <div className="flex items-center sm:w-full">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    step.done
                      ? 'text-accent-green'
                      : isNext
                        ? 'text-accent-red'
                        : 'text-text-muted'
                  }`}
                >
                  {step.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>
                {!isLast && (
                  <div
                    className={`mx-1 h-px flex-1 sm:mx-0 sm:my-1.5 sm:h-1 sm:w-full ${
                      step.done ? 'bg-accent-green/40' : 'bg-border-default'
                    }`}
                  />
                )}
              </div>
              <div className="py-2 pr-3 sm:py-0 sm:pr-4">
                {isNext ? (
                  <Link to={step.to} className="text-body-sm font-medium text-accent-red hover:underline">
                    {step.label}
                  </Link>
                ) : (
                  <p className={`text-body-sm font-medium ${step.done ? 'text-text-primary' : 'text-text-muted'}`}>
                    {step.label}
                  </p>
                )}
                <p className="mt-0.5 text-caption text-text-muted">{step.hint}</p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
