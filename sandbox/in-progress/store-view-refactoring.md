# Store-View Refactoring

## Architecture

| Layer | File | Responsibility |
|-------|------|----------------|
| Model | `model.ts` | Types, factories, pure queries |
| API | `api.ts` | Supabase persistence, auth |
| Store | `store.ts` | State + actions (Zustand) |
| DnD | `dnd.tsx` | Drag-drop abstraction |
| View | `App.tsx` | UI components |

## Current Issues

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 1 | Inline filtering in view | `App.tsx:448-450` | Pending |
| 2 | Direct `getState()` calls in callbacks | `App.tsx:498,502` | Pending |
| 3 | Model function import in view | `App.tsx:2,14` | Pending |
| 4 | No selector layer in store | `store.ts` | Pending |

### Details

**#1 View contains derived state logic**
```tsx
const boardColumns = activeBoardId != null
  ? Object.fromEntries(Object.entries(columns).filter(([, col]) => col.boardId === activeBoardId))
  : {}
```

**#2 Direct store access bypasses React subscriptions**
```tsx
useAppStore.getState().updateColumn(column.id, title)
useAppStore.getState().deleteColumn(column.id)
```

**#3 View imports and calls model functions directly**
```tsx
import { getSortedBoards } from './model'
const sortedBoards = getSortedBoards(boards)
```

**#4 Store exposes raw records, views derive sorted/filtered lists**

## Solutions

| # | Solution |
|---|----------|
| 1 | Add `useActiveBoardColumns()` selector in store |
| 2 | Pass actions via hook destructuring, not `getState()` |
| 3 | Add `useSortedBoards()` selector, view imports from store only |
| 4 | Add selector hooks: `useSortedBoards`, `useActiveBoardColumns`, `useColumnCards(colId)` |

### Selector Hooks Pattern

```ts
// store.ts - add selectors
export const useSortedBoards = () => useAppStore((s) => getSortedBoards(s.boards))

export const useActiveBoardColumns = () => useAppStore((s) =>
  s.activeBoardId != null
    ? Object.fromEntries(Object.entries(s.columns).filter(([, c]) => c.boardId === s.activeBoardId))
    : {}
)
```

Views import from store only, never from model.

### Scoped Hooks (Future)

```tsx
// Current: exposes everything
const { boards, cards, columns, moveCard, ... } = useAppStore()

// Better: scoped access
const { cards, addCard, updateCard } = useCards()
const { editing, startEditing, stopEditing } = useEditing()
```

Benefits: encapsulation, re-render optimization, clear API surface, refactoring safety.

## Summary

- [x] API layer properly isolated
- [x] Model has no side effects
- [ ] View does derived state computation (belongs in store)
- [ ] View imports model functions directly
- [ ] Direct `getState()` calls in render callbacks
