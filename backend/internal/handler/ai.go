package handler

import (
	"cubby/internal/ai"
	"cubby/internal/model"
	"cubby/internal/repository"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AIHandler struct {
	aiClient     *ai.Client
	bookmarkRepo *repository.BookmarkRepo
	folderRepo   *repository.FolderRepo
	sessions     *AISessionManager
	undoManager  *AIUndoManager
}

func NewAIHandler(aiClient *ai.Client, bookmarkRepo *repository.BookmarkRepo, folderRepo *repository.FolderRepo) *AIHandler {
	return &AIHandler{
		aiClient:     aiClient,
		bookmarkRepo: bookmarkRepo,
		folderRepo:   folderRepo,
		sessions:     NewAISessionManager(20 * time.Minute),
		undoManager:  NewAIUndoManager(),
	}
}

func (h *AIHandler) Organize(c *gin.Context) {
	var req ai.OrganizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Action = "plan"
	}
	if req.Action == "" {
		req.Action = "plan"
	}

	switch req.Action {
	case "apply":
		h.applyPlan(c, req)
	case "close":
		h.closeSession(c, req)
	case "undo":
		h.undoPlan(c, req)
	default:
		h.buildPlans(c, req)
	}
}

func (h *AIHandler) buildPlans(c *gin.Context, req ai.OrganizeRequest) {
	scopeBookmarks, titleCleanupBookmarks, err := h.loadScopeBookmarks(req.FolderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "error": err.Error()})
		return
	}

	session, ok := h.sessions.GetValid(strings.TrimSpace(req.SessionID), req.FolderID)
	if !ok {
		session = h.sessions.Create(req.FolderID, strings.TrimSpace(req.SessionID))
	}

	cleanupChanges := session.CleanedTitles
	if len(cleanupChanges) == 0 {
		cleanupChanges, err = h.cleanupTitles(titleCleanupBookmarks)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "error": err.Error()})
			return
		}
		session.CleanedTitles = cleanupChanges
	}

	if len(scopeBookmarks) == 0 {
		h.sessions.Save(session)
		c.JSON(http.StatusOK, ai.OrganizeResponse{
			CleanedTitles: cleanupChanges,
			Plans:         []ai.Plan{},
			SessionID:     session.ID,
		})
		return
	}

	tree, err := h.folderRepo.GetTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "error": err.Error()})
		return
	}

	plans, history, err := h.aiClient.GeneratePlans(scopeBookmarks, tree, cleanupChanges, session.Messages)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "AI_ERROR", "error": err.Error()})
		return
	}

	session.Messages = history
	session.PlanSummary = summarizePlanNames(plans)
	h.sessions.Save(session)

	c.JSON(http.StatusOK, ai.OrganizeResponse{
		CleanedTitles: cleanupChanges,
		Plans:         plans,
		SessionID:     session.ID,
	})
}

func (h *AIHandler) applyPlan(c *gin.Context, req ai.OrganizeRequest) {
	if strings.TrimSpace(req.SessionID) != "" {
		if session, ok := h.sessions.GetValid(strings.TrimSpace(req.SessionID), req.FolderID); ok {
			h.sessions.Save(session)
		}
	}

	if req.Plan == nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_REQUEST", "error": "缺少待应用的整理方案"})
		return
	}

	scopeBookmarks, _, err := h.loadScopeBookmarks(req.FolderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "error": err.Error()})
		return
	}
	if len(scopeBookmarks) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"code": "EMPTY_SCOPE", "error": "当前范围内没有可整理的书签"})
		return
	}

	normalizedPlan, err := validatePlanForApply(*req.Plan, scopeBookmarks)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_PLAN", "error": err.Error()})
		return
	}

	oldFolders, err := h.loadScopeFolders(req.FolderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "error": err.Error()})
		return
	}

	assignments := make([]repository.BookmarkAssignment, 0, len(scopeBookmarks))
	for _, bookmark := range scopeBookmarks {
		assignments = append(assignments, repository.BookmarkAssignment{
			ID:        bookmark.ID,
			FolderID:  bookmark.FolderID,
			SortOrder: bookmark.SortOrder,
		})
	}

	oldFolderIDs := make([]string, 0, len(oldFolders))
	for _, folder := range oldFolders {
		oldFolderIDs = append(oldFolderIDs, folder.ID)
	}

	if err := h.folderRepo.DeleteMany(oldFolderIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "error": err.Error()})
		return
	}

	var parentID *string
	if req.FolderID != "" {
		parentID = &req.FolderID
	}

	newFolderIDs := make([]string, 0, len(normalizedPlan.Folders))
	for folderIndex, folder := range normalizedPlan.Folders {
		newFolder := &model.Folder{
			ID:        uuid.NewString(),
			Name:      folder.Name,
			ParentID:  parentID,
			SortOrder: folderIndex,
		}
		if err := h.folderRepo.Create(newFolder); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "error": err.Error()})
			return
		}
		newFolderIDs = append(newFolderIDs, newFolder.ID)

		for itemIndex, item := range folder.Items {
			folderID := newFolder.ID
			if err := h.bookmarkRepo.AssignBookmark(item.BookmarkID, &folderID, itemIndex); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "error": err.Error()})
				return
			}
		}
	}

	scopeFolderID := parentID
	token := h.undoManager.Create(aiUndoSnapshot{
		NewFolderIDs:   newFolderIDs,
		OldAssignments: assignments,
		OldFolders:     oldFolders,
		ScopeFolderID:  scopeFolderID,
	})

	c.JSON(http.StatusOK, ai.OrganizeResponse{UndoToken: token})
}

func (h *AIHandler) closeSession(c *gin.Context, req ai.OrganizeRequest) {
	if strings.TrimSpace(req.SessionID) != "" {
		h.sessions.Delete(strings.TrimSpace(req.SessionID))
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *AIHandler) undoPlan(c *gin.Context, req ai.OrganizeRequest) {
	if strings.TrimSpace(req.UndoToken) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_REQUEST", "error": "缺少撤销令牌"})
		return
	}

	snapshot, ok := h.undoManager.Consume(req.UndoToken)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"code": "UNDO_NOT_FOUND", "error": "撤销记录不存在或已失效"})
		return
	}

	if err := h.folderRepo.DeleteMany(snapshot.NewFolderIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "error": err.Error()})
		return
	}

	if err := h.folderRepo.CreateMany(snapshot.OldFolders); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "error": err.Error()})
		return
	}

	if err := h.bookmarkRepo.RestoreAssignments(snapshot.OldAssignments); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *AIHandler) loadScopeBookmarks(folderID string) ([]model.Bookmark, []model.Bookmark, error) {
	if folderID == "" {
		allBookmarks, err := h.bookmarkRepo.ListAll()
		return allBookmarks, allBookmarks, err
	}

	descendantIDs, err := h.folderRepo.GetDescendantIDs(folderID)
	if err != nil {
		return nil, nil, err
	}
	scopeBookmarks, err := h.bookmarkRepo.ListByFolderIDs(descendantIDs)
	if err != nil {
		return nil, nil, err
	}

	directFolderID := folderID
	titleCleanupBookmarks, err := h.bookmarkRepo.ListByExactFolder(&directFolderID)
	if err != nil {
		return nil, nil, err
	}

	return scopeBookmarks, titleCleanupBookmarks, nil
}

func (h *AIHandler) loadScopeFolders(folderID string) ([]model.Folder, error) {
	allFolders, err := h.folderRepo.ListAll()
	if err != nil {
		return nil, err
	}
	if folderID == "" {
		return allFolders, nil
	}

	descendantIDs, err := h.folderRepo.GetDescendantIDs(folderID)
	if err != nil {
		return nil, err
	}
	descendantSet := make(map[string]struct{}, len(descendantIDs))
	for _, id := range descendantIDs {
		if id == folderID {
			continue
		}
		descendantSet[id] = struct{}{}
	}

	var scoped []model.Folder
	for _, folder := range allFolders {
		if _, ok := descendantSet[folder.ID]; ok {
			scoped = append(scoped, folder)
		}
	}
	return scoped, nil
}

func (h *AIHandler) cleanupTitles(bookmarks []model.Bookmark) ([]ai.TitleCleanupChange, error) {
	changes := make([]ai.TitleCleanupChange, 0)
	for _, bookmark := range bookmarks {
		nextTitle := cleanBookmarkTitle(bookmark.Title)
		if nextTitle == "" || nextTitle == bookmark.Title {
			continue
		}
		if err := h.bookmarkRepo.UpdateTitle(bookmark.ID, nextTitle); err != nil {
			return nil, err
		}
		changes = append(changes, ai.TitleCleanupChange{
			BookmarkID: bookmark.ID,
			OldTitle:   bookmark.Title,
			NewTitle:   nextTitle,
		})
	}
	return changes, nil
}

func validatePlanForApply(plan ai.Plan, scopeBookmarks []model.Bookmark) (ai.Plan, error) {
	scopeMap := make(map[string]model.Bookmark, len(scopeBookmarks))
	for _, bookmark := range scopeBookmarks {
		scopeMap[bookmark.ID] = bookmark
	}

	plan.Name = strings.TrimSpace(plan.Name)
	plan.Description = strings.TrimSpace(plan.Description)
	plan.ConfidenceSummary = strings.TrimSpace(plan.ConfidenceSummary)

	seen := make(map[string]struct{}, len(scopeBookmarks))
	folders := make([]ai.PlanFolder, 0, len(plan.Folders))
	for folderIndex, folder := range plan.Folders {
		folder.Name = strings.TrimSpace(folder.Name)
		if folder.Name == "" {
			folder.Name = "分类"
		}

		items := make([]ai.PlanItem, 0, len(folder.Items))
		for _, item := range folder.Items {
			bookmark, ok := scopeMap[item.BookmarkID]
			if !ok {
				return ai.Plan{}, errPlanInvalid("方案中包含当前范围外的书签")
			}
			if _, exists := seen[item.BookmarkID]; exists {
				return ai.Plan{}, errPlanInvalid("同一条书签不能重复出现在多个分类中")
			}
			seen[item.BookmarkID] = struct{}{}
			if strings.TrimSpace(item.Title) == "" {
				item.Title = bookmark.Title
			}
			if item.Confidence <= 0 {
				item.Confidence = 0.6
			}
			items = append(items, item)
		}
		if len(items) == 0 {
			return ai.Plan{}, errPlanInvalid("分类不能为空")
		}
		folders = append(folders, ai.PlanFolder{
			Name:  folder.Name,
			Items: items,
		})
		if folderIndex >= 5 {
			break
		}
	}

	if len(folders) == 0 {
		return ai.Plan{}, errPlanInvalid("至少需要一个分类")
	}
	if len(folders) > 6 {
		return ai.Plan{}, errPlanInvalid("分类数量不能超过 6 个")
	}
	if len(seen) != len(scopeBookmarks) {
		return ai.Plan{}, errPlanInvalid("方案没有覆盖全部书签")
	}

	plan.Folders = folders
	return plan, nil
}

type planValidationError string

func (e planValidationError) Error() string {
	return string(e)
}

func errPlanInvalid(message string) error {
	return planValidationError(message)
}

var (
	emotionPattern = regexp.MustCompile(`(?i)(非常简单|别再头大了|必须收藏|收藏起来|太香了|干货满满|一文搞定|保姆级|超详细)`)
	siteSuffixes   = []string{
		"-CSDN博客",
		"- 知乎",
		"-知乎",
		"- 博客园",
		"-博客园",
		"- 掘金",
		"-掘金",
		"- 官网",
		"-官网",
		"| CSDN",
		"| 知乎",
	}
	wordReplacer = strings.NewReplacer(
		"JavaScript", "JS",
		"javascript", "JS",
		"TypeScript", "TS",
		"typescript", "TS",
		"PDF", "PDF",
		"Word", "Word",
	)
)

func cleanBookmarkTitle(raw string) string {
	title := strings.TrimSpace(raw)
	if title == "" {
		return ""
	}

	title = emotionPattern.ReplaceAllString(title, "")
	for _, suffix := range siteSuffixes {
		title = strings.ReplaceAll(title, suffix, "")
	}

	separators := []string{"｜", "|", "_"}
	for _, separator := range separators {
		parts := strings.Split(title, separator)
		if len(parts) > 1 {
			title = strings.TrimSpace(parts[0])
		}
	}

	parts := strings.Split(title, " - ")
	if len(parts) > 1 {
		title = strings.TrimSpace(parts[0])
	}

	title = wordReplacer.Replace(title)
	title = strings.Join(strings.Fields(title), " ")
	title = strings.Trim(title, " -_，。！？!?、")

	if utf8.RuneCountInString(title) <= 20 {
		return title
	}

	runes := []rune(title)
	return strings.TrimSpace(string(runes[:20]))
}

func summarizePlanNames(plans []ai.Plan) string {
	names := make([]string, 0, len(plans))
	for _, plan := range plans {
		if strings.TrimSpace(plan.Name) == "" {
			continue
		}
		names = append(names, plan.Name)
	}
	slices.Sort(names)
	return strings.Join(names, " / ")
}
