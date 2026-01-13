# State Machine

## Diagram

```
+==========================================+
|              APP STATE MACHINE           |
+==========================================+

     ┌──────────────┐
     │ auth-pending │  (supabase checking session)
     └──────┬───────┘
            │
            │ onAuthStateChange
      ┌─────┴─────┐
      ▼           ▼
┌───────────┐  ┌─────────────┐
│ signed-out│  │   loading   │
└─────┬─────┘  │  (has user) │
      │        └──────┬──────┘
      │               │ fetch done
      │               ▼
      │        ┌─────────────┐
      │        │   loaded    │
      │        │ (has user + │
      │        │    data)    │
      │        └──────┬──────┘
      │               │
      └───────────────┘
         sign out clears all


+==========================================+
|       EDITING (inside loaded)            |
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

type AppState =
  | { tag: 'auth-pending' }
  | { tag: 'signed-out' }
  | { tag: 'loading'; user: AuthUser }
  | { tag: 'loaded'
      user: AuthUser
      boards: Record<BoardId, Board>
      columns: Record<ColumnId, Column>
      cards: Record<CardId, Card>
      activeBoardId: BoardId | null
      editing: EditingState
    }

type Store = {
  state: AppState
  error: string | null
}
```

## Notes

- `auth-pending`: Supabase checking cached session
- `signed-out`: No user
- `loading`: User confirmed, fetching data
- `loaded`: User + data ready
- `error` orthogonal (can occur in any state)
- `editing` only exists in `loaded` state
- Flat access: `state.user`, `state.boards` (no `.data.` nesting)
