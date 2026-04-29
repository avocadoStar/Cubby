package ai

import (
	"bytes"
	"cubby/internal/model"
	"cubby/internal/repository"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"
)

type Client struct {
	settingRepo *repository.SettingRepo
	httpClient  *http.Client
}

type ChatMessage struct {
	Content string `json:"content"`
	Role    string `json:"role"`
}

const aiRequestTimeout = 180 * time.Second

func NewClient(settingRepo *repository.SettingRepo) *Client {
	return &Client{
		settingRepo: settingRepo,
		httpClient:  &http.Client{Timeout: aiRequestTimeout},
	}
}

type OrganizeRequest struct {
	Action    string `json:"action"`
	FolderID  string `json:"folder_id"`
	Plan      *Plan  `json:"plan,omitempty"`
	SessionID string `json:"session_id,omitempty"`
	UndoToken string `json:"undo_token,omitempty"`
}

type TitleCleanupChange struct {
	BookmarkID string `json:"bookmark_id"`
	NewTitle   string `json:"new_title"`
	OldTitle   string `json:"old_title"`
}

type PlanItem struct {
	BookmarkID string  `json:"bookmark_id"`
	Confidence float64 `json:"confidence"`
	Title      string  `json:"title"`
}

type PlanFolder struct {
	Items []PlanItem `json:"items"`
	Name  string     `json:"name"`
}

type Plan struct {
	ConfidenceSummary string       `json:"confidence_summary"`
	Description       string       `json:"description"`
	Folders           []PlanFolder `json:"folders"`
	ID                string       `json:"id"`
	Name              string       `json:"name"`
}

type OrganizeResponse struct {
	CleanedTitles []TitleCleanupChange `json:"cleaned_titles,omitempty"`
	Plans         []Plan               `json:"plans,omitempty"`
	SessionID     string               `json:"session_id,omitempty"`
	UndoToken     string               `json:"undo_token,omitempty"`
}

func (c *Client) Test() error {
	settings, err := c.settingRepo.GetAll()
	if err != nil {
		return err
	}

	apiKey := settings["ai_api_key"]
	if apiKey == "" {
		return fmt.Errorf("请先在设置中配置 AI API Key")
	}

	provider := settings["ai_provider"]
	modelName := settings["ai_model"]
	if modelName == "" {
		modelName = defaultModel(provider)
	}
	baseURL := settings["ai_base_url"]

	messages := []ChatMessage{{Role: "user", Content: "hi"}}

	switch provider {
	case "anthropic":
		_, err = c.callAnthropic(baseURL, apiKey, modelName, messages)
	case "dashscope":
		if baseURL == "" {
			baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
		}
		_, err = c.callOpenAI(baseURL, apiKey, modelName, messages)
	default:
		_, err = c.callOpenAI(baseURL, apiKey, modelName, messages)
	}

	return err
}

func (c *Client) GeneratePlans(
	bookmarks []model.Bookmark,
	folders []repository.FolderTree,
	cleanupChanges []TitleCleanupChange,
	history []ChatMessage,
) ([]Plan, []ChatMessage, error) {
	settings, err := c.settingRepo.GetAll()
	if err != nil {
		return nil, nil, err
	}

	apiKey := settings["ai_api_key"]
	if apiKey == "" {
		return nil, nil, fmt.Errorf("请先在设置中配置 AI API Key")
	}

	provider := settings["ai_provider"]
	modelName := settings["ai_model"]
	if modelName == "" {
		modelName = defaultModel(provider)
	}
	baseURL := settings["ai_base_url"]

	messages := c.preparePlanMessages(bookmarks, folders, cleanupChanges, history)

	var respBody string
	switch provider {
	case "anthropic":
		respBody, err = c.callAnthropic(baseURL, apiKey, modelName, messages)
	case "dashscope":
		if baseURL == "" {
			baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
		}
		respBody, err = c.callOpenAI(baseURL, apiKey, modelName, messages)
	default:
		respBody, err = c.callOpenAI(baseURL, apiKey, modelName, messages)
	}
	if err != nil {
		return nil, nil, err
	}

	nextHistory := append(cloneMessages(messages), ChatMessage{
		Role:    "assistant",
		Content: respBody,
	})

	plans := parsePlans(respBody)
	plans = normalizePlans(plans, bookmarks)
	if len(plans) < 2 {
		plans = appendUniquePlans(plans, buildFallbackPlans(bookmarks)...)
		plans = normalizePlans(plans, bookmarks)
	}
	if len(plans) > 3 {
		plans = plans[:3]
	}
	if len(plans) == 0 {
		return nil, nil, fmt.Errorf("AI 没有返回可用的整理方案")
	}

	return plans, nextHistory, nil
}

func (c *Client) preparePlanMessages(
	bookmarks []model.Bookmark,
	folders []repository.FolderTree,
	cleanupChanges []TitleCleanupChange,
	history []ChatMessage,
) []ChatMessage {
	if len(history) > 0 {
		return append(cloneMessages(history), ChatMessage{
			Role: "user",
			Content: "继续基于同一批书签生成 2 到 3 套新的整理方案。保持 JSON 输出格式不变，" +
				"尽量和上一次方案拉开思路差异，只返回 JSON。",
		})
	}

	return []ChatMessage{
		{
			Role:    "system",
			Content: "你是书签整理助手。你必须只返回合法 JSON，不要返回 Markdown，不要返回解释。",
		},
		{
			Role:    "user",
			Content: c.buildPlanPrompt(bookmarks, folders, cleanupChanges),
		},
	}
}

func (c *Client) buildPlanPrompt(
	bookmarks []model.Bookmark,
	folders []repository.FolderTree,
	cleanupChanges []TitleCleanupChange,
) string {
	var folderList strings.Builder
	flattenFolderPaths(folders, "", &folderList)

	var bookmarkList strings.Builder
	for _, bookmark := range bookmarks {
		bookmarkList.WriteString(fmt.Sprintf("- id=%s | title=%s | url=%s\n", bookmark.ID, bookmark.Title, bookmark.URL))
	}

	var cleanedList strings.Builder
	if len(cleanupChanges) > 0 {
		for _, change := range cleanupChanges {
			cleanedList.WriteString(fmt.Sprintf("- id=%s | old=%s | new=%s\n", change.BookmarkID, change.OldTitle, change.NewTitle))
		}
	} else {
		cleanedList.WriteString("- 本次没有发生标题清理\n")
	}

	return fmt.Sprintf(`请为这批书签生成 2 到 3 套整理方案。
要求：
1. 只返回 JSON，格式必须是 {"plans":[...]}。
2. 每套方案必须包含 id、name、description、confidence_summary、folders。
3. folders 是数组，每个文件夹必须包含 name、items。
4. items 是数组，每个条目必须包含 bookmark_id、title、confidence。
5. 每套方案必须覆盖全部书签，不允许遗漏。
6. 每套方案的分类数量控制在 3 到 6 个，不允许空文件夹。
7. confidence 取值 0 到 1。
8. 不同方案的分类逻辑要有明显差异，比如按技术领域、按使用场景、按内容类型。
9. title 使用当前书签标题，不要编造新标题。
10. 只输出 JSON，不要补充解释。

用户现有分类风格：
%s

本次标题清理结果：
%s

待整理书签：
%s`, folderList.String(), cleanedList.String(), bookmarkList.String())
}

func parsePlans(raw string) []Plan {
	raw = extractJSON(raw)

	var wrapped struct {
		Plans []Plan `json:"plans"`
	}
	if err := json.Unmarshal([]byte(raw), &wrapped); err == nil && len(wrapped.Plans) > 0 {
		return wrapped.Plans
	}

	var direct []Plan
	if err := json.Unmarshal([]byte(raw), &direct); err == nil && len(direct) > 0 {
		return direct
	}

	return nil
}

func normalizePlans(plans []Plan, bookmarks []model.Bookmark) []Plan {
	if len(bookmarks) == 0 {
		return nil
	}

	bookmarkByID := make(map[string]model.Bookmark, len(bookmarks))
	allIDs := make([]string, 0, len(bookmarks))
	for _, bookmark := range bookmarks {
		bookmarkByID[bookmark.ID] = bookmark
		allIDs = append(allIDs, bookmark.ID)
	}

	normalized := make([]Plan, 0, len(plans))
	for index, plan := range plans {
		if strings.TrimSpace(plan.Name) == "" {
			plan.Name = fmt.Sprintf("整理方案 %d", index+1)
		}
		if strings.TrimSpace(plan.ID) == "" {
			plan.ID = fmt.Sprintf("plan_%d", index+1)
		}

		seen := make(map[string]struct{}, len(bookmarks))
		folders := make([]PlanFolder, 0, len(plan.Folders))
		for folderIndex, folder := range plan.Folders {
			folder.Name = strings.TrimSpace(folder.Name)
			if folder.Name == "" {
				folder.Name = fmt.Sprintf("分类 %d", folderIndex+1)
			}

			items := make([]PlanItem, 0, len(folder.Items))
			for _, item := range folder.Items {
				bookmark, ok := bookmarkByID[item.BookmarkID]
				if !ok {
					continue
				}
				if _, exists := seen[item.BookmarkID]; exists {
					continue
				}
				seen[item.BookmarkID] = struct{}{}
				item.Title = strings.TrimSpace(item.Title)
				if item.Title == "" {
					item.Title = bookmark.Title
				}
				if item.Confidence <= 0 {
					item.Confidence = 0.72
				}
				if item.Confidence > 1 {
					item.Confidence = 1
				}
				items = append(items, item)
			}

			if len(items) == 0 {
				continue
			}
			folder.Items = items
			folders = append(folders, folder)
		}

		missingItems := make([]PlanItem, 0)
		for _, bookmarkID := range allIDs {
			if _, exists := seen[bookmarkID]; exists {
				continue
			}
			bookmark := bookmarkByID[bookmarkID]
			missingItems = append(missingItems, PlanItem{
				BookmarkID: bookmark.ID,
				Confidence: 0.45,
				Title:      bookmark.Title,
			})
		}
		if len(missingItems) > 0 {
			folders = append(folders, PlanFolder{Name: "待确认", Items: missingItems})
		}

		if len(folders) == 0 {
			continue
		}

		if len(folders) > 6 {
			overflow := PlanFolder{Name: "其他"}
			kept := make([]PlanFolder, 0, 6)
			for folderIndex, folder := range folders {
				if folderIndex < 5 {
					kept = append(kept, folder)
					continue
				}
				overflow.Items = append(overflow.Items, folder.Items...)
			}
			if len(overflow.Items) > 0 {
				kept = append(kept, overflow)
			}
			folders = kept
		}

		plan.Folders = folders
		if strings.TrimSpace(plan.Description) == "" {
			plan.Description = summarizeFolders(folders)
		}
		if strings.TrimSpace(plan.ConfidenceSummary) == "" {
			plan.ConfidenceSummary = summarizeConfidence(folders)
		}
		normalized = append(normalized, plan)
	}

	return normalized
}

func buildFallbackPlans(bookmarks []model.Bookmark) []Plan {
	return []Plan{
		buildDomainPlan(bookmarks),
		buildTopicPlan(bookmarks),
	}
}

func buildDomainPlan(bookmarks []model.Bookmark) Plan {
	grouped := map[string][]PlanItem{}
	for _, bookmark := range bookmarks {
		label := normalizeDomainLabel(bookmark.URL)
		grouped[label] = append(grouped[label], PlanItem{
			BookmarkID: bookmark.ID,
			Confidence: 0.7,
			Title:      bookmark.Title,
		})
	}

	folders := make([]PlanFolder, 0, len(grouped))
	keys := make([]string, 0, len(grouped))
	for key := range grouped {
		keys = append(keys, key)
	}
	slices.Sort(keys)
	for _, key := range keys {
		folders = append(folders, PlanFolder{Name: key, Items: grouped[key]})
	}

	return Plan{
		ID:                "fallback_domain",
		Name:              "按站点来源分类",
		Description:       "先按来源站点拆开，适合快速拆散混杂内容。",
		ConfidenceSummary: summarizeConfidence(folders),
		Folders:           folders,
	}
}

func buildTopicPlan(bookmarks []model.Bookmark) Plan {
	categories := map[string][]PlanItem{
		"前端": {},
		"后端": {},
		"AI": {},
		"工具": {},
		"阅读": {},
		"其他": {},
	}

	for _, bookmark := range bookmarks {
		label := inferTopicLabel(bookmark)
		categories[label] = append(categories[label], PlanItem{
			BookmarkID: bookmark.ID,
			Confidence: 0.68,
			Title:      bookmark.Title,
		})
	}

	folders := make([]PlanFolder, 0, len(categories))
	order := []string{"前端", "后端", "AI", "工具", "阅读", "其他"}
	for _, key := range order {
		items := categories[key]
		if len(items) == 0 {
			continue
		}
		folders = append(folders, PlanFolder{Name: key, Items: items})
	}

	return Plan{
		ID:                "fallback_topic",
		Name:              "按内容主题分类",
		Description:       "按技术方向和使用场景拆分，更接近日常查找路径。",
		ConfidenceSummary: summarizeConfidence(folders),
		Folders:           folders,
	}
}

func appendUniquePlans(existing []Plan, candidates ...Plan) []Plan {
	seenNames := make(map[string]struct{}, len(existing))
	for _, plan := range existing {
		seenNames[strings.TrimSpace(plan.Name)] = struct{}{}
	}
	for _, candidate := range candidates {
		name := strings.TrimSpace(candidate.Name)
		if _, exists := seenNames[name]; exists {
			continue
		}
		existing = append(existing, candidate)
		seenNames[name] = struct{}{}
	}
	return existing
}

func summarizeFolders(folders []PlanFolder) string {
	names := make([]string, 0, len(folders))
	for _, folder := range folders {
		names = append(names, folder.Name)
	}
	return strings.Join(names, " / ")
}

func summarizeConfidence(folders []PlanFolder) string {
	var total float64
	var count int
	for _, folder := range folders {
		for _, item := range folder.Items {
			total += item.Confidence
			count++
		}
	}
	if count == 0 {
		return "建议置信度一般，请先预览后再应用。"
	}
	average := total / float64(count)
	switch {
	case average >= 0.85:
		return "整体置信度较高，分类边界比较清晰。"
	case average >= 0.7:
		return "整体置信度中等，建议先预览再应用。"
	default:
		return "整体置信度偏低，建议重点检查低置信度条目。"
	}
}

func normalizeDomainLabel(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Host == "" {
		return "其他来源"
	}
	host := strings.TrimPrefix(strings.ToLower(parsed.Hostname()), "www.")
	if host == "" {
		return "其他来源"
	}
	return host
}

func inferTopicLabel(bookmark model.Bookmark) string {
	text := strings.ToLower(bookmark.Title + " " + bookmark.URL)
	switch {
	case strings.Contains(text, "react"), strings.Contains(text, "vue"), strings.Contains(text, "css"), strings.Contains(text, "javascript"), strings.Contains(text, "typescript"):
		return "前端"
	case strings.Contains(text, "go"), strings.Contains(text, "java"), strings.Contains(text, "mysql"), strings.Contains(text, "redis"), strings.Contains(text, "spring"), strings.Contains(text, "api"):
		return "后端"
	case strings.Contains(text, "ai"), strings.Contains(text, "llm"), strings.Contains(text, "gpt"), strings.Contains(text, "prompt"), strings.Contains(text, "agent"), strings.Contains(text, "embedding"):
		return "AI"
	case strings.Contains(text, "tool"), strings.Contains(text, "pdf"), strings.Contains(text, "chrome"), strings.Contains(text, "github"), strings.Contains(text, "download"):
		return "工具"
	case strings.Contains(text, "blog"), strings.Contains(text, "article"), strings.Contains(text, "guide"), strings.Contains(text, "docs"), strings.Contains(text, "知乎"), strings.Contains(text, "博客"):
		return "阅读"
	default:
		return "其他"
	}
}

func flattenFolderPaths(folders []repository.FolderTree, prefix string, builder *strings.Builder) {
	for _, folder := range folders {
		current := folder.Name
		if prefix != "" {
			current = prefix + "/" + folder.Name
		}
		builder.WriteString("- " + current + "\n")
		flattenFolderPaths(folder.Children, current, builder)
	}
}

func extractJSON(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```json")
		s = strings.TrimPrefix(s, "```")
		s = strings.TrimSuffix(s, "```")
		s = strings.TrimSpace(s)
	}
	return s
}

func (c *Client) callOpenAI(baseURL, apiKey, model string, messages []ChatMessage) (string, error) {
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	url := baseURL + "/chat/completions"

	body := map[string]any{
		"model":       model,
		"messages":    toMessageMaps(messages),
		"max_tokens":  1400,
		"temperature": 0.2,
	}
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", url, bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respData, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("AI 服务返回 %d: %s", resp.StatusCode, summarizeAIError(respData))
	}

	var result map[string]any
	json.Unmarshal(respData, &result)

	choices, ok := result["choices"].([]any)
	if !ok || len(choices) == 0 {
		return "", fmt.Errorf("AI 返回为空: %s", string(respData))
	}
	message := choices[0].(map[string]any)["message"].(map[string]any)
	return message["content"].(string), nil
}

func (c *Client) callAnthropic(baseURL, apiKey, model string, messages []ChatMessage) (string, error) {
	if baseURL == "" {
		baseURL = "https://api.anthropic.com/v1"
	}
	url := baseURL + "/messages"

	systemMsg := ""
	chatMsgs := make([]map[string]string, 0, len(messages))
	for _, message := range messages {
		if message.Role == "system" {
			systemMsg = message.Content
			continue
		}
		chatMsgs = append(chatMsgs, map[string]string{
			"role":    message.Role,
			"content": message.Content,
		})
	}

	body := map[string]any{
		"model":      model,
		"max_tokens": 4096,
		"messages":   chatMsgs,
	}
	if systemMsg != "" {
		body["system"] = systemMsg
	}
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", url, bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respData, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("AI 服务返回 %d: %s", resp.StatusCode, summarizeAIError(respData))
	}

	var result map[string]any
	json.Unmarshal(respData, &result)

	content, ok := result["content"].([]any)
	if !ok || len(content) == 0 {
		return "", fmt.Errorf("AI 返回为空: %s", string(respData))
	}
	return content[0].(map[string]any)["text"].(string), nil
}

func defaultModel(provider string) string {
	switch provider {
	case "dashscope":
		return "qwen3.6-plus"
	case "anthropic":
		return "claude-sonnet-4-20250514"
	case "deepseek":
		return "deepseek-chat"
	default:
		return "gpt-4o-mini"
	}
}

func summarizeAIError(body []byte) string {
	trimmed := strings.TrimSpace(string(body))
	if trimmed == "" {
		return "空响应"
	}

	var result map[string]any
	if err := json.Unmarshal(body, &result); err == nil {
		if errorValue, ok := result["error"]; ok {
			switch value := errorValue.(type) {
			case string:
				if value != "" {
					return value
				}
			case map[string]any:
				if message, ok := value["message"].(string); ok && message != "" {
					return message
				}
			}
		}
	}

	if len(trimmed) > 240 {
		return trimmed[:240]
	}

	return trimmed
}

func cloneMessages(messages []ChatMessage) []ChatMessage {
	cloned := make([]ChatMessage, len(messages))
	copy(cloned, messages)
	return cloned
}

func toMessageMaps(messages []ChatMessage) []map[string]string {
	mapped := make([]map[string]string, 0, len(messages))
	for _, message := range messages {
		mapped = append(mapped, map[string]string{
			"role":    message.Role,
			"content": message.Content,
		})
	}
	return mapped
}
