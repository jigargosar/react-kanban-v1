# Ad-hoc Plan: ESLint & Code Quality

## `!var` Pattern

**Problem:** `if (!error)` treats empty string as falsy.

**Fix:**
- [ ] Add `isNil` helper
- [ ] Configure eslint `strict-boolean-expressions` rule
- [ ] Fix remaining occurrences: store.ts (`!activeBoardId`, `!board`, `!card`, `!column`), dnd.tsx (`!onDragOver`, `!onDragEnd`)

**Done:** App.tsx `if (!error)` → `if (error == null)`

## ESLint & Tooling

**Done:**
- [x] `recommendedTypeChecked` config
- [x] `ecmaVersion: 'latest'`
- [x] Exclude playwright from linting

**Pending:**
- [ ] Add Prettier for formatting
- [ ] Add `lint:check` / `lint:fix` scripts
- [ ] Upgrade to `strictTypeChecked` after fixes
