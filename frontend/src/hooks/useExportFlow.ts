import { api } from '../services/api'
import { useToastStore } from '../stores/toastStore'

export async function exportBookmarks(): Promise<boolean> {
  try {
    const blob = await api.exportBookmarks()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bookmarks.html'
    a.click()
    URL.revokeObjectURL(url)
    return true
  } catch (e) {
    useToastStore.getState().show({
      message: e instanceof Error && e.message ? e.message : '导出失败',
    })
    return false
  }
}
