package handler

type createBookmarkRequest struct {
	Title    string  `json:"title"`
	URL      string  `json:"url"`
	Icon     string  `json:"icon"`
	FolderID *string `json:"folder_id"`
}

type updateBookmarkRequest struct {
	Title   string `json:"title"`
	URL     string `json:"url"`
	Version int    `json:"version"`
}

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

type createFolderRequest struct {
	Name     string  `json:"name"`
	ParentID *string `json:"parent_id"`
}

type updateFolderRequest struct {
	Name    string `json:"name"`
	Version int    `json:"version"`
}

type moveFolderRequest struct {
	ID       string  `json:"id"`
	ParentID *string `json:"parent_id"`
	PrevID   *string `json:"prev_id"`
	NextID   *string `json:"next_id"`
	Version  int     `json:"version"`
}

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
