# State Machine

## Diagram

```
+==========================================+
|              APP STATE MACHINE           |
+==========================================+

     ┌─────────────┐
     │   Loading   │
     │ tag:'loading'
     └──────┬──────┘
            │
            │ load() done
            ▼
     ┌─────────────────────────────┐
     │          Loaded             │
     │       tag: 'loaded'         │
     │                             │
     │  boards, columns, cards     │
     │  activeBoardId: BoardId | null
     │  editing: EditingState      │
     └─────────────────────────────┘


+==========================================+
|       EDITING (inside Loaded)            |
+==========================================+

     ┌────────┐  startEditing   ┌───────────┐
     │  Idle  │────────────────►│  Editing  │
     │  null  │◄────────────────│ {type,id} │
     └────────┘  stopEditing    └───────────┘
```

## ISI Types

```typescript
type EditingState =
  | { type: 'card'; id: CardId }
  | { type: 'column'; id: ColumnId }
  | { type: 'board'; id: BoardId }
  | null

type BoardState =
  | { tag: 'loading' }
  | { tag: 'loaded'
      boards: Record<BoardId, Board>
      columns: Record<ColumnId, Column>
      cards: Record<CardId, Card>
      activeBoardId: BoardId | null
      editing: EditingState
    }

type AppState = {
  user: AuthUser | null
  error: string | null
  board: BoardState
}
```

## Notes

- `user` and `error` are top-level nullables (orthogonal to board state)
- `editing` only exists inside `loaded` state
- Auth handled by Supabase, we just track `user` as nullable
