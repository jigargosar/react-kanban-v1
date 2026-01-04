# Plan Analysis - Issues Found

## 1. ID Generation Mismatch
- **App**: Uses `crypto.randomUUID()` (client-side)
- **DB**: Uses `gen_random_uuid()` (server-side default)

**Options:**
1. Keep client-side UUID, pass to Supabase (Recommended - maintains optimistic updates)
2. Let DB generate, fetch after insert (breaks optimistic updates)

## 2. Upsert Conflict Column Not Specified
Plan shows `supabase.from('boards').upsert(board)` but doesn't specify conflict column.

**Fix:** Use `.upsert(board, { onConflict: 'id' })`

## 3. Return Type Ambiguity
- Current `fetchBoards()` returns `Record<BoardId, Board> | null`
- Supabase returns `{ data: Board[] | null, error }`

**Question:** Keep `null` for empty? Or return empty `{}`?

**Recommendation:** Return `{}` for empty (consistent with store initialization)

## 4. Error Handling Not Detailed
Plan says "throw on error" but no specifics.

**Options:**
1. Throw generic `Error(error.message)` (simple)
2. Create custom error types (overkill for now)
3. Return error in result tuple (changes signatures)

**Recommendation:** Option 1

## 5. deleteCardsByColumn Redundant with CASCADE
Since columns have `ON DELETE CASCADE` to boards, and cards have `ON DELETE CASCADE` to columns:
- `deleteCardsByColumn` is called from store after `deleteColumn`
- But CASCADE already deletes cards when column is deleted

**Options:**
1. Keep function but make it no-op (safe, backward compat)
2. Remove function entirely (breaking change to store)
3. Keep as explicit delete (redundant but harmless)

**Recommendation:** Option 1 - make it no-op or remove call from store

## 6. Missing: What If Supabase Unreachable?
Plan doesn't address offline/network errors.

**Options:**
1. Let errors bubble up to store's error state (current pattern)
2. Add retry logic
3. Fall back to localStorage

**Recommendation:** Option 1 for now

## 7. Seed Data Position Value
Plan mentions updating seed.sql but doesn't specify position value.

**Fix:** Use `'a0'` to match app's fractional-indexing pattern

## 8. Missing Helper: fromBoard()
Plan lists `fromColumn()` and `fromCard()` for snake_case conversion, but `Board` has no snake_case fields. Should clarify that Board needs no conversion.

---

## Summary of required plan updates:
1. Add `onConflict: 'id'` to upserts (#2)
2. Return `{}` not `null` for empty results (#3)
3. Simplify or remove `deleteCardsByColumn` (#5)
4. Clarify Board needs no conversion (#8)
5. Specify seed position value as `'a0'` (#7)

---

## Summary Review

| # | Issue           | Plan                                                                                                                                           | ADR                        |
|---|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------|
| 1 | ID generation   | -                                                                                                                                              | ✓ Done                     |
| 2 | Upsert conflict | Uses primary key by default. No change needed.                                                                                                 | -                          |
| 3 | Return types    | Already indexed by id, return `{}`. Only expose `fetchAll`, others internal.                                                                   | -                          |
| 4 | Error handling  | -                                                                                                                                              | ✓ Done                     |
| 5 | Cascade cleanup | Remove `deleteCardsByColumn` (api.ts:65-71). Remove call from store.ts:242-243. Simplify `deleteBoardCascade` to just delete board. Keep name. | ✓ Done                     |
| 6 | Network errors  | -                                                                                                                                              | ✓ Done (in error handling) |
| 7 | Seed position   | Use `'a0'` in seed.sql                                                                                                                         | -                          |
| 8 | Decoder/encoder | Add `toBoard`, `toColumn`, `toCard`, `fromColumn`, `fromCard`. Board has no snake_case but use decoder for consistency. Ignore `created_at`.   | -                          |
