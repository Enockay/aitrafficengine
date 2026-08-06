import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import api from '@/lib/api'
import type { Flyer, FlyerListResponse, GenerateFlyerInput } from '@/types/flyer'

export interface FlyersFilters {
  page?: number
  limit?: number
  page_id?: string
}

export function useFlyersQuery(filters: FlyersFilters) {
  return useQuery({
    queryKey: ['flyers', filters],
    queryFn: async () => {
      const { data } = await api.get<FlyerListResponse>('/flyers', { params: filters })
      return data
    },
    staleTime: 60 * 1000,
  })
}

export function useGenerateFlyerPrompt() {
  return useMutation({
    mutationFn: async (page_id: string) => {
      const { data } = await api.post<{ image_prompt: string }>('/flyers/generate-prompt', { page_id })
      return data.image_prompt
    },
  })
}

export function useGenerateFlyer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GenerateFlyerInput) => {
      const { data } = await api.post<Flyer>('/flyers/generate', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flyers'] })
    },
  })
}

export function useDeleteFlyer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/flyers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flyers'] })
    },
  })
}
