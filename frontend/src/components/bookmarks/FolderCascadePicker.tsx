import { useMemo } from 'react'
import type { Folder } from '../../types'
import { Icon } from '../ui/Icon'

type FolderCascadePickerProps = {
  folders: Folder[]
  helper?: string
  label?: string
  onChange: (folderId: string) => void
  value: string
}

type FolderColumn = {
  folders: Folder[]
  label: string
}

function findFolderPath(folders: Folder[], targetId: string): Folder[] {
  for (const folder of folders) {
    if (folder.id === targetId) {
      return [folder]
    }

    const childPath = findFolderPath(folder.children ?? [], targetId)
    if (childPath.length > 0) {
      return [folder, ...childPath]
    }
  }

  return []
}

function buildColumns(folders: Folder[], selectedPath: Folder[]): FolderColumn[] {
  const columns: FolderColumn[] = [{ folders, label: '全部文件夹' }]
  let currentLevel = folders

  for (const folder of selectedPath) {
    const matched = currentLevel.find((item) => item.id === folder.id)
    if (!matched || !matched.children?.length) {
      break
    }

    columns.push({
      folders: matched.children,
      label: matched.name,
    })
    currentLevel = matched.children
  }

  return columns
}

export function FolderCascadePicker({
  folders,
  helper,
  label = '归档位置',
  onChange,
  value,
}: FolderCascadePickerProps) {
  const selectedPath = useMemo(() => (value ? findFolderPath(folders, value) : []), [folders, value])
  const columns = useMemo(() => buildColumns(folders, selectedPath), [folders, selectedPath])
  const selectedPathIds = useMemo(() => new Set(selectedPath.map((folder) => folder.id)), [selectedPath])

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-[var(--color-text)]">{label}</span>
        {value ? (
          <span className="text-[12px] leading-4 text-[var(--color-text-secondary)]">
            {selectedPath.map((folder) => folder.name).join(' / ')}
          </span>
        ) : null}
      </div>

      <div className="folder-cascade-shell">
        <div className="folder-cascade-head">
          <button
            className={`folder-cascade-standalone ${value === '' ? 'folder-cascade-option-active' : ''}`}
            onClick={() => onChange('')}
            type="button"
          >
            <Icon className="text-[13px]" name="folder" />
            <span>未分类</span>
          </button>
        </div>

        {folders.length > 0 ? (
          <div className="folder-cascade-columns">
            {columns.map((column, columnIndex) => (
              <div className="folder-cascade-column" key={`${column.label}-${columnIndex}`}>
                <div className="folder-cascade-column-header">{column.label}</div>
                <div className="folder-cascade-column-body">
                  {column.folders.map((folder) => {
                    const isSelected = value === folder.id
                    const isOnPath = selectedPathIds.has(folder.id)
                    const hasChildren = Boolean(folder.children?.length)

                    return (
                      <button
                        className={`folder-cascade-option ${
                          isSelected
                            ? 'folder-cascade-option-active'
                            : isOnPath
                              ? 'folder-cascade-option-path'
                              : ''
                        }`}
                        key={folder.id}
                        onClick={() => onChange(folder.id)}
                        type="button"
                      >
                        <span className="min-w-0 truncate text-left">{folder.name}</span>
                        {hasChildren ? <Icon className="shrink-0 -rotate-90 text-[12px]" name="chevron-down" /> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="folder-cascade-empty">还没有文件夹，先保存到未分类也可以。</div>
        )}
      </div>

      {helper ? <p className="text-[12px] leading-5 text-[var(--color-text-secondary)]">{helper}</p> : null}
    </div>
  )
}
