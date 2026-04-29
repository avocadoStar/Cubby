import type { ChangeEvent } from 'react'
import type { ImportTaskSnapshot } from '../../types'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { Surface } from '../ui/Surface'

type ImportModalProps = {
  connectionError: string | null
  importTask: ImportTaskSnapshot | null
  onClose: () => void
  onImport: (event: ChangeEvent<HTMLInputElement>) => void
  open: boolean
  starting: boolean
}

const stageLabels: Record<ImportTaskSnapshot['stage'], string> = {
  queued: '等待开始',
  file_received: '文件已接收',
  parsing: '正在解析书签',
  creating_folders: '正在创建文件夹',
  importing_bookmarks: '正在写入书签',
  completed: '导入完成',
  failed: '导入失败',
}

export function ImportModal({ connectionError, importTask, onClose, onImport, open, starting }: ImportModalProps) {
  const stageLabel = importTask ? stageLabels[importTask.stage] : null
  const isRunning = starting || importTask?.status === 'queued' || importTask?.status === 'running'
  const isFailed = importTask?.status === 'failed'
  const result = importTask?.result ?? null

  return (
    <Modal onClose={onClose} open={open} title="导入浏览器书签" width="md">
      <div className="space-y-4">
        <p className="text-[13px] leading-5 text-[var(--color-text-secondary)]">
          支持 Chrome、Edge、Firefox 导出的 HTML 书签文件。导入过程中会实时显示进度。
        </p>

        {importTask ? (
          <Surface className="space-y-4 p-4" tone="panel">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[15px] font-semibold text-[var(--color-text)]">{stageLabel}</div>
                <div className="text-[13px] leading-5 text-[var(--color-text-secondary)]">
                  {importTask.message || (isFailed ? '导入未完成' : '正在处理导入任务')}
                </div>
              </div>
              <div className="text-[18px] font-semibold leading-6 text-[var(--color-text)]">{importTask.progress}%</div>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
              <div
                className={`h-full rounded-full transition-[width,background-color] duration-200 ease-out ${
                  isFailed ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-accent)]'
                }`}
                style={{ width: `${Math.max(0, Math.min(importTask.progress, 100))}%` }}
              />
            </div>

            {connectionError ? (
              <div className="rounded-[8px] border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-3 py-2 text-[12px] leading-5 text-[var(--color-danger)]">
                {connectionError}
              </div>
            ) : null}

            {importTask.error ? (
              <div className="rounded-[8px] border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-3 py-2 text-[12px] leading-5 text-[var(--color-danger)]">
                {importTask.error}
              </div>
            ) : null}

            {result ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="新增书签" value={String(result.created)} />
                  <MetricCard label="跳过重复" value={String(result.skipped)} />
                </div>
                <div className="text-[13px] leading-5 text-[var(--color-text-secondary)]">
                  {result.folders_created.length > 0
                    ? `新增文件夹：${result.folders_created.join('、')}`
                    : '没有创建新的文件夹。'}
                </div>
              </>
            ) : null}
          </Surface>
        ) : null}

        {!isRunning ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-muted)] px-6 py-10 text-center transition-colors duration-200 hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-subtle)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
              <Icon className="text-[18px]" name="upload" />
            </div>
            <div className="space-y-1">
              <div className="text-[14px] font-medium text-[var(--color-text)]">
                {importTask ? '重新选择 HTML 书签文件' : '选择 HTML 书签文件'}
              </div>
              <div className="max-w-sm text-[12px] leading-5 text-[var(--color-text-secondary)]">
                点击后选择浏览器导出的书签文件，导入结果会显示在这里。
              </div>
            </div>
            <input accept=".html,.htm" className="hidden" onChange={onImport} type="file" />
          </label>
        ) : (
          <Surface className="flex items-center gap-3 p-3" tone="subtle">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)]">
              <Icon className="animate-pulse text-[14px]" name="upload" />
            </div>
            <div className="text-[13px] leading-5 text-[var(--color-text-secondary)]">
              导入正在进行中，进度会自动更新。
            </div>
          </Surface>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} size="sm" variant="secondary">
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="space-y-1 p-3" tone="subtle">
      <div className="text-[12px] leading-4 text-[var(--color-text-secondary)]">{label}</div>
      <div className="text-[18px] font-semibold leading-6 text-[var(--color-text)]">{value}</div>
    </Surface>
  )
}
