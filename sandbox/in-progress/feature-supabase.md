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

### Phase 1: Fix DB Schema
1. Add `position TEXT NOT NULL` to boards table in migration
2. Add position value `'a0'` to seed.sql
3. Run `pnpm exec supabase db reset --linked`

### Phase 2: Generate Types
4. Run `pnpm exec supabase gen types typescript --linked > src/database.types.ts`
5. Update supabase client with types

### Phase 3: Add Mappers
6. Add to api.ts (mark with `/* @db-mapper */`):
   - `toRecord<T>()` - array to Record by id
   - `toBoard()` - DB row → Board (ignores created_at)
   - `toColumn()` - DB row → Column (board_id → boardId)
   - `toCard()` - DB row → Card (column_id → columnId)
   - `fromColumn()` - Column → DB row
   - `fromCard()` - Card → DB row

### Phase 4: Replace api.ts
7. Replace localStorage calls with Supabase queries
8. Remove `deleteCardsByColumn` (CASCADE handles it)
9. Simplify `deleteBoardCascade` to just delete board
10. Remove call to `deleteCardsByColumn` from store.ts:242-243
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
