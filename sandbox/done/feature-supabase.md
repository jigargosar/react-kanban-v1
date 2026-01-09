# Supabase Integration Plan

## Overview
Replace localStorage with Supabase for persistence. Keep same API signatures, swap implementation.

## Schema Mapping

| App Type          | DB Table         | DB Column | Notes                |
|-------------------|------------------|-----------|----------------------|
| `Board.id`        | boards.id        | UUID      |                      |
| `Board.title`     | boards.title     | TEXT      |                      |
| `Board.position`  | boards.position  | TEXT      | Needs migration      |
| `Column.id`       | columns.id       | UUID      |                      |
| `Column.boardId`  | columns.board_id | UUID      | snake_case in DB     |
| `Column.title`    | columns.title    | TEXT      |                      |
| `Column.position` | columns.position | TEXT      |                      |
| `Card.id`         | cards.id         | UUID      |                      |
| `Card.columnId`   | cards.column_id  | UUID      | snake_case in DB     |
| `Card.title`      | cards.title      | TEXT      |                      |
| `Card.position`   | cards.position   | TEXT      |                      |

## Implementation Order

### Phase 0: Simplify API Contract
See `refactor-api-contract.md` - independent of Supabase integration.

### Phase 1: Fix DB Schema
1. Add `position TEXT NOT NULL` to boards table in migration
2. Add `created_at TIMESTAMPTZ DEFAULT now()` to all tables
3. Add position value `'a0'` to seed.sql
4. Run `pnpm exec supabase db reset --linked`

### Phase 2: Generate Types
4. Run `pnpm exec supabase gen types typescript --linked > src/database.types.ts`
5. Update supabase client with types

### Phase 3: Add Mappers
6. Add type aliases from generated types:
   ```typescript
   import { Tables, TablesInsert } from './database.types'
   type DbBoard = Tables<'boards'>
   type DbColumn = Tables<'columns'>
   type DbCard = Tables<'cards'>
   ```
7. Add to api.ts:
   - `toRecord<T>()` - array to Record by id
   - `toBoard(row: DbBoard): Board` - `{ id, title, position }` (drops `created_at`)
   - `toColumn(row: DbColumn): Column` - `{ id, boardId, title, position }` (drops `created_at`)
   - `toCard(row: DbCard): Card` - `{ id, columnId, title, position }` (drops `created_at`)
   - `fromBoard(board: Board): TablesInsert<'boards'>` - `{ id, title, position }`
   - `fromColumn(col: Column): TablesInsert<'columns'>` - `{ id, board_id, title, position }`
   - `fromCard(card: Card): TablesInsert<'cards'>` - `{ id, column_id, title, position }`

### Phase 4: Replace api.ts
8. Replace localStorage calls with Supabase queries
9. Simplify `deleteBoardCascade` to just delete board (CASCADE handles columns/cards)
10. Simplify `deleteColumnCascade` to just delete column (CASCADE handles cards)
11. Only expose `fetchAll`, others internal
12. Return `{}` not `null` for empty results

### Phase 5: Test & Finalize
13. Clear localStorage, test fresh load
14. Test all CRUD operations
15. Run lint and build
16. Commit

## Notes

- `activeBoardId` stays in localStorage (user preference)
- DB has ON DELETE CASCADE
- Error handling: throw on error, store catches (see ADR.md)
- All functions already async, no signature changes needed
