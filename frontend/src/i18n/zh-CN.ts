const strings = {
  // Sidebar
  'sidebar.title': '收藏夹',
  'sidebar.allBookmarks': '所有书签',
  'sidebar.searchPlaceholder': '搜索收藏夹',

  // BookmarkRow
  'bookmark.selectAria': '选择收藏夹',
  'bookmark.deleteAria': '删除收藏夹',

  // FolderRow
  'folder.selectAria': '选择文件夹',
  'folder.deleteAria': '删除文件夹',
  'folder.label': '文件夹',

  // Breadcrumb
  'breadcrumb.root': '收藏夹',

  // BatchActionBar
  'batch.deleting': '正在删除…',
  'batch.cancel': '取消',
  'batch.selected': '已选择 {count} 项',
  'batch.delete': '删除',

  // ContextMenu
  'context.edit': '编辑',
  'context.copyLink': '复制链接',
  'context.openInNewTab': '在新标签页中打开',
  'context.openInNewWindow': '在新窗口中打开',
  'context.delete': '删除',
  'context.rename': '重命名',

  // CreateFolderModal
  'createFolder.title': '新建文件夹',
  'createFolder.placeholder': '文件夹名称',
  'createFolder.ariaLabel': '文件夹名称',
  'createFolder.cancel': '取消',
  'createFolder.create': '创建',

  // EditBookmarkModal
  'editBookmark.title': '编辑书签',
  'editBookmark.titlePlaceholder': '名称',
  'editBookmark.urlPlaceholder': '网址',
  'editBookmark.cancel': '取消',
  'editBookmark.save': '保存',

  // RenameFolderModal
  'renameFolder.title': '重命名文件夹',
  'renameFolder.placeholder': '文件夹名称',
  'renameFolder.cancel': '取消',
  'renameFolder.save': '保存',

  // ErrorBoundary
  'error.title': '出了点问题',
  'error.back': '返回',
  'error.refresh': '刷新页面',

  // FontSizePopover
  'fontSize.title': '字体大小',
  'fontSize.small': '小',
  'fontSize.medium': '默认',
  'fontSize.large': '大',
  'fontSize.preview': '预览文本示例 Cubby',

  // ImportModal
  'import.title': '导入收藏夹',
  'import.selectFile': '选择浏览器导出的 HTML 文件',
  'import.supportedFormats': '支持 Chrome / Edge / Firefox 导出格式',
  'import.importing': '正在导入…',
  'import.done': '完成',
  'import.failed': '导入失败',

  // MainLayout
  'main.loading': '加载中...',

  // NotesPanel
  'notes.placeholder': '在这里添加笔记...',

  // Toolbar
  'toolbar.addBookmark': '添加书签',
  'toolbar.alreadyExists': '已存在',

  // Toast
  'toast.deleted': '已删除 "{title}"',
  'toast.undo': '撤销',

  // Sidebar
  'sidebar.newFolder': '新建文件夹',
  'sidebar.import': '导入',

  // LoginPage
  'login.title': '登录',
  'login.password': '密码',
  'login.submit': '登录',
  'login.wrongPassword': '密码错误',
} as const

export type StringKey = keyof typeof strings

export function t(key: StringKey, params?: Record<string, string | number>): string {
  let result: string = strings[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{${k}}`, String(v))
    }
  }
  return result
}

export default strings
