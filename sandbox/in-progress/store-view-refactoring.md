## Boundary Analysis: App vs Store

### Current Architecture Overview

| Layer | File | Responsibility |
|-------|------|----------------|
| Model | `model.ts` | Types, factory functions, pure queries |
| API | `api.ts` | Supabase client, persistence, auth |
| Store | `store.ts` | State + actions (zustand) |
| DnD | `dnd.tsx` | Drag-drop abstraction |
| View | `App.tsx` | UI components |

---

## Problems

### 1. **View contains derived state logic**
`App.tsx:449-451` filters columns for active board inline:
```tsx
const boardColumns = activeBoardId
  ? Object.fromEntries(Object.entries(columns).filter(([, col]) => col.boardId === activeBoardId))
  : {}
```
**Issue**: This derivation belongs in store as a selector.

### 2. **View calls `useAppStore.getState()` directly**
`App.tsx:499,503`:
```tsx
useAppStore.getState().updateColumn(...)
useAppStore.getState().deleteColumn(...)
```
**Issue**: Direct store access bypasses React's subscription model. Should use hook-provided actions.

### 3. **Model imports in View**
`App.tsx:2` imports `getSortedBoards` from model and uses it in `BoardSelector`:
```tsx
const sortedBoards = getSortedBoards(boards)
```
**Issue**: Views should get sorted data from store selectors, not call model functions directly.

### 4. **`dnd.tsx` is pure but has tight coupling to card/column types**
`dnd.tsx:15` hardcodes `DndType = 'card' | 'column'` - this is okay since it's view-related.

### 5. **No selector layer**
Store exposes raw `cards`, `columns`, `boards` - views must derive sorted/filtered lists themselves.

---

## Recommendations

| # | Problem | Solution |
|---|---------|----------|
| 1 | Inline filtering in view | Add `getActiveBoardColumns` selector in store |
| 2 | Direct `getState()` calls | Pass actions via hook destructuring |
| 3 | Model imports in view | Add `getSortedBoards` selector in store, expose via hook |
| 4 | No selector layer | Add computed selectors: `sortedBoards`, `activeBoardColumns`, `getColumnCards(colId)` |

### Proposed Store Selectors

```ts
// In store.ts, add selectors:
export const useActiveBoardColumns = () => useAppStore((s) =>
  s.activeBoardId
    ? Object.fromEntries(Object.entries(s.columns).filter(([, c]) => c.boardId === s.activeBoardId))
    : {}
)

export const useSortedBoards = () => useAppStore((s) => getSortedBoards(s.boards))
```

Then views import from store only, never from model.

---

## Summary

The boundary is **mostly clean** but has a few leaks:
1. ✅ API layer properly isolated
2. ✅ Model has no side effects
3. ⚠️ View does derived state computation that belongs in store
4. ⚠️ View imports model functions directly
5. ⚠️ Direct `getState()` calls in render callbacks
