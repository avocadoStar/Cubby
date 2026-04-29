import type { AISuggestion } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { StatePanel } from '../ui/StatePanel'
import { Surface } from '../ui/Surface'

type AIModalProps = {
  actionableFolderId: string | null
  aiApplying: boolean
  aiLoading: boolean
  onApply: () => void
  onClose: () => void
  open: boolean
  suggestions: AISuggestion[]
}

export function AIModal({
  actionableFolderId,
  aiApplying,
  aiLoading,
  onApply,
  onClose,
  open,
  suggestions,
}: AIModalProps) {
  return (
    <Modal onClose={onClose} open={open} title="AI 整理建议" width="lg">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[13px] leading-5 text-[var(--color-text-secondary)]">
            {actionableFolderId
              ? '这次只会针对当前文件夹给出整理建议。'
              : '当前没有选中文件夹，AI 会基于全部书签给出整理建议。'}
          </p>
          <p className="text-[12px] leading-5 text-[var(--color-text-secondary)]">
            当前流程是“先给建议，再统一应用”。点“全部应用”后，会按建议批量移动书签；如果建议里包含新文件夹名，系统也会尝试先创建再移动。
          </p>
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {aiLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Surface className="space-y-3 p-3 animate-pulse" key={index} tone="panel">
                <div className="h-4 w-1/3 rounded bg-[var(--color-bg-muted)]" />
                <div className="h-3 w-2/3 rounded bg-[var(--color-bg-muted)]" />
                <div className="h-3 w-full rounded bg-[var(--color-bg-muted)]" />
              </Surface>
            ))
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <Surface className="space-y-3 p-3" key={suggestion.bookmark_id} tone="panel">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-[14px] font-semibold leading-5 text-[var(--color-text)]">{suggestion.title}</div>
                    <div className="text-[12px] leading-4 text-[var(--color-accent)]">
                      建议移动到：{suggestion.suggested_folder}
                    </div>
                  </div>
                  <span className="status-pill">{Math.round(suggestion.confidence * 100)}%</span>
                </div>
                <p className="text-[13px] leading-5 text-[var(--color-text-secondary)]">{suggestion.reason}</p>
              </Surface>
            ))
          ) : (
            <StatePanel
              description="AI 没有发现明显需要调整的项目。"
              title="这批书签已经比较整齐"
            />
          )}
        </div>

        <Surface className="px-3 py-2.5" tone="subtle">
          <p className="text-[12px] leading-5 text-[var(--color-text-secondary)]">
            当前按文件夹路径匹配的能力还比较浅，更接近顶层或两级结构，不是完整的无限层级智能归档。
          </p>
        </Surface>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button onClick={onClose} size="sm" variant="secondary">
            关闭
          </Button>
          <Button disabled={aiLoading || aiApplying || suggestions.length === 0} onClick={onApply} size="sm" variant="primary">
            {aiApplying ? '应用中…' : '全部应用'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
