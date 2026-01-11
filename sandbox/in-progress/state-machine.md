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

No early returns. Use helper callbacks that encapsulate `set`:

```typescript
// Helper encapsulates set + state check
const whenIdle = (fn: (data: BoardData, user: User) => void) => {
  set(s => {
    if (s.state.type === 'Ready.HasBoard.Idle') {
      fn(s.state.data, s.state.user)
    }
  })
}

// Action body is just mutation logic
// Persist inside callback - only runs if state matched
addCard: (columnId, title) => {
  whenIdle((data, user) => {
    const newCard = createCard(user.id, columnId, title)
    data.cards[newCard.id] = newCard
    persist(() => api.persistCard(newCard))
  })
}

// For state transitions, pass full state variant
const whenIdleState = (fn: (state: ReadyHasBoardIdleState) => void) => {
  set(s => {
    if (s.state.type === 'Ready.HasBoard.Idle') {
      fn(s.state)
    }
  })
}

startEditing: (entityId) => {
  whenIdleState(state => {
    // Can replace entire state for transition
    s.state = { ...state, type: 'Ready.HasBoard.Editing', editingId: entityId }
  })
}
```

## Notes

- Validation belongs in components, not store
- Form field state is component-local
- On submit, all fields go to store at once
