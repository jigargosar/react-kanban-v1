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

## TypeScript Types (Nested Discriminated Union)

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

## Notes

- Validation belongs in components, not store
- Validation utilities shared across UI contexts (inline edit, dialog, etc.)
- Form field state is component-local, store only knows "editing entity X"
- On submit, all fields go to store at once
