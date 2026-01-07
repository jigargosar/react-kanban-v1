# Ad-hoc Plan: ESLint & Code Quality

## Issues Discussed

### 1. `!var` Pattern is Buggy
**Problem:** `if (!error)` treats empty string `""` as falsy, causing ErrorNotification to not render even when error state is set.

**Decision:** Always use explicit `=== null` or `== null` (catches both null/undefined). Use helper like `isNil()`.

**Status:** Pending - need to:
- Add `isNil` helper
- Configure eslint rule to disallow `!var` pattern
- Fix all occurrences in codebase

**Affected code:**
- `if (!error)` in App.tsx
- `if (!activeBoardId)` in store.ts
- `if (!board)`, `if (!card)`, `if (!column)` in store.ts
- `if (!onDragOver)`, `if (!onDragEnd)` in dnd.tsx

### 2. ESLint Configuration

**Decisions:**
- [x] Use `recommendedTypeChecked` (not strict) - fix issues first, then upgrade
- [x] Update `ecmaVersion: 2020` → `'latest'`
- [x] Exclude `playwright/` and `playwright.config.ts` from linting
- [ ] Add Prettier for formatting (ESLint for logic only)
- [ ] Add separate scripts: `lint:check` and `lint:fix`
- [ ] Configure `strict-boolean-expressions` rule to catch `!var` pattern

**Status:** Partially done

### 3. React Purity Rules (suppressed for debug logging)

**Problem:** Debug `console.log` with `Date.now()` in render functions triggers:
- `react-hooks/purity` - impure function (Date.now) in render
- `restrict-template-expressions` - number type in template literal

**Decision:** Set to `warn` temporarily while debug logging is in place.

**Status:** Done - rules set to warn in eslint.config.js:
```js
rules: {
  '@typescript-eslint/restrict-template-expressions': 'warn',
  'react-hooks/purity': 'warn',
}
```

**Future:** Re-enable as errors when debug logging removed from render functions.

### 4. TSConfig Structure

**Current:** Multiple tsconfig files (root, app, node)
- `tsconfig.json` - references others
- `tsconfig.app.json` - for src/ (browser)
- `tsconfig.node.json` - for vite.config.ts (node)

**Decision:** Keep as-is (Vite default, different environments need different settings)

**Status:** Confirmed - both have `strict: true`

## Current ESLint Errors (17 total, tests excluded)

| File | Count | Issues |
|------|-------|--------|
| App.tsx | 3 | debug log (2), unnecessary assertion (1) |
| api.ts | 5 | env vars `any` (4), async without await (1) |
| database.types.ts | 2 | generated file, `never` in union |
| store.ts | 7 | floating promises (3), `any` types (4) |

**Debug log related:** 2-3 errors
**Real issues:** ~14 errors

## Fix Plan (Incremental)

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
