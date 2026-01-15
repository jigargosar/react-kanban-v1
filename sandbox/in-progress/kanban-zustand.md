# Kanban State Model (Zustand)

> **How to read this document**
>
> This is a *reference design* — what the state model would look like if designed from scratch with ISI (Impossible States Impossible) principles. It captures the *spirit* of the architecture, not a literal refactoring spec.
>
> The current codebase may differ in naming (`Card` vs `Task`, `editing` vs `Interaction`) and structural details. That's fine. Use this as a north star for design decisions, not a checklist of renames.

---

This document describes the state model for the kanban application using TypeScript discriminated unions and Zustand.

See `kanban-design.md` for requirements and core architecture concepts.

---

## Design Principles

1. **Discriminated unions** — State is explicit, exhaustive pattern matching
2. **Flat data** — Entities in records with ID references (like a database)
3. **Optimistic updates** — UI updates immediately, rollback on failure
4. **Serial mutations** — Global queue prevents race conditions
5. **Minimal model** — Only track what components can't handle locally

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
  // Future: could be { tag: 'authenticated'; user: User; dataState: DataState }
  // where DataState = 'loading' | 'ready' | 'error' for more granularity
  
  | { tag: 'error'; error: AppError }
  // Fatal error (auth failed, initial load failed)
  // Future: typed errors, retry capabilities
  
  | { tag: 'ready'; data: ReadyState }
  // App ready, user data loaded
```

---

## Ready State

```typescript
type ReadyState = {
  // --- User ---
  user: User;
  
  // --- Entity Collections ---
  // Future: pagination, partial loading, cache invalidation
  boards: Record<string, Board>;
  columns: Record<string, Column>;
  tasks: Record<string, Task>;
  
  // --- UI State ---
  activeBoardId: string | null;
  // null when no boards exist
  // Future: persist in localStorage, URL param
  
  interaction: Interaction;
  // Currently active interaction (mutually exclusive)
  // Future: could support stacked interactions (modal over modal)
  
  // --- Mutation State ---
  mutationError: MutationError | null;
  // Last failed mutation, shown as notification
  // Cleared on next successful mutation or manual dismiss
  // Future: error queue, retry actions, per-entity errors
  
  // --- Future Fields ---
  // search: SearchState
  // filters: FilterState
  // selection: Set<string> (multi-select)
  // undoStack: UndoAction[]
  // syncStatus: 'synced' | 'pending' | 'offline'
};
```

---

## Entities

```typescript
type User = {
  id: string;
  email: string;
  // From Supabase auth
  // Future: name, avatar, preferences
};

type Board = {
  id: string;
  name: string;
  position: string;
  // Fractional indexing (e.g., "a0", "a1", "a0V")
  // Future: description, color, ownerId, archived, createdAt, updatedAt
};

type Column = {
  id: string;
  boardId: string;
  // Foreign key
  name: string;
  position: string;
  // Future: color, wipLimit, archived
};

type Task = {
  id: string;
  columnId: string;
  // Foreign key
  title: string;
  position: string;
  // Future: description, assigneeId, dueDate, labels, archived, status
  // status: 'active' | 'archived' | 'deleted'
};
```

---

## Interaction State

```typescript
type Interaction =
  | { tag: 'none' }
  
  // --- Board ---
  | { tag: 'board.add' }
  | { tag: 'board.edit'; boardId: string }
  // Future: 'board.delete.confirm', 'board.edit.inline', 'board.edit.dialog'
  
  // --- Column ---
  | { tag: 'column.add'; boardId: string }
  | { tag: 'column.edit'; columnId: string }
  // Future: 'column.delete.confirm', 'column.reorder'
  
  // --- Task ---
  | { tag: 'task.add'; columnId: string }
  | { tag: 'task.edit'; taskId: string }
  // Future: 'task.delete.confirm', 'task.move', 'task.edit.dialog',
  //         'task.edit.inline', 'task.view' (read-only detail)
  
  // --- Future Interactions ---
  // | { tag: 'search.active'; query: string }
  // | { tag: 'filter.active'; filters: Filters }
  // | { tag: 'bulk.select'; ids: Set<string> }
  // | { tag: 'drag.task'; taskId: string; over: DropTarget | null }
  // | { tag: 'drag.column'; columnId: string; over: DropTarget | null }
```

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
  addBoard: (name: string) => void;
  updateBoard: (boardId: string, updates: Partial<Board>) => void;
  deleteBoard: (boardId: string) => void;
  setActiveBoard: (boardId: string | null) => void;
  
  // --- Column Actions ---
  addColumn: (boardId: string, name: string) => void;
  updateColumn: (columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (columnId: string) => void;
  moveColumn: (columnId: string, newPosition: string) => void;
  
  // --- Task Actions ---
  addTask: (columnId: string, title: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, toColumnId: string, newPosition: string) => void;
  
  // --- Interaction Actions ---
  setInteraction: (interaction: Interaction) => void;
  clearInteraction: () => void;
  
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
User action (e.g., updateTask)
       │
       ▼
┌─────────────────────────────┐
│ 1. Update state immediately │ (optimistic)
│ 2. Store previous state     │ (for rollback)
│ 3. Add to MutationQueue     │
└─────────────────────────────┘
       │
       ▼
MutationQueue.process()
       │
       ├── Success ──► Clear rollback data
       │
       └── Failure ──► Rollback state
                       Set mutationError
```

---

## Derived Data (Selectors)

```typescript
// These would be Zustand selectors or computed in components

// Columns for active board, sorted by position
const columnsForActiveBoard = (state: ReadyState): Column[] =>
  Object.values(state.columns)
    .filter(c => c.boardId === state.activeBoardId)
    .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));

// Tasks for a column, sorted by position
const tasksForColumn = (state: ReadyState, columnId: string): Task[] =>
  Object.values(state.tasks)
    .filter(t => t.columnId === columnId)
    .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));

// All boards sorted by position
const sortedBoards = (state: ReadyState): Board[] =>
  Object.values(state.boards)
    .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));

// Future selectors:
// - tasksMatchingSearch(query)
// - filteredTasks(filters)
// - tasksByAssignee(assigneeId)
// - overdueTasks()
```

---

## Simplifications (Current vs Future)

| Concern        | Current                        | Future                                 |
|----------------|--------------------------------|----------------------------------------|
| Data loading   | All upfront                    | Paginated, lazy load per board         |
| Error handling | Single mutationError           | Per-entity errors, retry actions       |
| Auth           | OAuth only                     | Email/password, magic link             |
| Entity states  | Just data                      | archived, deleted soft states          |
| Delete         | Hard delete (Supabase cascade) | Soft delete with archive               |
| Confirmations  | Component-level                | Interaction state with confirm dialogs |
| Drag & drop    | View handles, calls moveX      | Interaction state tracks drag          |
| Forms          | Component-local state          | Could move to interaction if complex   |
| Multi-select   | Not supported                  | bulk operations                        |
| Undo/redo      | Not supported                  | Action stack                           |
| Offline        | Not supported                  | Queue persistence, sync status         |
| Real-time      | Not supported                  | Supabase subscriptions                 |

---

## Open Questions

1. **Position conflicts:** Two users add task simultaneously — both get same position?
2. **Cascade on delete:** Delete board deletes columns and tasks — rollback all on failure?
3. **Active board persistence:** localStorage? URL? What if board deleted?
4. **Auth token refresh:** Supabase handles, but do we need loading state during refresh?
