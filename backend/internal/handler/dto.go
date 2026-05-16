package handler

// createBookmarkRequest corresponds to api.createBookmark() body
type createBookmarkRequest struct {
	Title    string  `json:"title"`
	URL      string  `json:"url"`
	Icon     string  `json:"icon"`
	FolderID *string `json:"folder_id"`
}

// updateBookmarkRequest corresponds to api.updateBookmark() body
type updateBookmarkRequest struct {
	Title   string `json:"title"`
	URL     string `json:"url"`
	Version int    `json:"version"`
}

// moveBookmarkRequest corresponds to api.moveBookmark() body / MoveRequest
type moveBookmarkRequest struct {
	ID       string  `json:"id"`
	FolderID *string `json:"folder_id"`
	PrevID   *string `json:"prev_id"`
	NextID   *string `json:"next_id"`
	Version  int     `json:"version"`
}

type batchDeleteRequest struct {
	IDs []string `json:"ids"`
}

type updateNotesRequest struct {
	Notes string `json:"notes"`
}

// createFolderRequest corresponds to api.createFolder() body
type createFolderRequest struct {
	Name     string  `json:"name"`
	ParentID *string `json:"parent_id"`
}

// updateFolderRequest corresponds to api.updateFolder() body
type updateFolderRequest struct {
	Name    string `json:"name"`
	Version int    `json:"version"`
}

// moveFolderRequest corresponds to api.moveFolder() body / MoveRequest
type moveFolderRequest struct {
	ID       string  `json:"id"`
	ParentID *string `json:"parent_id"`
	PrevID   *string `json:"prev_id"`
	NextID   *string `json:"next_id"`
	Version  int     `json:"version"`
}

// batchMoveItem corresponds to api.batchMove() body / BatchMoveItem
type batchMoveItem struct {
	Kind     string  `json:"kind"`
	ID       string  `json:"id"`
	ParentID *string `json:"parent_id"`
	PrevID   *string `json:"prev_id"`
	NextID   *string `json:"next_id"`
	Version  int     `json:"version"`
}

type batchMoveRequest struct {
	Items []batchMoveItem `json:"items"`
}

type loginRequest struct {
	Password string `json:"password"`
}

type createPreviewSessionRequest struct {
	URL  string `json:"url"`
	Mode string `json:"mode"`
}
