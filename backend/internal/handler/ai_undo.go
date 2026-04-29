package handler

import (
	"cubby/internal/model"
	"cubby/internal/repository"
	"sync"

	"github.com/google/uuid"
)

type aiUndoSnapshot struct {
	NewFolderIDs    []string
	OldAssignments  []repository.BookmarkAssignment
	OldFolders      []model.Folder
	ScopeFolderID   *string
}

type AIUndoManager struct {
	mu        sync.Mutex
	snapshots map[string]aiUndoSnapshot
}

func NewAIUndoManager() *AIUndoManager {
	return &AIUndoManager{
		snapshots: make(map[string]aiUndoSnapshot),
	}
}

func (m *AIUndoManager) Create(snapshot aiUndoSnapshot) string {
	m.mu.Lock()
	defer m.mu.Unlock()

	token := uuid.NewString()
	m.snapshots[token] = snapshot
	return token
}

func (m *AIUndoManager) Consume(token string) (aiUndoSnapshot, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	snapshot, ok := m.snapshots[token]
	if !ok {
		return aiUndoSnapshot{}, false
	}

	delete(m.snapshots, token)
	return snapshot, true
}
