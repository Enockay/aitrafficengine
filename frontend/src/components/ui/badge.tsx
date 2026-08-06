import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium',
  {
    variants: {
      variant: {
        success: 'bg-accent-green/10 text-accent-green',
        warning: 'bg-accent-yellow/10 text-accent-yellow',
        error: 'bg-accent-red/10 text-accent-red',
        info: 'bg-accent-blue/10 text-accent-blue',
        neutral: 'bg-bg-tertiary text-text-secondary',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
