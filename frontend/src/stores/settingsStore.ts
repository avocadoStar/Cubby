import { create } from 'zustand'
import * as api from '../services/api'

interface SettingsStore {
  settings: Record<string, string>
  loading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (data: Record<string, string>) => Promise<void>
  testAI: () => Promise<{ ok: boolean; message?: string }>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {},
  loading: false,
  fetchSettings: async () => {
    set({ loading: true })
    const data = await api.getSettings()
    set({ settings: data.settings || data, loading: false })
  },
  updateSettings: async (data) => {
    await api.updateSettings(data)
    set((s) => ({ settings: { ...s.settings, ...data } }))
  },
  testAI: async () => {
    try {
      await api.testAIConnection()
      return { ok: true, message: '连接成功' }
    } catch (e: any) {
      return { ok: false, message: e.response?.data?.error || '连接失败' }
    }
  },
}))
