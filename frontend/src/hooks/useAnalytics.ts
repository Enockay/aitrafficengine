import { useMutation, useQuery } from '@tanstack/react-query'

import api from '@/lib/api'
import type { AnalyticsSummary } from '@/types/analytics'

export function useAnalyticsSummary(days = 30) {
  return useQuery({
    queryKey: ['analytics', 'summary', days],
    queryFn: async () => {
      const { data } = await api.get<AnalyticsSummary>('/analytics/summary', { params: { days } })
      return data
    },
    staleTime: 30 * 1000,
  })
}

export function useExportAnalytics() {
  return useMutation({
    mutationFn: async ({ format, days }: { format: 'csv' | 'pdf'; days: number }) => {
      const { data } = await api.get('/analytics/export', {
        params: { format, days },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(data as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
  })
}
