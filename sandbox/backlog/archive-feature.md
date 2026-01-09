# Archive Feature

## Goal

Replace hard delete with soft delete. Cards can be archived and restored.

## Design

- Add `archived_at TIMESTAMPTZ NULL` to cards table
- Archived cards hidden from default view
- Archive view shows archived cards with restore option
- Permanent delete available from archive view

## DB Changes

```sql
ALTER TABLE cards ADD COLUMN archived_at TIMESTAMPTZ NULL;
```

## API Changes

- `archiveCard(cardId)` - set `archived_at = now()`
- `restoreCard(cardId)` - set `archived_at = NULL`
- `deleteCard(cardId)` - permanent delete (from archive view only)
- `fetchAll()` - exclude archived cards by default

## UI Changes

- Replace delete button with archive button on cards
- Add "Show archived" toggle or separate archive view
- Archive view: list of archived cards with restore/delete buttons

## Progress

| # | Item | Status |
|---|------|--------|
| 1 | Add `archived_at` column to migration | Pending |
| 2 | Update api.ts with archive/restore | Pending |
| 3 | Update store with archive actions | Pending |
| 4 | Replace delete button with archive | Pending |
| 5 | Add archive view/toggle | Pending |
| 6 | Add permanent delete in archive view | Pending |
