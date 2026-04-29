package handler

import (
	"cubby/internal/ai"
	"sync"
	"time"

	"github.com/google/uuid"
)

type aiSession struct {
	CleanedTitles []ai.TitleCleanupChange
	FolderID      string
	ID            string
	Messages      []ai.ChatMessage
	PlanSummary   string
	UpdatedAt     time.Time
}

type AISessionManager struct {
	mu       sync.Mutex
	sessions map[string]aiSession
	ttl      time.Duration
}

func NewAISessionManager(ttl time.Duration) *AISessionManager {
	return &AISessionManager{
		sessions: make(map[string]aiSession),
		ttl:      ttl,
	}
}

func (m *AISessionManager) GetValid(sessionID string, folderID string) (aiSession, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.pruneLocked(time.Now())
	if sessionID == "" {
		return aiSession{}, false
	}

	session, ok := m.sessions[sessionID]
	if !ok || session.FolderID != folderID {
		return aiSession{}, false
	}

	session.UpdatedAt = time.Now()
	m.sessions[sessionID] = session
	return session, true
}

func (m *AISessionManager) Create(folderID string, preferredID string) aiSession {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.pruneLocked(time.Now())
	sessionID := preferredID
	if sessionID == "" {
		sessionID = uuid.NewString()
	}
	session := aiSession{
		FolderID:  folderID,
		ID:        sessionID,
		UpdatedAt: time.Now(),
	}
	m.sessions[session.ID] = session
	return session
}

func (m *AISessionManager) Save(session aiSession) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.pruneLocked(time.Now())
	session.UpdatedAt = time.Now()
	m.sessions[session.ID] = session
}

func (m *AISessionManager) Delete(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.sessions, sessionID)
}

func (m *AISessionManager) pruneLocked(now time.Time) {
	for id, session := range m.sessions {
		if now.Sub(session.UpdatedAt) > m.ttl {
			delete(m.sessions, id)
		}
	}
}
