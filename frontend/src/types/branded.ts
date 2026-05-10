export interface Brand<T extends string> {
  readonly __brand: T
}

export type BookmarkId = string & Brand<'BookmarkId'>
export type FolderId = string & Brand<'FolderId'>

export function asBookmarkId(id: string): BookmarkId {
  return id as BookmarkId
}

export function asFolderId(id: string): FolderId {
  return id as FolderId
}
