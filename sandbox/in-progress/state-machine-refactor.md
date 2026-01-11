# State Machine Refactor

## Problem

`AppState` has parallel boolean/data fields that can get out of sync:

```ts
type AppState = {
  // Auth
  user: AuthUser | null
  authLoading: boolean
  // Data
  status: Status
  error: string | null
  // ...
}
```

Invalid states are possible:
- `authLoading: true` with `user` having a value
- `status: 'loading'` with `error` set

## Proposed Solution

Unify into discriminated unions:

```ts
type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated' }

type DataState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; boards: ...; cards: ...; columns: ... }
  | { status: 'error'; error: string }
```

## Tradeoffs

**Pros:**
- Makes invalid states impossible
- Clearer state transitions
- Better TypeScript exhaustiveness checking

**Cons:**
- Significant refactor touching many files
- Current approach works if invalid states never occur in practice
- More verbose state updates

## Decision

Deferred. No bugs reported from current approach. Revisit if state sync issues emerge.
