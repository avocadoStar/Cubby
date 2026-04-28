import { create } from 'zustand'
import * as api from '../services/api'
import { getErrorMessage } from '../utils/errors'

interface SettingsStore {
  settings: Record<string, string>
  loading: boolean
  error: string | null
  fetchSettings: () => Promise<Record<string, string>>
  updateSettings: (data: Record<string, string>) => Promise<void>
  testAI: () => Promise<{ ok: boolean; message: string }>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {},
  loading: false,
  error: null,
  fetchSettings: async () => {
    set({ loading: true, error: null })

    try {
      const data = await api.getSettings()
      set({ settings: data.settings, loading: false })
      return data.settings
    } catch (error: unknown) {
      const message = getErrorMessage(error, '加载设置失败')
      set({ loading: false, error: message })
      throw error
    }
  },
  updateSettings: async (data) => {
    await api.updateSettings(data)
    set((state) => ({ settings: { ...state.settings, ...data } }))
  },
  testAI: async () => {
    try {
      const result = await api.testAIConnection()
      return { ok: result.ok, message: result.message }
    } catch (error: unknown) {
      return { ok: false, message: getErrorMessage(error, '连接测试失败') }
    }
  },
}))
