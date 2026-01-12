# Code Review Report

## High Confidence

### 1. [FALSE POSITIVE] store.ts:152-158 - Error silently logged but not surfaced to UI
**Tags:** `bug-risk`, `readability`

**What:** `signIn` catches errors and logs to console, but uses a different error handling path than other operations. It sets `error` state but the error message includes "Sign in failed" wrapper instead of the actual error.

**Why problematic:** Users may see generic "Sign in failed" instead of the actual error message from Supabase (e.g., "Popup blocked", "Network error").

**Direction:** Pass through `e.message` directly without wrapper, or if wrapper is needed, include original message: `e instanceof Error ? e.message : 'Sign in failed'`

---

### 2. [INTENTIONAL] store.ts:78-81 - persist helper swallows promise result
**Tags:** `bug-risk`, `readability`

**What:** The `persist` helper uses `.catch()` which converts the promise to `void`, meaning callers cannot await or chain on the result.

**Why problematic:** If any code ever needs to know when persistence completed, it can't. Current design is fire-and-forget by necessity rather than choice.

**Direction:** This appears intentional for optimistic updates. No action needed if that's the design choice.

---

### 3. [FIXED] dnd.tsx:91-94 - Stale comment about design issue
**Tags:** `maintenance`

**What:** Comments on lines 91-94 say "This is a design issue - List doesn't know about other lists' items" but `ColumnList` was created to solve this.

**Why problematic:** Comment suggests unresolved issue but solution exists.

**Direction:** Remove the stale comments since `ColumnList` component addresses this.

---

### 4. [FIXED] App.tsx:544, 548 - Direct store access bypasses component props
**Tags:** `coupling`, `readability`

**What:** Inside ColumnList render callback, `useAppStore.getState().updateColumn` and `useAppStore.getState().deleteColumn` are called directly instead of using the destructured values from the hook at line 453.

**Why problematic:** Inconsistent access pattern - some actions use hook-destructured values, others use `getState()`. Makes tracing data flow harder.

**Direction:** Use destructured `updateColumn` and `deleteColumn` from the hook instead of `getState()`.

---

### 5. [FIXED] model.ts:86-93 - Unused function
**Tags:** `maintenance`

**What:** `calculatePosition` (legacy) is exported but never used anywhere in the codebase.

**Why problematic:** Dead code adds maintenance burden.

**Direction:** Remove if truly unused, or document why it's kept.

---

## Medium Confidence

### 6. [DEFERRED] store.ts:34-46 - Parallel boolean/data fields create fragile state
**Tags:** `bug-risk`, `complexity`

**What:** `AppState` has `authLoading: boolean` alongside `user: AuthUser | null` and `status: Status` with `error: string | null`. Multiple booleans/status fields can get out of sync.

**Why problematic:** It's possible for `authLoading: true` and `user` to have a value, or `status: 'loading'` with `error` set. These combinations may be invalid but aren't prevented.

**Direction:** Consider unifying into discriminated union:
```ts
type AppState =
  | { status: 'auth_loading' }
  | { status: 'loading_data', user: AuthUser }
  | { status: 'ready', user: AuthUser | null, ... }
  | { status: 'error', error: string }
```

Tradeoff: Current approach is simpler if invalid states never actually occur. If they haven't caused bugs, this may be acceptable pragmatism.

---

### 7. [FIXED] dnd.tsx:199-206 - Shadowed variable name
**Tags:** `readability`

**What:** Line 201 declares `const arr = map.get(columnId)` inside a block that already has `arr` from line 197.

**Why problematic:** Confusing - same name refers to different things depending on scope.

**Direction:** Rename inner variable to `existing` or `columnArr`.

---

### 8. [WONTFIX] App.tsx:281-287 - Cards filtered twice
**Tags:** `performance`

**What:** Cards are first filtered by columnId, then filtered by search term. This happens on every render.

**Why problematic:** O(n) twice where single pass would suffice. However, with typical card counts (<1000), this is unlikely to matter.

**Direction:** Could combine filters into single pass. But given typical Kanban board sizes, this is likely fine. Only flag if boards can have thousands of cards.

---

### 9. [FALSE POSITIVE] queue.ts:11 - Empty callbacks for promise chain continuation
**Tags:** `readability`

**What:** `pending = result.then(() => {}, () => {})` uses empty callbacks to ensure chain continues.

**Why problematic:** Not immediately obvious why empty callbacks exist.

**Direction:** Add brief comment explaining purpose, or use `.finally()` if intent is to continue regardless of success/failure:
```ts
pending = result.catch(() => {}) // Continue chain even on failure
```

---

## Low Confidence

### 10. [ACCEPTABLE] store.ts:96-150 - Large switch statement in initAuth
**Tags:** `complexity`

**What:** The `initAuth` handler has a switch with 6 cases covering all auth events.

**Why problematic:** 55 lines in one handler. Could extract to separate functions.

**Direction:** May be acceptable - auth state changes are inherently complex and the switch is readable with clear case separation. Only refactor if this grows further.

---

### 11. [ACCEPTABLE] App.tsx:6-8 - assertNever helper could live in shared utils
**Tags:** `maintenance`

**What:** `assertNever` is defined in App.tsx but could be useful elsewhere.

**Why problematic:** If other files need exhaustive checking, they'd duplicate this.

**Direction:** Leave as-is unless needed elsewhere. If you add another switch with exhaustive checking, extract to shared utils then.

---

### 12. [INTENTIONAL] api.ts:99-103 - Unnecessary Promise.resolve wrapper
**Tags:** `readability`

**What:** `persistActiveBoardId` wraps synchronous localStorage call in `Promise.resolve().then()`.

**Why problematic:** Adds async overhead for sync operation.

**Direction:** This appears intentional - keeps API consistent (all persist functions are async) so they can be enqueued uniformly. Acceptable if that's the design choice.

---

# Code Review Round 2

## High Confidence

### 1. dnd.tsx:7-14 - MoveInfo.type is string but should be discriminated union
**Tags:** `bug-risk`, `readability`

**What:** `MoveInfo.type` is typed as `string` but only `'card'` or `'column'` are valid values.

**Why problematic:** The `assertNever` in `App.tsx` line 480 casts to `never` but the type system doesn't enforce exhaustiveness because `type` is `string`. A typo or new type would silently fall through at runtime.

**Direction:** Change `type: string` to `type: 'card' | 'column'` in `MoveInfo`.

---

### 2. App.tsx:32-43 - BoardSelector can call updateBoard with null activeBoardId
**Tags:** `bug-risk`, `maintenance`

**What:** When `isEditingBoard && activeBoard != null`, `updateBoard(activeBoardId, title)` is called, but TypeScript doesn't narrow `activeBoardId` to non-null (only `activeBoard` is checked).

**Why problematic:** While logically safe (activeBoard derives from activeBoardId), passing potentially-null value is fragile. If someone refactors how `activeBoard` is derived, this could silently pass `null`.

**Direction:** Extract active board ID from the non-null board: `updateBoard(activeBoard.id, title)`.

---

### 3. App.tsx - Fragile State: isAdding states in multiple components are independent of editing state
**Tags:** `complexity`, `bug-risk`

**What:** `BoardSelector`, `ColumnContent`, and `AddColumnButton` each have independent `isAdding` state. These don't coordinate with the global `editing` state.

**Why problematic:** User can start adding a board (local `isAdding=true`) then double-click a card to edit it (global `editing` set). Now both UI states are active simultaneously.

**Direction:** Consider whether add-flows should also go through global `editing` state, or document that concurrent add+edit is intentional.

---

### 4. store.ts:105-149 - initAuth switch doesn't handle all AuthChangeEvent values
**Tags:** `maintenance`, `bug-risk`

**What:** The switch handles `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`, `PASSWORD_RECOVERY`. But Supabase's `AuthChangeEvent` type may include other values like `MFA_CHALLENGE_VERIFIED`.

**Why problematic:** New auth events will silently do nothing. While this may be intentional, there's no `default` case with logging/acknowledgment.

**Direction:** Add `default` case that at minimum logs unknown events for debugging.

---

## Medium Confidence

### 5. model.ts:86-94 - calculatePositionBetween doesn't validate that beforeId/afterId exist
**Tags:** `bug-risk`

**What:** If `beforeId` or `afterId` refers to a non-existent item, `items[beforeId]?.position` returns `undefined`, then `?? null` makes it null. This silently treats missing items as "position at end/start."

**Why problematic:** If a caller passes stale IDs (e.g., from race conditions during drag), the position calculation could be wrong without any error.

**Direction:** Either: (1) throw if IDs don't exist, or (2) document that missing IDs are treated as null (intentional behavior).

---

### 6. store.ts:80-82 - persist wrapper swallows context about which operation failed
**Tags:** `maintenance`, `readability`

**What:** Errors are caught and stored as generic `error` string. The user sees "Unknown error" or the error message, but doesn't know which operation failed.

**Why problematic:** Debugging production issues is harder when all operations funnel to the same error state.

**Direction:** Consider wrapping operations with context: `set({ error: \`Failed to ${operation}: ${message}\` })`.

---

### 7. dnd.tsx:183 - Magic number: CollisionPriority.Low in ColumnList
**Tags:** `maintenance`, `readability`

**What:** Default collision priority is `CollisionPriority.Low` without explanation.

**Why problematic:** The intent behind choosing `Low` vs other priorities isn't documented.

**Direction:** Add comment explaining why Low priority is appropriate for columns.

---

### 8. api.ts:21-23 - toRecord assumes all items have unique IDs
**Tags:** `bug-risk`

**What:** `Object.fromEntries` will silently overwrite if duplicate IDs exist.

**Why problematic:** Database constraints should prevent this, but if data corruption occurs, the bug would be subtle (last-write-wins).

**Direction:** Either document the assumption or add validation.

---

## Low Confidence

### 9. App.tsx:284 - Search term comparison may not handle unicode properly
**Tags:** `maintenance`

**What:** `toLowerCase()` may not handle all unicode edge cases (e.g., Turkish i).

**Why it's likely fine:** For a kanban app, this edge case is extremely unlikely to matter.

**Direction:** If internationalization becomes important, consider `toLocaleLowerCase()` or proper unicode-aware comparison.
