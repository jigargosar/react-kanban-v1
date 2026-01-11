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

## TypeScript Types (Recommended Approach)

Nested discriminated unions to model the state hierarchy:

```typescript
// Base types
type UserId = string
type BoardId = string
type ColumnId = string
type CardId = string

type User = { id: UserId; name: string | null }
type Board = { id: BoardId; title: string; position: number }
type Column = { id: ColumnId; boardId: BoardId; title: string; position: number }
type Card = { id: CardId; columnId: ColumnId; title: string; position: number }

// App State (top level)
type AppState =
  | { type: 'Initial' }
  | { type: 'AuthLoading' }
  | { type: 'LoggedOut' }
  | { type: 'LoggedIn'; user: User }
  | { type: 'DataLoading'; user: User }
  | { type: 'Ready'; user: User; ready: ReadyState }

// Ready sub-states
type ReadyState =
  | { type: 'NoBoard' }
  | { type: 'HasBoard'; data: BoardData; interaction: InteractionState }

type BoardData = {
  boards: Record<BoardId, Board>
  columns: Record<ColumnId, Column>
  cards: Record<CardId, Card>
  activeBoardId: BoardId
  searchTerm: string
}

// Interaction sub-states
type InteractionState =
  | { type: 'Idle' }
  | { type: 'Editing'; editing: EditingTarget }
  | { type: 'Dragging'; dragging: DraggingTarget }

// Editing targets
type EditingTarget =
  | { type: 'Card'; cardId: CardId }
  | { type: 'Column'; columnId: ColumnId }
  | { type: 'Board'; boardId: BoardId }

// Dragging targets
type DraggingTarget =
  | { type: 'Card'; cardId: CardId }
  | { type: 'Column'; columnId: ColumnId }
```

## Implementation Ideas

### Option: Pattern Matching Wrappers + Immer

One approach to reduce boilerplate in actions - wrapper functions that:
1. Handle state pattern matching
2. Only execute callback when state matches
3. Leverage Zustand's immer middleware for clean mutations

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

const useAppStore = create(immer((set, get) => {
  // Wrappers defined inside store creator
  // Actions use wrappers
}))
```

### Example Wrappers

```typescript
// Only runs when: Ready > HasBoard > Idle
const onIdle = (fn: (data: BoardData) => void) => {
  set(s => {
    if (s.state.type === 'Ready' &&
        s.state.ready.type === 'HasBoard' &&
        s.state.ready.interaction.type === 'Idle') {
      fn(s.state.ready.data)
    }
  })
}

// Only runs when: Ready > HasBoard (any interaction)
const onHasBoard = (fn: (data: BoardData) => void) => {
  set(s => {
    if (s.state.type === 'Ready' && s.state.ready.type === 'HasBoard') {
      fn(s.state.ready.data)
    }
  })
}

// Only runs when: Ready (NoBoard or HasBoard)
const onReady = (fn: (state: ReadyState) => void) => {
  set(s => {
    if (s.state.type === 'Ready') {
      fn(s.state)
    }
  })
}

// For actions that modify interaction state
const onIdleInteraction = (fn: (ready: HasBoardReady) => void) => {
  set(s => {
    if (s.state.type === 'Ready' &&
        s.state.ready.type === 'HasBoard' &&
        s.state.ready.interaction.type === 'Idle') {
      fn(s.state.ready)
    }
  })
}
```

### Example Action Usage

```typescript
addCard: (columnId, title) => {
  const newCard = createCard(columnId, title, ...)
  onIdle(data => {
    data.cards[newCard.id] = newCard
  })
  persistAsync(() => api.persistCard(newCard))
}

updateCard: (cardId, title) => {
  onHasBoard(data => {
    const card = data.cards[cardId]
    if (card) card.title = title
  })
}

startEditing: (type, id) => {
  onIdleInteraction(ready => {
    ready.interaction = { type: 'Editing', editing: { type: 'Card', cardId: id } }
  })
}
```

### Potential Benefits

1. No early returns - wrapper handles state check
2. No nested ifs - single wrapper call
3. No manual immutability - immer handles spreads
4. Flat action bodies - just mutations
5. Type safety - callback receives narrowed types
6. Single source of truth - state checks defined once in wrappers

## Notes

- Validation belongs in components, not store
- Validation utilities shared across UI contexts (inline edit, dialog, etc.)
- Form field state is component-local, store only knows "editing entity X"
- On submit, all fields go to store at once

## Option: Prop Drilling for ISI

An alternative to selector hooks - prop drilling for stricter type-level guarantees:

```typescript
// Helper to extract data or null
function getBoardData(state: AppState): BoardData | null {
  if (state.type === 'Ready' && state.ready.type === 'HasBoard') {
    return state.ready.data
  }
  return null
}

// App.tsx guards once, drills props
const data = getBoardData(state)
if (data == null) return <Loading />
return <BoardView {...data} />

// Children receive guaranteed typed props, no selectors
function BoardView({ boards, cards, columns }: BoardData) {
  // Type proves data exists
}
```

Potential benefits:
- ISI at type level, not runtime guards
- Ugly state check in one place
- Components receive clean typed props
