import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../services/api'
import { getErrorMessage } from '../utils/errors'

const settingsQueryKey = ['settings'] as const

export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => api.getSettings(),
  })
}

export function useSettingsMutations() {
  const queryClient = useQueryClient()

  return {
    updateSettings: useMutation({
      mutationFn: (data: Record<string, string>) => api.updateSettings(data),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: settingsQueryKey })
      },
    }),
    testAI: useMutation({
      mutationFn: async () => {
        try {
          return await api.testAIConnection()
        } catch (error: unknown) {
          return { ok: false, message: getErrorMessage(error, '连接测试失败') }
        }
      },
    }),
  }
}
