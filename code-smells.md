# Code Review Report

## Critical Issues

### 1. State transition without validation (store.ts:291-304)
`moveCard` accepts and processes card movement without validating that the current state is valid for the transition. It only checks `if (card == null)`, but doesn't verify the card's current columnId/position are consistent with expectations before mutation.

### 2. Direct store access from render callback (App.tsx:544-548)
Uses `useAppStore.getState()` inside render callbacks for `updateColumn` and `deleteColumn`. This breaks React's reactive contract - components using these won't re-render if those methods change. Should use the destructured actions from the hook.

### 3. No loading state guard before data operations (App.tsx:460-481)
`handleMove` operates on `cards`/`columns` state during drag without checking if the initial `load()` completed. If drag happens during loading, state could be inconsistent.

---

## Minor Issues

### 1. Duplicated sort comparator logic (model.ts:50-51, 67, 82)
The position comparison `(a.position < b.position ? -1 : a.position > b.position ? 1 : 0)` is repeated 4 times. Should be extracted to a helper.

### 2. Leaking internal representation via function signatures (model.ts:81-83)
`getSortedBoards` takes `Record<BoardId, Board>` but doesn't need boardId filtering (unlike `getSortedColumns`). Inconsistent API across similar functions - one filters, one doesn't.

### 3. Redundant type assertions (dnd.tsx:47, 54)
`constructMoveInfo` uses `String()` casts on `source.id`/`target.id` which are already typed, suggests the types from dnd-kit may be `unknown` but the cast hides potential type issues.

### 4. Incomplete type narrowing in switch (store.ts:104-148)
The `initAuth` switch covers specific cases but has no default case. If Supabase adds new auth events, they'll be silently ignored. Should add exhaustive check or explicit default.

### 5. Cards grouped by columnId computed twice (App.tsx:281-287, dnd.tsx:196-213)
`ColumnContent` filters cards by columnId, but `Dnd.ColumnList` also computes `cardsByColumn` map. Redundant computation when rendering columns.

### 6. Magic string 'board' for column groupId (dnd.tsx:280)
Hardcoded string `'board'` as groupId for columns. Not type-safe and could mismatch if used elsewhere.

### 7. Error swallowed in persist wrapper (store.ts:80)
The `persist` helper catches errors and sets them in state, but the original caller (e.g., `addBoard`) continues without knowing the persist failed. Optimistic update succeeds even when persist fails.

### 8. activeBoardId stored in localStorage (api.ts:99-103, 125)
`activeBoardId` stored in localStorage but not validated against user scope. If user A logs out and user B logs in, stale activeBoardId from user A may be used until `fetchAll` runs.

### 9. Mixed concerns in api.ts (api.ts:99-103)
`persistActiveBoardId` uses localStorage (client-only) while other persist functions use Supabase. The `Promise.resolve().then()` wrapper makes it artificially async for consistency, but this is a code smell.

### 10. Unused `index` in ListItem (dnd.tsx:135, 145)
`index` is passed to `ListItem` and forwarded to `useSortable`, but dnd-kit's `useSortable` doesn't require `index` - it auto-computes from DOM order. May be causing unnecessary re-renders.
