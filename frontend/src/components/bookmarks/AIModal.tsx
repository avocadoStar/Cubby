import { useMemo, useState } from 'react'
import type { AIPlan, AITitleCleanupChange } from '../../types'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { StatePanel } from '../ui/StatePanel'
import { Surface } from '../ui/Surface'

type AIModalProps = {
  actionableFolderId: string | null
  cleanedTitles: AITitleCleanupChange[]
  errorMessage: string | null
  loading: boolean
  loadingMessage: string
  onApply: (plan: AIPlan) => void
  onClose: () => void
  onRetry: () => void
  open: boolean
  plans: AIPlan[]
}

type DraggingItem = {
  folderIndex: number
  itemIndex: number
}

export function AIModal({
  actionableFolderId,
  cleanedTitles,
  errorMessage,
  loading,
  loadingMessage,
  onApply,
  onClose,
  onRetry,
  open,
  plans,
}: AIModalProps) {
  const [editablePlans, setEditablePlans] = useState<AIPlan[]>(() => clonePlans(plans))
  const [selectedPlanId, setSelectedPlanId] = useState(() => plans[0]?.id ?? '')
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({})
  const [draggingItem, setDraggingItem] = useState<DraggingItem | null>(null)

  const selectedPlan = useMemo(
    () => editablePlans.find((plan) => plan.id === selectedPlanId) ?? editablePlans[0] ?? null,
    [editablePlans, selectedPlanId],
  )

  const updateSelectedPlan = (updater: (plan: AIPlan) => AIPlan) => {
    if (!selectedPlan) {
      return
    }

    setEditablePlans((current) =>
      current.map((plan) => {
        if (plan.id !== selectedPlan.id) {
          return plan
        }
        return updater(plan)
      }),
    )
  }

  const moveItemToFolder = (fromFolderIndex: number, itemIndex: number, targetFolderIndex: number) => {
    if (!selectedPlan || fromFolderIndex === targetFolderIndex) {
      return
    }

    updateSelectedPlan((plan) => {
      const nextFolders = plan.folders.map((folder) => ({
        ...folder,
        items: [...folder.items],
      }))
      const [item] = nextFolders[fromFolderIndex].items.splice(itemIndex, 1)
      if (!item) {
        return plan
      }
      nextFolders[targetFolderIndex].items.push(item)

      return {
        ...plan,
        folders: nextFolders.filter((folder) => folder.items.length > 0),
      }
    })
  }

  const deleteFolder = (folderIndex: number) => {
    if (!selectedPlan || selectedPlan.folders.length <= 1) {
      return
    }

    updateSelectedPlan((plan) => {
      const nextFolders = plan.folders.map((folder) => ({
        ...folder,
        items: [...folder.items],
      }))
      const removed = nextFolders.splice(folderIndex, 1)[0]
      const fallbackIndex = folderIndex > 0 ? folderIndex - 1 : 0
      nextFolders[fallbackIndex].items.push(...removed.items)
      return {
        ...plan,
        folders: nextFolders,
      }
    })
  }

  const mergeFolder = (folderIndex: number) => {
    if (!selectedPlan) {
      return
    }

    const sourceFolder = selectedPlan.folders[folderIndex]
    const targetName = mergeTargets[sourceFolder.name]
    if (!targetName || targetName === sourceFolder.name) {
      return
    }

    updateSelectedPlan((plan) => {
      const targetIndex = plan.folders.findIndex((folder) => folder.name === targetName)
      if (targetIndex === -1 || targetIndex === folderIndex) {
        return plan
      }

      const nextFolders = plan.folders.map((folder) => ({
        ...folder,
        items: [...folder.items],
      }))
      nextFolders[targetIndex].items.push(...nextFolders[folderIndex].items)
      nextFolders.splice(folderIndex, 1)
      return {
        ...plan,
        folders: nextFolders,
      }
    })
  }

  return (
    <Modal contentClassName="flex min-h-0 flex-1 flex-col" onClose={onClose} open={open} title="AI 整理方案" width="lg">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[13px] leading-5 text-[var(--color-text-secondary)]">
              {actionableFolderId
                ? '本次会先清理当前文件夹里的标题，再为当前范围生成可预览、可修改的整理方案。'
                : '本次会先清理全部书签标题，再为整个书签库生成可预览、可修改的整理方案。'}
            </p>
            <p className="text-[12px] leading-5 text-[var(--color-text-secondary)]">
              AI 只负责给出方案，真正改动结构前会先让你预览和调整。标题清理会先直接写入，结构调整必须确认后才执行。
            </p>
          </div>

          {loading ? (
            <Surface className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center" tone="panel">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
              <div className="space-y-1">
                <div className="text-[15px] font-semibold text-[var(--color-text)]">AI 正在处理中</div>
                <p className="text-[13px] leading-5 text-[var(--color-text-secondary)]">{loadingMessage}</p>
              </div>
            </Surface>
          ) : errorMessage ? (
            <StatePanel
              action={
                <Button onClick={onRetry} size="sm" variant="primary">
                  重新生成
                </Button>
              }
              description={errorMessage}
              title="AI 整理暂时失败"
            />
          ) : plans.length === 0 ? (
            <StatePanel
              action={
                <Button onClick={onRetry} size="sm" variant="secondary">
                  再试一次
                </Button>
              }
              description="这次没有生成可用方案。你可以稍后重试，或先换到更明确的文件夹范围再整理。"
              title="暂时没有可用方案"
            />
          ) : (
            <>
              {cleanedTitles.length > 0 ? (
                <details className="page-section-muted overflow-hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-[13px] font-medium text-[var(--color-text)]">
                    <span>已清理 {cleanedTitles.length} 条标题</span>
                    <span className="text-[12px] text-[var(--color-text-secondary)]">展开查看原标题与新标题</span>
                  </summary>
                  <div className="space-y-2 border-t border-[var(--color-border)] px-4 py-3">
                    {cleanedTitles.map((change) => (
                      <div
                        className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
                        key={change.bookmark_id}
                      >
                        <div className="text-[12px] leading-5 text-[var(--color-text-secondary)]">{change.old_title}</div>
                        <div className="mt-1 text-[13px] font-medium leading-5 text-[var(--color-text)]">{change.new_title}</div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-3">
                {editablePlans.map((plan) => {
                  const active = selectedPlan?.id === plan.id
                  const folderCount = plan.folders.length
                  const itemCount = plan.folders.reduce((total, folder) => total + folder.items.length, 0)

                  return (
                    <button
                      className={`rounded-[8px] border px-4 py-3 text-left transition-colors ${
                        active
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg-muted)]'
                      }`}
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      type="button"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold leading-5 text-[var(--color-text)]">{plan.name}</div>
                            <div className="mt-1 text-[12px] leading-4 text-[var(--color-text-secondary)]">{plan.description}</div>
                          </div>
                          {active ? <Icon className="mt-0.5 text-[14px] text-[var(--color-accent)]" name="check-circle" /> : null}
                        </div>

                        <div className="text-[12px] leading-4 text-[var(--color-text-secondary)]">
                          {folderCount} 个分类 · {itemCount} 条书签
                        </div>

                        <div className="text-[12px] leading-5 text-[var(--color-text-secondary)]">{plan.confidence_summary}</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {selectedPlan ? (
                <Surface className="space-y-4 p-4" tone="panel">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-[15px] font-semibold text-[var(--color-text)]">{selectedPlan.name}</div>
                      <div className="text-[13px] leading-5 text-[var(--color-text-secondary)]">{selectedPlan.description}</div>
                    </div>
                    <span className="status-pill">{selectedPlan.confidence_summary}</span>
                  </div>

                  <div className="grid max-h-[min(48vh,32rem)] gap-3 overflow-y-auto pr-1 lg:grid-cols-2">
                    {selectedPlan.folders.map((folder, folderIndex) => (
                      <div
                        className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)]"
                        key={`${selectedPlan.id}-${folder.name}-${folderIndex}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault()
                          if (!draggingItem) {
                            return
                          }
                          moveItemToFolder(draggingItem.folderIndex, draggingItem.itemIndex, folderIndex)
                          setDraggingItem(null)
                        }}
                      >
                        <div className="space-y-3 border-b border-[var(--color-border)] px-3 py-3">
                          <input
                            className="input-flat h-9 px-3 text-[13px]"
                            onChange={(event) =>
                              updateSelectedPlan((plan) => ({
                                ...plan,
                                folders: plan.folders.map((currentFolder, currentIndex) =>
                                  currentIndex === folderIndex
                                    ? { ...currentFolder, name: event.target.value }
                                    : currentFolder,
                                ),
                              }))
                            }
                            value={folder.name}
                          />

                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              className="input-flat form-select h-9 min-w-[150px] px-3 text-[13px]"
                              onChange={(event) =>
                                setMergeTargets((current) => ({
                                  ...current,
                                  [folder.name]: event.target.value,
                                }))
                              }
                              value={mergeTargets[folder.name] ?? ''}
                            >
                              <option value="">选择合并目标</option>
                              {selectedPlan.folders
                                .filter((candidate) => candidate.name !== folder.name)
                                .map((candidate) => (
                                  <option key={candidate.name} value={candidate.name}>
                                    {candidate.name}
                                  </option>
                                ))}
                            </select>
                            <Button onClick={() => mergeFolder(folderIndex)} size="sm" variant="secondary">
                              合并分类
                            </Button>
                            <Button
                              disabled={selectedPlan.folders.length <= 1}
                              onClick={() => deleteFolder(folderIndex)}
                              size="sm"
                              variant="ghost"
                            >
                              删除分类
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 px-3 py-3">
                          {folder.items.map((item, itemIndex) => (
                            <div
                              className="flex cursor-grab items-center justify-between gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-2"
                              draggable
                              key={item.bookmark_id}
                              onDragEnd={() => setDraggingItem(null)}
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = 'move'
                                setDraggingItem({ folderIndex, itemIndex })
                              }}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-medium text-[var(--color-text)]">{item.title}</div>
                                <div
                                  className={`mt-1 text-[11px] leading-4 ${
                                    item.confidence < 0.7 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'
                                  }`}
                                >
                                  {item.confidence < 0.7 ? '低置信度' : '置信度正常'} · {Math.round(item.confidence * 100)}%
                                </div>
                              </div>
                              <Icon className="text-[14px] text-[var(--color-text-secondary)]" name="grip" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Surface>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--color-border)] pt-3">
        <Button onClick={onClose} size="sm" variant="secondary">
          关闭
        </Button>
        <Button
          disabled={loading || !selectedPlan}
          onClick={() => {
            if (selectedPlan) {
              onApply(selectedPlan)
            }
          }}
          size="sm"
          variant="primary"
        >
          应用该方案
        </Button>
      </div>
    </Modal>
  )
}

function clonePlans(plans: AIPlan[]) {
  return plans.map((plan) => ({
    ...plan,
    folders: plan.folders.map((folder) => ({
      ...folder,
      items: folder.items.map((item) => ({ ...item })),
    })),
  }))
}
