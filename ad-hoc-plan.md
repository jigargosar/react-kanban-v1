# Ad-hoc Plan: ESLint & Code Quality

## 1. `!var` Pattern is Buggy

**Problem:** `if (!error)` treats empty string `""` as falsy, causing ErrorNotification to not render even when error state is set.

**Decision:** Always use explicit `=== null` or `== null` (catches both null/undefined). Use helper like `isNil()`.

**Status:** Pending - need to:
- Add `isNil` helper
- Configure eslint rule to disallow `!var` pattern
- Fix all occurrences in codebase

**Affected code:**
- `if (!error)` in App.tsx ✓ fixed
- `if (!activeBoardId)` in store.ts
- `if (!board)`, `if (!card)`, `if (!column)` in store.ts
- `if (!onDragOver)`, `if (!onDragEnd)` in dnd.tsx

## 2. ESLint Configuration

**Done:**
- [x] Use `recommendedTypeChecked` (not strict) - fix issues first, then upgrade
- [x] Update `ecmaVersion: 2020` → `'latest'`
- [x] Exclude `playwright/` and `playwright.config.ts` from linting

**Pending:**
- [ ] Add Prettier for formatting (ESLint for logic only)
- [ ] Add separate scripts: `lint:check` and `lint:fix`
- [ ] Configure `strict-boolean-expressions` rule to catch `!var` pattern

## 3. Fix Plan (Incremental)

### Phase 1: Quick Fixes
1. [ ] Remove debug logging from src files (added for test debugging)
2. [ ] Fix `no-unnecessary-type-assertion` in App.tsx (remove redundant `!`)
3. [ ] Fix `require-await` in api.ts (remove async or add await)

### Phase 2: Type Safety
4. [ ] Fix env vars `any` in api.ts - add proper typing for `import.meta.env`
5. [ ] Fix `any` in store.ts catch callbacks - use `unknown` + type guard
6. [ ] Fix `any` in store.ts user metadata - type properly

### Phase 3: Promise Handling
7. [ ] Fix floating promises in store.ts - add `void` operator or proper handling

### Phase 4: Generated Files
8. [ ] Exclude `database.types.ts` from lint OR fix upstream (Supabase codegen)

### Phase 5: Tooling
9. [ ] Add Prettier for formatting
10. [ ] Add `lint:check` / `lint:fix` scripts
11. [ ] Add `isNil` helper
12. [ ] Add eslint rule `strict-boolean-expressions` for `!var` pattern

### Phase 6: Strictness
13. [ ] Upgrade to `strictTypeChecked` after all recommended errors fixed
