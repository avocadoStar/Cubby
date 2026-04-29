# Cubby UI/UX Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the highest-impact UI, UX, and user-flow issues found in the 2026-04-30 audit without rewriting the product or changing bookmark data models.
**Architecture:** Keep the current React SPA and Go API structure, but tighten the state model, copy system, mobile shell behavior, and action density. Favor small component extractions and explicit state branches over a large redesign pass.
**Tech Stack:** React 19, TypeScript, Vite, TailwindCSS v4, TanStack Query, Zustand, dnd-kit, Go Gin backend

---

## File Map

**Frontend**
- Modify: `frontend/src/pages/MainPage.tsx`
- Modify: `frontend/src/pages/SettingsPage.tsx`
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/components/bookmarks/BookmarkList.tsx`
- Modify: `frontend/src/components/bookmarks/BookmarkGrid.tsx`
- Modify: `frontend/src/components/bookmarks/BatchActionBar.tsx`
- Modify: `frontend/src/components/bookmarks/FolderCascadePicker.tsx`
- Modify: `frontend/src/components/bookmarks/ImportModal.tsx`
- Modify: `frontend/src/components/ui/Modal.tsx`
- Modify: `frontend/src/components/ui/NoticeBanner.tsx`
- Modify: `frontend/src/utils/url.ts`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/index.css`
- Optional Create: `frontend/src/components/bookmarks/SearchEmptyState.tsx`
- Optional Create: `frontend/src/components/bookmarks/BookmarkOverflowMenu.tsx`
- Optional Create: `frontend/src/components/bookmarks/ImportResultSummary.tsx`

**Backend**
- Modify: `backend/internal/handler/setting.go`
- Modify: `backend/internal/ai/client.go`
- Modify: `backend/internal/handler/handler_test.go`

**Docs**
- Create: `docs/superpowers/plans/2026-04-30-ui-ux-remediation-plan.md`

## Public Interface Changes

- `POST /api/v1/settings/ai/test` should accept an optional JSON body containing `ai_provider`, `ai_base_url`, `ai_api_key`, and `ai_model`.
- If the request body is empty, preserve the current behavior and test the saved settings.
- If the request body is provided, test the draft values without persisting them to the database.
- No bookmark, folder, auth, or import payload shapes should change.

## Task 1: Separate Empty States And Clean Up Mixed-Language Copy

**Files:**
- Modify: `frontend/src/pages/MainPage.tsx`
- Modify: `frontend/src/utils/url.ts`
- Optional Create: `frontend/src/components/bookmarks/SearchEmptyState.tsx`

- [ ] Add explicit derived view states in `MainPage` for `libraryEmpty`, `folderEmpty`, `searchEmpty`, and `contentAvailable` instead of using one shared empty panel.
- [ ] When `searchQuery` is non-empty and the current result set is empty, render a search-specific empty state with actions to clear search and return to the full list.
- [ ] Keep the current “empty library” call to action only for the real zero-data case.
- [ ] Replace all English URL-validation strings in `normalizeBookmarkUrl()` with Chinese copy that matches the rest of the application.
- [ ] Replace the English metadata-preview status strings in `MainPage` with the same Chinese tone as the rest of the add-bookmark flow.
- [ ] Make invalid-URL feedback appear in exactly one place in the add modal: inline under the URL field. Do not also surface the same message as a global page banner for the same validation failure.
- [ ] Verify manually:
  - Login, search for a nonsense string, confirm the UI says “no search results” instead of “no bookmarks yet”.
  - Open add bookmark, enter an invalid URL, confirm all error copy is Chinese and scoped to the modal.

## Task 2: Make Folder Navigation Legible Under Real Data Volume

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/components/bookmarks/FolderCascadePicker.tsx`
- Modify: `frontend/src/index.css`

- [ ] Change sidebar tree expansion so non-active branches default to collapsed instead of fully expanded on first load.
- [ ] Auto-expand only the active folder path plus any branch the user explicitly opened in the current session.
- [ ] Preserve user-triggered open and close actions in `expandedIds` instead of letting the initial fully-open default dominate the tree.
- [ ] In `FolderCascadePicker`, display disambiguated folder information for duplicate names. Use either full path text or a primary label plus secondary breadcrumb, but do not leave duplicate folder names visually identical.
- [ ] Keep “未分类” as a first-class option, but visually separate it from nested folder browsing so users understand it is a storage target, not part of the tree path.
- [ ] Reduce the visual weight of deep nested columns on small screens by capping visible column width and making the selected path easier to read.
- [ ] Verify manually:
  - Import the real bookmark file and confirm the sidebar does not explode into a fully expanded wall of folders.
  - Open edit bookmark and confirm the folder picker can distinguish two folders with the same name.

## Task 3: Remove The Destructive Side Effect From “测试连接”

**Files:**
- Modify: `frontend/src/pages/SettingsPage.tsx`
- Modify: `frontend/src/services/api.ts`
- Modify: `backend/internal/handler/setting.go`
- Modify: `backend/internal/ai/client.go`
- Modify: `backend/internal/handler/handler_test.go`

- [ ] Add a draft-aware test path for AI settings so “测试连接” no longer persists empty or incomplete form values before testing.
- [ ] Refactor `ai.Client.Test()` into a saved-settings path plus a draft-input path, so the handler can test either source without duplicating provider logic.
- [ ] Update `POST /api/v1/settings/ai/test` to accept optional draft settings and pass them to the client without writing them through `SettingRepo`.
- [ ] On the frontend, disable “测试连接” when the draft is obviously incomplete for a network test, starting with a missing API key.
- [ ] Keep “保存设置” separate from “测试连接”. A successful test should not silently imply a save.
- [ ] Show draft validation errors next to the relevant field or at the top of the settings card, not only as a banner with backend wording.
- [ ] Add backend tests covering:
  - empty request body uses saved settings
  - draft request tests without persisting
  - missing API key returns the existing `NO_API_KEY` error shape
- [ ] Verify manually:
  - Open settings with blank fields and confirm “测试连接” does not wipe saved settings just to fail.
  - Provide a draft payload and confirm the test path runs without mutating stored values.

## Task 4: Rebuild Import Completion As A Result Screen Instead Of Reusing The Upload Screen

**Files:**
- Modify: `frontend/src/components/bookmarks/ImportModal.tsx`
- Modify: `frontend/src/pages/MainPage.tsx`
- Optional Create: `frontend/src/components/bookmarks/ImportResultSummary.tsx`

- [ ] Split the import modal into three explicit modes: `idle`, `running`, and `completedOrFailed`.
- [ ] In the completed mode, remove the giant dashed upload dropzone from the primary viewport area and replace it with a result summary plus clear next actions.
- [ ] Keep the completion summary compact: show created count, duplicate count, and a collapsed or scroll-limited folder list instead of a single long paragraph.
- [ ] Add primary and secondary post-import actions such as “查看导入结果” and “再次导入”.
- [ ] Clarify duplicate handling by adding a short sentence that explains whether duplicate detection is based on URL and that skipped bookmarks were not re-imported.
- [ ] Verify manually with the provided bookmark export:
  - result counts are readable
  - duplicate-heavy imports do not leave users wondering whether anything happened
  - the modal no longer looks like a pre-import screen after completion

## Task 5: Reduce Action Density In Bookmark Rows And Cards

**Files:**
- Modify: `frontend/src/components/bookmarks/BookmarkList.tsx`
- Modify: `frontend/src/components/bookmarks/BookmarkGrid.tsx`
- Modify: `frontend/src/components/bookmarks/BatchActionBar.tsx`
- Optional Create: `frontend/src/components/bookmarks/BookmarkOverflowMenu.tsx`
- Modify: `frontend/src/index.css`

- [ ] Keep visible desktop actions limited to the highest-frequency controls. Move destructive or low-frequency actions behind an overflow menu instead of showing favorite, edit, and delete on every row at all times.
- [ ] On mobile widths, collapse row-level edit and delete actions into an overflow menu. Keep direct tap targets large enough to avoid accidental taps.
- [ ] Improve list-row spacing so the drag handle, checkbox, favicon, title, domain, and actions do not read as a single compressed strip.
- [ ] Adjust grid layout so sparse result sets do not leave a tiny card stranded in a large empty canvas. Use responsive `minmax()` sizing or max-width constraints that keep one-card views visually anchored.
- [ ] Update batch-selection copy from “全选已加载” to language that explicitly communicates scope, such as “选择当前已加载 50 条”.
- [ ] Update the batch bar so the selected-count summary and actions remain clear when wrapping on narrower widths.
- [ ] Verify manually:
  - Desktop list rows scan cleanly.
  - Grid cards still feel intentional with one result and with many results.
  - Mobile rows do not expose an icon wall.

## Task 6: Fix The Mobile Drawer And Modal Shell

**Files:**
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/components/ui/Modal.tsx`
- Modify: `frontend/src/index.css`

- [ ] Constrain the inner mobile sidebar motion container to the actual sidebar width instead of letting it behave like a full-screen hit blocker.
- [ ] Keep the scrim clickable outside the drawer so users can reliably dismiss the mobile navigation.
- [ ] Add a visible close affordance for the mobile drawer header instead of relying only on tapping the overlay.
- [ ] Convert high-form-density modals on small screens into a mobile-friendly pattern: either a full-height sheet or a top-aligned scrollable panel with stronger section separation.
- [ ] Ensure modal headers remain sticky or visually persistent enough that users do not lose the close control while scrolling long forms.
- [ ] Verify manually on a narrow mobile viewport:
  - open drawer
  - close drawer by tapping outside
  - reopen drawer and navigate
  - open add/edit modal and confirm controls remain reachable without cramped scrolling

## Task 7: Tighten Feedback Hierarchy And Success/Error Visibility

**Files:**
- Modify: `frontend/src/components/ui/NoticeBanner.tsx`
- Modify: `frontend/src/pages/MainPage.tsx`
- Modify: `frontend/src/pages/SettingsPage.tsx`

- [ ] Differentiate between page-level banners and event-level toasts instead of using the same low-contrast horizontal strip for almost everything.
- [ ] Keep transient success messages in toast form near the viewport edge so users notice import completion, bookmark updates, and batch actions.
- [ ] Reserve full-width inline banners for blocking or form-related errors that need immediate attention in context.
- [ ] Remove ambiguous “关闭” controls where the same page can show multiple dismissable surfaces with identical labels.
- [ ] Verify manually:
  - import success is noticeable without re-scanning the page
  - settings errors are visible and tied to the form
  - bookmark update success does not get lost between the header and list body

## Task 8: Verification And Acceptance Pass

**Files:**
- No new source files required

- [ ] Run frontend verification:

```bash
cd frontend
npm run lint
npm run build
```

- [ ] Run backend verification:

```bash
cd backend
go test ./...
```

- [ ] Run manual acceptance against the real local environment:
  - login with wrong password and valid password
  - search with hits and misses
  - add bookmark with invalid and valid URL
  - edit a bookmark in a duplicated folder-name tree
  - run import with `C:\Users\15638\Desktop\favorites_2026_4_28.html`
  - open settings and test the no-API-key path
  - verify desktop, tablet-width, and mobile-width layouts

## Assumptions

- This plan intentionally skips AI organize-flow redesign and focuses only on the settings test flow side effect.
- Bookmark and folder persistence models stay unchanged.
- The preferred implementation style is incremental improvement of the existing component tree, not a full visual redesign.
- If backend draft-testing support for AI settings is judged too invasive, the fallback is to block test execution unless the current form matches saved values. That fallback should be treated as second choice, not the primary fix.
