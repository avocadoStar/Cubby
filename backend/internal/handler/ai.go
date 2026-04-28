package handler

import (
	"cubby/internal/ai"
	"cubby/internal/model"
	"cubby/internal/repository"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AIHandler struct {
	aiClient     *ai.Client
	bookmarkRepo *repository.BookmarkRepo
	folderRepo   *repository.FolderRepo
}

func NewAIHandler(aiClient *ai.Client, bookmarkRepo *repository.BookmarkRepo, folderRepo *repository.FolderRepo) *AIHandler {
	return &AIHandler{aiClient: aiClient, bookmarkRepo: bookmarkRepo, folderRepo: folderRepo}
}

func (h *AIHandler) Organize(c *gin.Context) {
	var req ai.OrganizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Action = "suggest"
	}

	var bookmarks []model.Bookmark
	if req.FolderID != "" {
		ids, err := h.folderRepo.GetDescendantIDs(req.FolderID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
			return
		}
		bookmarks, err = h.bookmarkRepo.ListByFolderIDs(ids)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
			return
		}
	} else {
		q := repository.BookmarkQuery{FolderID: "all", PageSize: 200}
		result, err := h.bookmarkRepo.List(q)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
			return
		}
		bookmarks = result.Items
	}

	if len(bookmarks) == 0 {
		c.JSON(http.StatusOK, ai.OrganizeResponse{Suggestions: []ai.Suggestion{}})
		return
	}

	tree, err := h.folderRepo.GetTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}

	resp, err := h.aiClient.Organize(bookmarks, tree, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "AI_ERROR"})
		return
	}

	if req.Action == "apply" {
		for _, s := range resp.Suggestions {
			if s.NewFolderName != "" {
				newFolder := &model.Folder{
					ID:        uuid.New().String(),
					Name:      s.NewFolderName,
					SortOrder: 999,
				}
				parts := strings.Split(s.SuggestedFolder, "/")
				if len(parts) > 1 {
					newFolder.Name = parts[len(parts)-1]
					parentName := parts[0]
					for _, f := range tree {
						if f.Name == parentName {
							pid := f.ID
							newFolder.ParentID = &pid
							break
						}
					}
				}
				if err := h.folderRepo.Create(newFolder); err == nil {
					h.bookmarkRepo.MoveToFolder(s.BookmarkID, &newFolder.ID)
				}
			} else {
				folderID := findFolderIDByName(tree, s.SuggestedFolder)
				if folderID != nil {
					h.bookmarkRepo.MoveToFolder(s.BookmarkID, folderID)
				}
			}
		}
	}

	c.JSON(http.StatusOK, resp)
}

func findFolderIDByName(tree []repository.FolderTree, path string) *string {
	parts := strings.Split(path, "/")
	for _, f := range tree {
		if len(parts) == 1 && f.Name == parts[0] {
			return &f.ID
		}
		if len(parts) > 1 && f.Name == parts[0] {
			for _, child := range f.Children {
				if child.Name == parts[1] {
					return &child.ID
				}
			}
		}
	}
	return nil
}
