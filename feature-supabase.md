# Supabase Integration Plan

## Overview
Replace localStorage with Supabase for persistence. Keep same API signatures, swap implementation.

## Schema Mapping

| App Type | DB Table | DB Column | Notes |
|----------|----------|-----------|-------|
| `Board.id` | boards.id | UUID | |
| `Board.title` | boards.title | TEXT | |
| `Board.position` | boards.position | TEXT | **Missing in DB - needs migration** |
| `Column.id` | columns.id | UUID | |
| `Column.boardId` | columns.board_id | UUID | snake_case in DB |
| `Column.title` | columns.title | TEXT | |
| `Column.position` | columns.position | TEXT | |
| `Card.id` | cards.id | UUID | |
| `Card.columnId` | cards.column_id | UUID | snake_case in DB |
| `Card.title` | cards.title | TEXT | |
| `Card.position` | cards.position | TEXT | |

## Required Migration

Add `position` column to boards table:

```sql
ALTER TABLE boards ADD COLUMN position TEXT NOT NULL DEFAULT 'a0';
```

## api.ts Changes

### Imports
```typescript
import { supabase } from './supabase'
```

### Helper: Convert DB rows to Record
```typescript
function toRecord<T extends { id: string }>(rows: T[]): Record<string, T> {
  return Object.fromEntries(rows.map(r => [r.id, r]))
}
```

### Helper: Convert snake_case to camelCase
```typescript
// For columns: { board_id } -> { boardId }
// For cards: { column_id } -> { columnId }
```

### Function Mappings

| Function | Supabase Query |
|----------|---------------|
| `fetchBoards()` | `supabase.from('boards').select('*')` |
| `persistBoard(board)` | `supabase.from('boards').upsert(board)` |
| `deleteBoard(boardId)` | `supabase.from('boards').delete().eq('id', boardId)` |
| `fetchColumns()` | `supabase.from('columns').select('*')` |
| `persistColumn(column)` | `supabase.from('columns').upsert({...column, board_id: column.boardId})` |
| `deleteColumn(columnId)` | `supabase.from('columns').delete().eq('id', columnId)` |
| `fetchCards()` | `supabase.from('cards').select('*')` |
| `persistCard(card)` | `supabase.from('cards').upsert({...card, column_id: card.columnId})` |
| `deleteCard(cardId)` | `supabase.from('cards').delete().eq('id', cardId)` |
| `deleteCardsByColumn(columnId)` | `supabase.from('cards').delete().eq('column_id', columnId)` |
| `deleteBoardCascade(boardId)` | `supabase.from('boards').delete().eq('id', boardId)` (cascade handles rest) |
| `fetchActiveBoardId()` | Keep localStorage (client-side preference) |
| `persistActiveBoardId(boardId)` | Keep localStorage (client-side preference) |
| `resetAll()` | Delete all from boards (cascade deletes rest) + clear localStorage |

## Implementation Order

### Phase 1: Fix DB Schema
1. Update migration file `supabase/migrations/20260103105756_init.sql`:
   - Add `position TEXT NOT NULL` to boards table
2. Update seed file `supabase/seed.sql`:
   - Add position value to board insert
3. Run `echo "y" | pnpm exec supabase db reset --linked`
4. Verify in Supabase dashboard

### Phase 2: Update api.ts
5. Add imports: `import { supabase } from './supabase'`
6. Add helper functions:
   - `toRecord<T>()` - convert array to Record by id
   - `toColumn()` - convert DB row (board_id) to Column (boardId)
   - `toCard()` - convert DB row (column_id) to Card (columnId)
   - `fromColumn()` - convert Column to DB row
   - `fromCard()` - convert Card to DB row
7. Replace functions one at a time:
   - fetchBoards
   - persistBoard
   - deleteBoard
   - fetchColumns
   - persistColumn
   - deleteColumn
   - fetchCards
   - persistCard
   - deleteCard
   - deleteCardsByColumn
   - deleteBoardCascade (simplifies due to CASCADE)
   - fetchAll
   - resetAll
8. Remove unused localStorage constants (keep ACTIVE_BOARD_KEY)

### Phase 3: Test & Finalize
9. Clear localStorage, test fresh load from Supabase
10. Test all CRUD operations
11. Run lint and build
12. Commit

## Notes

- `activeBoardId` stays in localStorage (user preference, not shared data)
- DB has ON DELETE CASCADE, so deleteBoardCascade simplifies to just deleting the board
- Error handling: Supabase returns `{ data, error }` - throw on error
- All functions already async, no signature changes needed
