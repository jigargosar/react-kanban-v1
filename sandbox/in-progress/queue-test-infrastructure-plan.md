# Queue & Test Infrastructure Plan

## Overview

Improve error handling in queue and add comprehensive test coverage for both optimistic UI and persistence.

---

## Phase 1: UI Error Check in Tests

**Goal:** Ensure current tests catch API errors via UI.

### 1.1 Ensure `data-testid="error-notification"` exists
- Already added in `App.tsx` ErrorNotification component

### 1.2 Add `expectNoErrors` helper
```typescript
// helpers.ts
export async function expectNoErrors(page: Page) {
  await expect(page.getByTestId('error-notification')).toHaveCount(0)
}
```

### 1.3 Add afterEach to all spec files
```typescript
test.afterEach(async ({ page }) => {
  await expectNoErrors(page)
})
```

### 1.4 Run tests - should pass

---

## Phase 2: Queue Error Collection

**Goal:** Collect errors in queue for reliable test verification.

### 2.1 Update queue.ts
```typescript
let pending = Promise.resolve()
let errors: Error[] = []
let setError: ((msg: string) => void) | null = null

export function initQueue(onError: (msg: string) => void) {
  setError = onError
}

export function enqueue<T>(fn: () => Promise<T>, errorMsg: string): Promise<T> {
  const result = pending.then(fn)
  result.catch((e) => {
    if (import.meta.env.DEV) errors.push(e)
    setError?.(errorMsg)
  })
  pending = result.then(() => {}, () => {})
  return result
}

if (import.meta.env.DEV) {
  window.__waitForQueue = () => pending.then(() => {
    if (errors.length > 0) {
      const collected = [...errors]
      errors = []
      throw new AggregateError(collected, 'Queue had errors')
    }
  })
}
```

### 2.2 Add TypeScript declaration
```typescript
// global.d.ts or vite-env.d.ts
declare global {
  interface Window {
    __waitForQueue?: () => Promise<void>
  }
}
```

### 2.3 Update afterEach to check both
```typescript
test.afterEach(async ({ page }) => {
  await page.evaluate(() => window.__waitForQueue?.())
  await expectNoErrors(page)
})
```

---

## Phase 3: Persistence Verification

**Goal:** Verify data persists to server via reload.

### 3.1 Add `verifyPersistence` helper
```typescript
// helpers.ts
export async function verifyPersistence(page: Page) {
  await page.evaluate(() => window.__waitForQueue?.())
  await page.reload()
  await expect(page.getByText('Loading...')).toBeHidden()
}
```

### 3.2 Update tests to verify persistence
```typescript
test("board CRUD", async ({ page }) => {
  // Create
  await page.getByRole("button", { name: "+ New Board" }).click()
  await page.getByRole("textbox").fill("My Board")
  await page.keyboard.press("Enter")
  await expect(page.locator("select option:checked")).toHaveText("My Board")

  // Verify persistence
  await verifyPersistence(page)
  await expect(page.locator("select option:checked")).toHaveText("My Board")

  // ... continue with rename, delete
})
```

---

## Phase 4: Better Error Messages (Deferred)

**Goal:** User-friendly error messages.

### 4.1 Update queue to accept error message
- `enqueue(fn, errorMsg)` signature already in Phase 2

### 4.2 Update store to pass user-friendly messages
```typescript
// store.ts - no persist wrapper needed
addBoard: (title) => {
  set({ ... })
  enqueue(() => api.persistBoard(newBoard), `Failed to create "${title}"`)
}
```

### 4.3 Remove `persist()` wrapper from store

---

## Dependencies

```
Phase 1 (UI error check)
    ↓
Phase 2 (Queue error collection)
    ↓
Phase 3 (Persistence verification)
    ↓
Phase 4 (Better error messages) [Deferred]
```

---

## Current State

- Queue: Basic `enqueue()` with `persist()` wrapper in store
- Tests: Optimistic UI only, no error checks, no persistence verification
- Error handling: Raw server messages via `persist()` catch

---

## Known Issues

### Issue 1: Brittle selectors clash with error notification
**Problem:** Tests use `getByRole('button', { name: '×' })` which matches both error notification dismiss button and delete buttons.

**Impact:** When error shows, tests fail with "strict mode violation: resolved to 2 elements"

**Fix:** Use specific selectors like `getByTitle("Delete board")`

---

## Progress

### Phase 1: UI Error Check in Tests
- [x] 1.1 Add `data-testid="error-notification"`
- [x] 1.2 Add `expectNoErrors` helper
- [x] 1.3 Add afterEach to all spec files
- [x] 1.4 Verified - fake error causes test failure
- [x] 1.5 Remove fake error
- [ ] 1.6 Add test for explicit error checking UI
- [ ] 1.7 Fix brittle Optimistic UI tests, needs thorough review
- [ ] 1.8 Test all changes, commit
