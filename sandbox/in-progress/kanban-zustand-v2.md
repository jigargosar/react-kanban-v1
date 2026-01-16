# Kanban State Model (Zustand)

> **How to read this document**
>
> This is a *reference design* — what the state model would look like if designed from scratch with ISI (Impossible States Impossible) principles. It captures the *spirit* of the architecture, not a literal refactoring spec.
>
> The current codebase may differ in naming and structural details. That's fine. Use this as a north star for design decisions, not a checklist of renames.

---

This document describes the state model for the kanban application using TypeScript discriminated unions and Zustand.

See `kanban-design.md` for requirements and core architecture concepts.

---

## Design Principles

1. **Discriminated unions** — State is explicit, exhaustive pattern matching
2. **Flat data** — Entities in records with ID references (like a database)
3. **Optimistic updates** — UI updates immediately, rollback on failure
4. **Serial mutations** — Global queue prevents race conditions
5. **Minimal store** — Only track what components can't handle locally
6. **Local UI state** — Edit/add modes live in components, not store

---

## App State

```typescript
type AppState =
  | { tag: 'initializing' }
  // Checking auth status via Supabase onAuthStateChange
  
  | { tag: 'unauthenticated' }
  // No session, show login
  
  | { tag: 'authenticating' }
  // OAuth flow in progress
  // Future: could track provider, redirect state
  
  | { tag: 'authenticated'; user: User }
  // Session valid, loading user data
  // Future: could split into authenticated.loading, authenticated.error
  
  | { tag: 'error'; error: AppError }
  // Fatal error (auth failed, initial load failed)
  // Future: typed errors, retry capabilities
  
  | { tag: 'ready'; data: ReadyData }
  // App ready, user data loaded
```

---

## Ready Data

```typescript
type ReadyData = {
  // --- User ---
  user: User;
  
  // --- Entity Collections ---
  // Future: pagination, partial loading, cache invalidation
  boards: Record<BoardId, Board>;
  columns: Record<ColumnId, Column>;
  cards: Record<CardId, Card>;
  
  // --- UI State ---
  activeBoardId: BoardId | null;
  // null when no boards exist
  // Future: persist in localStorage, URL param
  
  // --- Mutation State ---
  mutationError: MutationError | null;
  // Last failed mutation, shown as notification
  // Cleared manually by user (dismiss button)
  // Future: error queue, retry actions, per-entity errors
  
  // --- Future Fields ---
  // search: SearchState
  // filters: FilterState
  // selection: Set<string> (multi-select)
  // undoStack: UndoAction[]
  // syncStatus: 'synced' | 'pending' | 'offline'
};
```

**Note:** No `interaction` or `editing` state. Edit/add modes are component-local (see "UI State Ownership" below).

---

## Entities

```typescript
type BoardId = string;  // Could be branded type
type ColumnId = string;
type CardId = string;
type UserId = string;

type User = {
  id: UserId;
  email: string;
  name: string | null;
  // From Supabase auth
  // Future: avatar, preferences
};

type Board = {
  id: BoardId;
  title: string;
  position: string;
  // Fractional indexing (e.g., "a0", "a1", "a0V")
  // Future: description, color, ownerId, archived, createdAt, updatedAt
};

type Column = {
  id: ColumnId;
  boardId: BoardId;
  // Foreign key
  title: string;
  position: string;
  // Future: color, wipLimit, archived
};

type Card = {
  id: CardId;
  columnId: ColumnId;
  // Foreign key
  title: string;
  position: string;
  // Future: description, assigneeId, dueDate, labels, archived, status
  // status: 'active' | 'archived' | 'deleted'
};
```

---

## UI State Ownership

**Principle:** If only one component needs to know, keep it local.

| State | Where | Why |
|-------|-------|-----|
| Edit mode (inline) | Component `useState` | Only the entity component needs to know |
| Add mode | Component `useState` | Only the add button/form needs to know |
| Dialog open | Component `useState` or Router | Triggered from entity component, or URL-driven |
| Which board active | Store | Multiple components need this (header, columns) |
| Entity data | Store | Shared across components, persisted |

**Edit/Add flow:**
```typescript
// Component-local edit
function CardItem({ card }) {
  const [isEditing, setIsEditing] = useState(false)
  
  return isEditing 
    ? <EditableInput onSave={...} onCancel={() => setIsEditing(false)} />
    : <div onDoubleClick={() => setIsEditing(true)}>{card.title}</div>
}

// Component-local add
function AddCardButton({ columnId }) {
  const [isAdding, setIsAdding] = useState(false)
  
  return isAdding
    ? <EditableInput onSave={(title) => { addCard(columnId, title); setIsAdding(false) }} />
    : <button onClick={() => setIsAdding(true)}>+ Add card</button>
}
```

**Mutual exclusivity:** Handled naturally by browser focus. When one input focuses, others blur and save/cancel.

**Future dialogs:** Same pattern. Component that triggers dialog owns the state. Or use router for URL-driven dialogs.

---

## Errors

```typescript
type AppError = {
  code: string;
  message: string;
  // Future: cause, timestamp, retryable
};

type MutationError = {
  code: string;
  message: string;
  // Future: entityType, entityId, action, timestamp, retryAction
};
```

**Error handling strategy:**

- `{ tag: 'error' }` — Fatal errors (auth failed, initial load failed). App unusable.
- `mutationError` — Non-fatal. App continues, notification shown. User dismisses manually.

Why manual dismiss? If auto-cleared on next success, user might miss that a previous action failed.

---

## Store Shape

```typescript
type KanbanStore = {
  // --- State ---
  state: AppState;
  
  // --- Auth Actions ---
  // Called by Supabase onAuthStateChange callback
  handleAuthChange: (event: AuthChangeEvent, session: Session | null) => void;
  signIn: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  
  // --- Data Actions ---
  loadUserData: () => Promise<void>;
  
  // --- Board Actions ---
  addBoard: (title: string) => void;
  updateBoard: (boardId: BoardId, title: string) => void;
  deleteBoard: (boardId: BoardId) => void;
  setActiveBoard: (boardId: BoardId | null) => void;
  
  // --- Column Actions ---
  addColumn: (boardId: BoardId, title: string) => void;
  updateColumn: (columnId: ColumnId, title: string) => void;
  deleteColumn: (columnId: ColumnId) => void;
  moveColumn: (columnId: ColumnId, newPosition: string) => void;
  
  // --- Card Actions ---
  addCard: (columnId: ColumnId, title: string) => void;
  updateCard: (cardId: CardId, title: string) => void;
  deleteCard: (cardId: CardId) => void;
  moveCard: (cardId: CardId, toColumnId: ColumnId, newPosition: string) => void;
  
  // --- Error Actions ---
  clearMutationError: () => void;
  
  // --- Future Actions ---
  // undo: () => void
  // redo: () => void
  // search: (query: string) => void
  // setFilters: (filters: Filters) => void
  // bulkDelete: (ids: string[]) => void
  // bulkMove: (ids: string[], columnId: string) => void
};
```

**Removed from v1:** `setInteraction`, `clearInteraction`, `startEditing`, `stopEditing` — now component-local.

---

## Mutation Queue

External to store, handles all API calls serially:

```typescript
class MutationQueue {
  private queue: QueuedMutation[] = [];
  private processing = false;
  
  add(mutation: QueuedMutation): void {
    this.queue.push(mutation);
    this.process();
  }
  
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const { execute, onSuccess, onError } = this.queue[0];
    
    try {
      const result = await execute();
      onSuccess(result);
    } catch (error) {
      onError(error);
    }
    
    this.queue.shift();
    this.processing = false;
    this.process();
  }
}

type QueuedMutation = {
  execute: () => Promise<unknown>;
  onSuccess: (result: unknown) => void;
  onError: (error: unknown) => void;
  // Future: id, entityType, entityId, action, retryCount, createdAt
};
```

**Current implementation:** Simpler `createPersistQueue` function. Works the same way, less structure. Can evolve to class when rollback/retry needed.

---

## Auth Flow

```
┌──────────────┐
│ initializing │
└──────┬───────┘
       │ onAuthStateChange
       ▼
┌──────────────────┐    signIn()    ┌────────────────┐
│ unauthenticated  │───────────────►│ authenticating │
└──────────────────┘                └───────┬────────┘
       ▲                                    │
       │ signOut() or                       │ onAuthStateChange
       │ onAuthStateChange(SIGNED_OUT)      │ (SIGNED_IN)
       │                                    ▼
       │                            ┌───────────────┐
       │                            │ authenticated │
       │                            └───────┬───────┘
       │                                    │ loadUserData()
       │                                    ▼
       │         ┌───────┐ failure ┌───────────────┐
       └─────────│ error │◄────────│    ready      │
                 └───────┘         └───────────────┘
                                          │
                                          │ onAuthStateChange(SIGNED_OUT)
                                          ▼
                                   ┌──────────────────┐
                                   │ unauthenticated  │
                                   └──────────────────┘
```

**Note:** Supabase `onAuthStateChange` can fire at any time. Store handles by transitioning to appropriate state regardless of current state.

---

## Action Flow (Optimistic Update)

```
User action (e.g., updateCard)
       │
       ▼
┌─────────────────────────────┐
│ 1. Update state immediately │ (optimistic)
│ 2. Add to MutationQueue     │
└─────────────────────────────┘
       │
       ▼
MutationQueue.process()
       │
       ├── Success ──► Done (no action needed)
       │
       └── Failure ──► Set mutationError
                       (no rollback for now)
```

**Simplification:** No rollback currently. Failed mutation shows error, state stays optimistic. User can retry or refresh.

**Future:** Store previous state, rollback on failure.

---

## Derived Data (Selectors)

```typescript
// These would be Zustand selectors or computed in components

// Columns for active board, sorted by position
const columnsForActiveBoard = (data: ReadyData): Column[] =>
  Object.values(data.columns)
    .filter(c => c.boardId === data.activeBoardId)
    .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));

// Cards for a column, sorted by position
const cardsForColumn = (data: ReadyData, columnId: ColumnId): Card[] =>
  Object.values(data.cards)
    .filter(c => c.columnId === columnId)
    .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));

// All boards sorted by position
const sortedBoards = (data: ReadyData): Board[] =>
  Object.values(data.boards)
    .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));

// Future selectors:
// - cardsMatchingSearch(query)
// - filteredCards(filters)
// - cardsByAssignee(assigneeId)
// - overdueCards()
```

---

## Simplifications (Current vs Future)

| Concern | Current | Future |
|---------|---------|--------|
| Data loading | All upfront | Paginated, lazy load per board |
| Error handling | Single mutationError, manual dismiss | Per-entity errors, retry actions |
| Rollback | None (optimistic stays) | Revert state on failure |
| Auth | OAuth only | Email/password, magic link |
| Entity states | Just data | archived, deleted soft states |
| Delete | Hard delete (Supabase cascade) | Soft delete with archive |
| Edit/add state | Component-local | Store (if cross-component needed) |
| Dialogs | Component-local or router | Store (if complex coordination needed) |
| Confirmations | Component-level | Could move to store if needed |
| Drag & drop | View handles via dnd-kit | Same |
| Multi-select | Not supported | Bulk operations via store |
| Undo/redo | Not supported | Action stack in store |
| Offline | Not supported | Queue persistence, sync status |
| Real-time | Not supported | Supabase subscriptions |

---

## Open Questions

1. **Position conflicts:** Two users add card simultaneously — both get same position?
2. **Cascade on delete:** Delete board deletes columns and cards — how to handle partial failure?
3. **Active board persistence:** localStorage? URL? What if board deleted?
4. **Auth token refresh:** Supabase handles, but do we need loading state during refresh?

---

## Changes from v1

1. **Removed `interaction` from store** — Edit/add state is component-local
2. **Removed `setInteraction`, `clearInteraction` actions** — Not needed
3. **Added "UI State Ownership" section** — Documents what lives where and why
4. **Renamed `ReadyState` → `ReadyData`** — Clearer that it's data, not a state machine state
5. **Simplified error handling** — Manual dismiss only, no auto-clear on success
