import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { Card } from '@/components/ui/card'
import type { MetricCard } from '@/types/dashboard'

interface DashboardMetricCardProps {
  label: string
  metric: MetricCard
  format?: (value: number) => string
}

export function DashboardMetricCard({ label, metric, format }: DashboardMetricCardProps) {
  const sparklineData = metric.sparkline.map((value, i) => ({ i, value }))
  const delta = metric.delta_pct

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-metric-label uppercase text-text-muted">{label}</p>
          <p className="mt-1 text-metric-lg text-text-primary">
            {format ? format(metric.value) : metric.value}
          </p>
        </div>
        {metric.sparkline.some((v) => v > 0) && (
          <div className="h-10 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="rgb(var(--chart-1))"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1">
        {delta === null ? (
          <span className="flex items-center gap-1 text-caption text-text-muted">
            <Minus size={12} /> No change data
          </span>
        ) : delta > 0 ? (
          <span className="flex items-center gap-1 text-caption text-accent-green">
            <TrendingUp size={12} /> +{delta}% this week
          </span>
        ) : delta < 0 ? (
          <span className="flex items-center gap-1 text-caption text-accent-red">
            <TrendingDown size={12} /> {delta}% this week
          </span>
        ) : (
          <span className="flex items-center gap-1 text-caption text-text-muted">
            <Minus size={12} /> No change
          </span>
        )}
      </div>
    </Card>
  )
}
