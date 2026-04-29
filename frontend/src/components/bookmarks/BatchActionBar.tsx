import { Button } from '../ui/Button'
import { Select } from '../ui/Select'

type BatchActionBarProps = {
  folderOptions: Array<{ label: string; value: string }>
  moveTarget: string
  onClear: () => void
  onDelete: () => void
  onMoveTargetChange: (value: string) => void
  onMoveToFolder: () => void
  onSetFavorite: (value: boolean) => void
  selectedCount: number
}

export function BatchActionBar({
  folderOptions,
  moveTarget,
  onClear,
  onDelete,
  onMoveTargetChange,
  onMoveToFolder,
  onSetFavorite,
  selectedCount,
}: BatchActionBarProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="text-[13px] leading-5 text-[var(--color-text-secondary)]">已选择 {selectedCount} 条书签</div>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="min-w-[220px]">
          <Select
            aria-label="移动到文件夹"
            onChange={(event) => onMoveTargetChange(event.target.value)}
            options={folderOptions}
            placeholder="移动到文件夹"
            value={moveTarget}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onMoveToFolder} size="sm" variant="secondary">
            移动
          </Button>
          <Button onClick={() => onSetFavorite(true)} size="sm" variant="secondary">
            收藏
          </Button>
          <Button onClick={() => onSetFavorite(false)} size="sm" variant="secondary">
            取消收藏
          </Button>
          <Button onClick={onDelete} size="sm" variant="danger">
            删除
          </Button>
          <Button onClick={onClear} size="sm" variant="ghost">
            清空选择
          </Button>
        </div>
      </div>
    </div>
  )
}
