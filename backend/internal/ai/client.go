package ai

import (
	"bytes"
	"cubby/internal/model"
	"cubby/internal/repository"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	settingRepo *repository.SettingRepo
	httpClient  *http.Client
}

func NewClient(settingRepo *repository.SettingRepo) *Client {
	return &Client{
		settingRepo: settingRepo,
		httpClient:  &http.Client{Timeout: 60 * time.Second},
	}
}

type OrganizeRequest struct {
	Action   string `json:"action"`
	FolderID string `json:"folder_id"`
}

type Suggestion struct {
	BookmarkID      string  `json:"bookmark_id"`
	Title           string  `json:"title"`
	SuggestedFolder string  `json:"suggested_folder"`
	NewFolderName   string  `json:"new_folder_name,omitempty"`
	Confidence      float64 `json:"confidence"`
	Reason          string  `json:"reason"`
}

type OrganizeResponse struct {
	Suggestions []Suggestion `json:"suggestions"`
}

func (c *Client) Organize(bookmarks []model.Bookmark, folders []repository.FolderTree, req OrganizeRequest) (*OrganizeResponse, error) {
	settings, err := c.settingRepo.GetAll()
	if err != nil {
		return nil, err
	}

	apiKey := settings["ai_api_key"]
	if apiKey == "" {
		return nil, fmt.Errorf("请先在设置中配置 AI API Key")
	}
	provider := settings["ai_provider"]
	modelName := settings["ai_model"]
	if modelName == "" {
		modelName = defaultModel(provider)
	}
	baseURL := settings["ai_base_url"]

	var folderList strings.Builder
	for _, f := range folders {
		folderList.WriteString("- " + f.Name)
		for _, child := range f.Children {
			folderList.WriteString(" / " + child.Name)
		}
		folderList.WriteString("\n")
	}

	var bmList strings.Builder
	for _, b := range bookmarks {
		bmList.WriteString(fmt.Sprintf("[%s] %s | %s\n", b.ID, b.Title, b.URL))
	}

	prompt := fmt.Sprintf(`你是一个书签整理助手。根据以下书签列表和现有文件夹结构，为每个书签推荐最合适的分类。

现有文件夹结构:
%s

书签列表:
%s

请为每个书签推荐分类。使用现有文件夹路径（如 "开发工具/Go"），如果都不合适可以建议新建文件夹。
以 JSON 数组格式返回，每个元素包含:
- bookmark_id: 书签ID
- suggested_folder: 推荐的文件夹路径
- new_folder_name: 如需新建则填写名称，否则为空
- confidence: 置信度 0-1
- reason: 推荐理由（中文，一句话）

仅返回 JSON，不要其他内容。`, folderList.String(), bmList.String())

	messages := []map[string]string{
		{"role": "system", "content": "你是一个书签整理助手，始终以 JSON 格式返回结果。"},
		{"role": "user", "content": prompt},
	}

	var respBody string
	switch provider {
	case "anthropic":
		respBody, err = c.callAnthropic(baseURL, apiKey, modelName, messages)
	default:
		respBody, err = c.callOpenAI(baseURL, apiKey, modelName, messages)
	}
	if err != nil {
		return nil, err
	}

	respBody = extractJSON(respBody)

	var suggestions []Suggestion
	if err := json.Unmarshal([]byte(respBody), &suggestions); err != nil {
		return nil, fmt.Errorf("AI 返回格式解析失败: %w", err)
	}

	return &OrganizeResponse{Suggestions: suggestions}, nil
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

func (c *Client) callOpenAI(baseURL, apiKey, model string, messages []map[string]string) (string, error) {
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	url := baseURL + "/chat/completions"

	body := map[string]any{"model": model, "messages": messages}
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
	var result map[string]any
	json.Unmarshal(respData, &result)

	choices, ok := result["choices"].([]any)
	if !ok || len(choices) == 0 {
		return "", fmt.Errorf("AI 返回为空: %s", string(respData))
	}
	message := choices[0].(map[string]any)["message"].(map[string]any)
	return message["content"].(string), nil
}

func (c *Client) callAnthropic(baseURL, apiKey, model string, messages []map[string]string) (string, error) {
	if baseURL == "" {
		baseURL = "https://api.anthropic.com/v1"
	}
	url := baseURL + "/messages"

	systemMsg := ""
	var chatMsgs []map[string]string
	for _, m := range messages {
		if m["role"] == "system" {
			systemMsg = m["content"]
			continue
		}
		chatMsgs = append(chatMsgs, m)
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
	case "anthropic":
		return "claude-sonnet-4-20250514"
	default:
		return "gpt-4o-mini"
	}
}
