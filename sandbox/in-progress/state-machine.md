# App State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP STATES                              │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   Initial    │
                    └──────┬───────┘
                           │ initAuth()
                           ▼
                    ┌──────────────┐
                    │ AuthLoading  │
                    └──────┬───────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
    ┌─────────────┐                 ┌─────────────┐
    │  LoggedOut  │◄───signOut()───│  LoggedIn   │
    └──────┬──────┘                 └──────┬──────┘
           │                               │
           │ signIn()                      │ load()
           │                               ▼
           │                        ┌─────────────┐
           └───────────────────────►│ DataLoading │
                                    └──────┬──────┘
                                           │ load() complete
                                           ▼
                              ┌────────────────────────┐
                              │         Ready          │
                              │                        │
                              │  ┌──────────────────┐  │
                              │  │     NoBoard      │◄─┼── deleteBoard(last)
                              │  └────────┬─────────┘  │
                              │           │            │
                              │           │ addBoard() │
                              │           ▼            │
                              │  ┌──────────────────┐  │
                              │  │     HasBoard     │  │
                              │  │                  │  │
                              │  │  searchTerm: str │  │
                              │  │                  │  │
                              │  │  ┌────────────┐  │  │
                              │  │  │    Idle    │  │  │
                              │  │  └─┬────────┬─┘  │  │
                              │  │    │        │    │  │
                              │  │    │startE  │startD
                              │  │    ▼        ▼    │  │
                              │  │ ┌─────┐ ┌──────┐ │  │
                              │  │ │Edit │ │ Drag │ │  │
                              │  │ │(id) │ │ (id) │ │  │
                              │  │ └──┬──┘ └──┬───┘ │  │
                              │  │    │       │     │  │
                              │  │    │stopE  │endD │  │
                              │  │    ▼       ▼     │  │
                              │  │  ┌────────────┐  │  │
                              │  │  │    Idle    │  │  │
                              │  │  └────────────┘  │  │
                              │  └──────────────────┘  │
                              └────────────────────────┘
```

## States & Valid Actions

```
+-----+==============================+======================+===============================================+
| #   | State                        | Data                 | Actions                                       |
+-----+==============================+======================+===============================================+
| 1   | Initial                      | -                    | initAuth                                      |
+-----+------------------------------+----------------------+-----------------------------------------------+
| 2   | AuthLoading                  | -                    | (wait)                                        |
+-----+------------------------------+----------------------+-----------------------------------------------+
| 3   | LoggedOut                    | -                    | signIn                                        |
+-----+------------------------------+----------------------+-----------------------------------------------+
| 4   | LoggedIn                     | user                 | load                                          |
+-----+------------------------------+----------------------+-----------------------------------------------+
| 5   | DataLoading                  | user                 | (wait)                                        |
+-----+------------------------------+----------------------+-----------------------------------------------+
| 6   | Ready.NoBoard                | user, boards={}      | addBoard                                      |
+-----+------------------------------+----------------------+-----------------------------------------------+
| 7   | Ready.HasBoard.Idle          | user, boards,        | addBoard, deleteBoard, setActiveBoard,        |
|     |                              | activeBoardId,       | addColumn, deleteColumn, addCard, deleteCard, |
|     |                              | searchTerm           | startEditing, startDrag, setSearch            |
+-----+------------------------------+----------------------+-----------------------------------------------+
| 8   | Ready.HasBoard.Editing(id)   | + editingId          | updateCard/Column/Board, stopEditing,         |
|     |                              |                      | deleteCard/Column/Board                       |
+-----+------------------------------+----------------------+-----------------------------------------------+
| 9   | Ready.HasBoard.Dragging(id)  | + draggingId         | moveCard/Column, endDrag                      |
+-----+------------------------------+----------------------+-----------------------------------------------+
```

## TypeScript Types

Flat discriminated union - no nesting:

```typescript
type AppState =
  | { type: 'Initial' }
  | { type: 'AuthLoading' }
  | { type: 'LoggedOut' }
  | { type: 'LoggedIn'; user: User }
  | { type: 'DataLoading'; user: User }
  | { type: 'Ready.NoBoard'; user: User; boards: Record<BoardId, Board> }
  | { type: 'Ready.HasBoard.Idle'; user: User; data: BoardData }
  | { type: 'Ready.HasBoard.Editing'; user: User; data: BoardData; editingId: EntityId }
  | { type: 'Ready.HasBoard.Dragging'; user: User; data: BoardData; draggingId: EntityId }

type BoardData = {
  boards: Record<BoardId, Board>
  columns: Record<ColumnId, Column>
  cards: Record<CardId, Card>
  activeBoardId: BoardId
  searchTerm: string
}

type EntityId =
  | { type: 'Card'; id: CardId }
  | { type: 'Column'; id: ColumnId }
  | { type: 'Board'; id: BoardId }
```

## Implementation

Using Zustand with immer middleware:

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

const useAppStore = create(immer<StoreState>((set, get) => ({
  state: { type: 'Initial' } as AppState,
  // actions...
})))
```

### State Guards

Helpers encapsulate `set()` + state check. Callback only runs if state matches:

```typescript
const whenIdle = (fn: (data: BoardData, user: User) => void) => {
  set(s => {
    if (s.state.type === 'Ready.HasBoard.Idle') {
      fn(s.state.data, s.state.user)
    }
  })
}

// Usage - mutation + persist inside callback
addCard: (columnId, title) => {
  whenIdle((data, user) => {
    data.cards[newCard.id] = newCard
    persist(() => api.persistCard(newCard))
  })
}
```

### Multi-State Matching

Flat union enables `.startsWith()` for matching state groups:

```typescript
if (t === 'LoggedIn' || t === 'DataLoading' || t.startsWith('Ready.')) {
  // matches all authenticated states
}
```

### Async Actions

Can't `await` inside `set()` (immer draft is sync). Use multiple `set()` calls:

```typescript
load: async () => {
  const user = getLoggedInUser()
  if (user) {
    set(s => { s.state = { type: 'DataLoading', user } })
    const result = await api.fetchAll()
    set(s => {
      if (s.state.type === 'DataLoading') {
        s.state = createReadyState(user, result)
      }
    })
  }
}
```

### API Triggers

Actions that only call external APIs don't need `set()` wrapper:

```typescript
signIn: () => {
  if (get().state.type === 'LoggedOut') {
    api.signInWithGitHub()
  }
}
```

## Notes

- Validation belongs in components, not store
- Form field state is component-local
- On submit, all fields go to store at once
