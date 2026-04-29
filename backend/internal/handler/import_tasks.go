package handler

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

type importTaskStatus string

const (
	importTaskStatusCompleted importTaskStatus = "completed"
	importTaskStatusFailed    importTaskStatus = "failed"
	importTaskStatusQueued    importTaskStatus = "queued"
	importTaskStatusRunning   importTaskStatus = "running"
)

type importTaskStage string

const (
	importTaskStageCompleted        importTaskStage = "completed"
	importTaskStageCreatingFolders  importTaskStage = "creating_folders"
	importTaskStageFailed           importTaskStage = "failed"
	importTaskStageFileReceived     importTaskStage = "file_received"
	importTaskStageImportingEntries importTaskStage = "importing_bookmarks"
	importTaskStageParsing          importTaskStage = "parsing"
	importTaskStageQueued           importTaskStage = "queued"
)

type importTaskResult struct {
	Created        int      `json:"created"`
	FoldersCreated []string `json:"folders_created"`
	Skipped        int      `json:"skipped"`
}

type importTaskSnapshot struct {
	Error    string            `json:"error,omitempty"`
	Message  string            `json:"message,omitempty"`
	Progress int               `json:"progress"`
	Result   *importTaskResult `json:"result,omitempty"`
	Stage    importTaskStage   `json:"stage"`
	Status   importTaskStatus  `json:"status"`
	TaskID   string            `json:"task_id"`
}

type importTaskState struct {
	snapshot    importTaskSnapshot
	subscribers map[chan importTaskSnapshot]struct{}
	updatedAt   time.Time
}

type ImportTaskManager struct {
	mu    sync.RWMutex
	tasks map[string]*importTaskState
}

func NewImportTaskManager() *ImportTaskManager {
	return &ImportTaskManager{
		tasks: make(map[string]*importTaskState),
	}
}

func (m *ImportTaskManager) CreateTask() importTaskSnapshot {
	m.mu.Lock()
	defer m.mu.Unlock()

	taskID := uuid.NewString()
	snapshot := importTaskSnapshot{
		Message:  "等待开始导入",
		Progress: 0,
		Stage:    importTaskStageQueued,
		Status:   importTaskStatusQueued,
		TaskID:   taskID,
	}

	m.tasks[taskID] = &importTaskState{
		snapshot:    snapshot,
		subscribers: make(map[chan importTaskSnapshot]struct{}),
		updatedAt:   time.Now(),
	}

	return snapshot
}

func (m *ImportTaskManager) Update(taskID string, mutate func(snapshot *importTaskSnapshot)) (importTaskSnapshot, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	task, ok := m.tasks[taskID]
	if !ok {
		return importTaskSnapshot{}, false
	}

	mutate(&task.snapshot)
	task.updatedAt = time.Now()
	snapshot := task.snapshot
	for subscriber := range task.subscribers {
		select {
		case subscriber <- snapshot:
		default:
		}
	}

	return snapshot, true
}

func (m *ImportTaskManager) Subscribe(taskID string) (<-chan importTaskSnapshot, func(), bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	task, ok := m.tasks[taskID]
	if !ok {
		return nil, nil, false
	}

	updates := make(chan importTaskSnapshot, 8)
	task.subscribers[updates] = struct{}{}
	updates <- task.snapshot

	cancel := func() {
		m.mu.Lock()
		defer m.mu.Unlock()

		current, exists := m.tasks[taskID]
		if !exists {
			return
		}
		if _, subscribed := current.subscribers[updates]; !subscribed {
			return
		}
		delete(current.subscribers, updates)
		close(updates)
	}

	return updates, cancel, true
}
