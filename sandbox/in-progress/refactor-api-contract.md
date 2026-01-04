# API Contract Refactoring

## Analysis

| api.ts Function        | store.ts Usage   | Issue                                         |
|------------------------|------------------|-----------------------------------------------|
| `fetchAll`             | L73 load()       | ✅ OK - single entry point                     |
| `fetchBoards`          | -                | ⚠️ Internal only, don't need export           |
| `fetchCards`           | -                | ⚠️ Internal only                              |
| `fetchColumns`         | -                | ⚠️ Internal only                              |
| `persistBoard`         | L99, L111        | ✅ OK                                          |
| `persistColumn`        | L215, L225, L254 | ✅ OK                                          |
| `persistCard`          | L170, L180, L203 | ✅ OK                                          |
| `deleteBoard`          | -                | ⚠️ Internal only (used by deleteBoardCascade) |
| `deleteCard`           | L189             | ✅ OK                                          |
| `deleteColumn`         | L240             | ⚠️ Rename → deleteColumnCascade               |
| `deleteCardsByColumn`  | L242             | ❌ Merge into deleteColumnCascade              |
| `deleteBoardCascade`   | L153             | ✅ OK                                          |
| `fetchActiveBoardId`   | -                | ⚠️ Internal (used by fetchAll)                |
| `persistActiveBoardId` | L101, L159       | ✅ OK                                          |
| `resetAll`             | L270             | ✅ OK                                          |

## Changes

### 1. deleteColumn → deleteColumnCascade
- Rename function
- Move `deleteCardsByColumn` logic inside
- Remove `deleteCardsByColumn` export
- Update store.ts L240-243 to single call

### 2. Reduce Exports
Remove `export` from internal-only functions:
- `fetchBoards`, `fetchCards`, `fetchColumns`
- `fetchActiveBoardId`
- `deleteBoard`

## Public API (after refactor)

```typescript
// Read
fetchAll(): Promise<{ boards, columns, cards, activeBoardId }>

// Write
persistBoard(board: Board): Promise<void>
persistColumn(column: Column): Promise<void>
persistCard(card: Card): Promise<void>
persistActiveBoardId(boardId: BoardId): Promise<void>

// Delete
deleteCard(cardId: CardId): Promise<void>
deleteColumnCascade(columnId: ColumnId): Promise<void>
deleteBoardCascade(boardId: BoardId): Promise<void>

// Reset
resetAll(): Promise<void>
```
