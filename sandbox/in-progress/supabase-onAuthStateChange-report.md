# Supabase `onAuthStateChange` Complete Report

## Overview

`onAuthStateChange` is the primary mechanism for subscribing to authentication state changes in Supabase. It enables reactive UI updates based on auth events.

---

## KNOWN FACTS (Verified from Official Sources)

### 1. Function Signature

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event: AuthChangeEvent, session: Session | null) => {
    // callback
  }
)

// Cleanup
subscription.unsubscribe()
```

**Source:** [Supabase JS Reference](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)

---

### 2. All Auth Event Types (7 Total)

From `gotrue-js/src/lib/types.ts`:

```typescript
type AuthChangeEvent =
  | 'INITIAL_SESSION'
  | 'PASSWORD_RECOVERY'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'MFA_CHALLENGE_VERIFIED'
```

**Source:** [GitHub gotrue-js types.ts](https://github.com/supabase/gotrue-js/blob/master/src/lib/types.ts)

---

### 3. Event Descriptions and Triggers

| Event | When Fired | Session State |
|-------|------------|---------------|
| `INITIAL_SESSION` | Right after client construction, when initial session loads from storage | `session` or `null` |
| `SIGNED_IN` | User session confirmed/re-established (sign in, tab refocus, OAuth redirect) | `session` (non-null) |
| `SIGNED_OUT` | After `signOut()`, session expiry, or sign out on another device | `null` |
| `TOKEN_REFRESHED` | New access/refresh tokens fetched for signed-in user | `session` (updated tokens) |
| `USER_UPDATED` | After `supabase.auth.updateUser()` completes successfully | `session` (updated user) |
| `PASSWORD_RECOVERY` | User lands on page with password recovery link (instead of SIGNED_IN) | `session` |
| `MFA_CHALLENGE_VERIFIED` | MFA challenge successfully verified | `session` (aal upgraded) |

**Source:** [Supabase Docs](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)

---

### 4. Session Object Structure

```typescript
interface Session {
  access_token: string      // JWT for API requests
  refresh_token: string     // Used to obtain new access tokens
  expires_in: number        // Seconds until expiration
  expires_at: number        // Unix timestamp of expiration
  token_type: string        // Usually "bearer"
  user: User                // Authenticated user details
  provider_token?: string   // OAuth provider's access token
  provider_refresh_token?: string
}
```

---

### 5. Critical Behavior: Async Callback Deadlock

**OFFICIAL WARNING:** Using `await` on Supabase methods inside the callback causes deadlocks.

```typescript
// BAD - CAUSES DEADLOCK
supabase.auth.onAuthStateChange(async (event, session) => {
  await supabase.from('profiles').select('*')  // DEADLOCK!
})

// GOOD - Use setTimeout to escape callback context
supabase.auth.onAuthStateChange((event, session) => {
  setTimeout(async () => {
    await supabase.from('profiles').select('*')  // Safe
  }, 0)
})
```

**Source:** [Supabase Troubleshooting](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0), [GitHub Issue #762](https://github.com/supabase/gotrue-js/issues/762)

---

### 6. Auto-Refresh Mechanism

- `autoRefreshToken: true` (default) enables background token refresh
- Refresh occurs before token expiry (configurable margin)
- `TOKEN_REFRESHED` event emitted on successful refresh
- Only runs when tab/window is in foreground (browser)
- On mobile: use `startAutoRefresh()` / `stopAutoRefresh()` with AppState

```typescript
// React Native example
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
```

**Source:** [Supabase React Native Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)

---

### 7. Cross-Tab Synchronization

- Uses BroadcastChannel API when available
- Requires: browser environment, `persistSession: true`, `storageKey` configured
- Auth state changes propagate across tabs
- **Limitation:** `SIGNED_OUT` from `signOut()` does NOT fire across tabs for other instances

**Source:** [GitHub Issue #902](https://github.com/supabase/auth-js/issues/902)

---

### 8. Typical Usage Pattern (React)

```typescript
useEffect(() => {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
  })

  // Subscribe to changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
      } else if (session) {
        setSession(session)
      }
    }
  )

  return () => subscription.unsubscribe()
}, [])
```

**Source:** [Supabase Docs Examples](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)

---

### 9. OAuth Provider Tokens

Must capture `provider_token` immediately on sign-in (before redirect clears it):

```typescript
// Register immediately after createClient!
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.provider_token) {
    localStorage.setItem('oauth_provider_token', session.provider_token)
  }
  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('oauth_provider_token')
  }
})
```

**Source:** [Supabase Docs](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)

---

### 10. Web Locks Deadlock Issue

Some devices (Chrome Android) experience infinite hangs due to Web Locks API:

```typescript
// Workaround: disable locks
const noOpLock = async (name, acquireTimeout, fn) => await fn()
const supabase = createClient(url, key, { auth: { lock: noOpLock } })
```

**Source:** [GitHub Issue #1594](https://github.com/supabase/supabase-js/issues/1594)

---

## ASSUMPTIONS / NEEDS INVESTIGATION

### A1. Event Order During Sign-In Flow

**Assumption:** Order is `INITIAL_SESSION` → `SIGNED_IN` on fresh login.

**Unknown:** Exact ordering when session exists in storage on page load. Does `INITIAL_SESSION` always precede `SIGNED_IN`, or can `INITIAL_SESSION` contain the session directly?

**Test needed:** Log events on page load with existing session vs fresh login.

---

### A2. SIGNED_IN Frequency

**Docs say:** "Emitted each time a user session is confirmed or re-established, including on user sign in and when refocusing a tab."

**Assumption:** `SIGNED_IN` may fire multiple times even without explicit sign-in action.

**Test needed:** Track frequency of `SIGNED_IN` events during normal app usage (tab switches, etc.).

---

### A3. TOKEN_REFRESHED vs SIGNED_IN Relationship

**Unknown:** Does `TOKEN_REFRESHED` ever fire without a preceding `SIGNED_IN`? What about on page refresh with valid session?

**Test needed:** Log events during auto-refresh cycle.

---

### A4. Session Null Scenarios

**Known:** `SIGNED_OUT` always has `session: null`

**Unknown:** Can `INITIAL_SESSION` have `session: null`? (Yes, if no stored session)

**Unknown:** Can `TOKEN_REFRESHED` ever have `session: null`? (Likely no, but unconfirmed)

**Test needed:** Verify session state for each event type.

---

### A5. PASSWORD_RECOVERY Behavior

**Docs say:** Fires "instead of" `SIGNED_IN` on password recovery link.

**Unknown:** Is this a redirect scenario only? Does the session contain special flags?

**Test needed:** Trigger password recovery flow and inspect session object.

---

### A6. MFA_CHALLENGE_VERIFIED Details

**Known:** Fires when MFA succeeds, `aal` upgrades to `aal2`.

**Unknown:** Does this fire in addition to `SIGNED_IN` or instead of it?

**Test needed:** Set up MFA flow and track events.

---

### A7. Multiple Listeners

**Assumption:** Multiple `onAuthStateChange` subscriptions all receive events.

**Unknown:** Order of listener invocation. Performance implications.

**Test needed:** Register multiple listeners and verify all receive events.

---

### A8. Storage Key Impact

**Unknown:** How `storageKey` option affects event behavior. Different storage keys = isolated sessions?

**Test needed:** Create two clients with different storage keys.

---

## RECOMMENDED DEBUGGING APPROACH

```typescript
const AUTH_EVENTS_LOG: Array<{
  timestamp: number
  event: string
  hasSession: boolean
  userId?: string
}> = []

supabase.auth.onAuthStateChange((event, session) => {
  AUTH_EVENTS_LOG.push({
    timestamp: Date.now(),
    event,
    hasSession: !!session,
    userId: session?.user?.id
  })
  console.log('[AUTH]', event, session ? 'session present' : 'no session')
})

// Expose for debugging
;(window as any).__AUTH_LOG__ = AUTH_EVENTS_LOG
```

---

## SUMMARY

| Aspect | Status |
|--------|--------|
| All 7 event types | KNOWN |
| Basic event triggers | KNOWN |
| Session structure | KNOWN |
| Async deadlock issue | KNOWN |
| Auto-refresh mechanism | KNOWN |
| Event ordering details | NEEDS TESTING |
| Edge case behaviors | NEEDS TESTING |

---

## OFFICIAL EXAMPLE PROJECTS

### Supabase GitHub Examples Repository

Location: `https://github.com/supabase/supabase/tree/master/examples`

#### User Management Examples (13 frameworks)

| Framework | Path |
|-----------|------|
| React | `examples/user-management/react-user-management` |
| Next.js | `examples/user-management/nextjs-user-management` |
| Vue 3 | `examples/user-management/vue3-user-management` |
| Svelte | `examples/user-management/svelte-user-management` |
| SvelteKit | `examples/user-management/sveltekit-user-management` |
| Angular | `examples/user-management/angular-user-management` |
| Nuxt 3 | `examples/user-management/nuxt3-user-management` |
| Solid | `examples/user-management/solid-user-management` |
| Flutter | `examples/user-management/flutter-user-management` |
| Expo (React Native) | `examples/user-management/expo-user-management` |
| Swift | `examples/user-management/swift-user-management` |
| Refine | `examples/user-management/refine-user-management` |

#### Auth Examples (9 implementations)

| Example | Path |
|---------|------|
| Next.js (basic) | `examples/auth/nextjs` |
| Next.js (full) | `examples/auth/nextjs-full` |
| SvelteKit (basic) | `examples/auth/sveltekit` |
| SvelteKit (full) | `examples/auth/sveltekit-full` |
| Hono (basic) | `examples/auth/hono` |
| Hono (full) | `examples/auth/hono-full` |
| Expo Social Auth | `examples/auth/expo-social-auth` |
| Flutter MFA | `examples/auth/flutter-mfa` |
| Flutter Native Google | `examples/auth/flutter-native-google-auth` |

#### Other Notable Examples

- **Slack Clone**: `examples/slack-clone/nextjs-slack-clone` - Real-time app with auth
- **Todo List**: `examples/todo-list` - Basic CRUD with auth

**Source:** [Supabase Examples on GitHub](https://github.com/supabase/supabase/tree/master/examples)

---

### Quickstart Documentation Examples

| Framework | Documentation Link |
|-----------|-------------------|
| React | [Use Supabase Auth with React](https://supabase.com/docs/guides/auth/quickstarts/react) |
| React Native | [Use Supabase Auth with React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native) |
| Next.js | [Build a User Management App with Next.js](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs) |
| Flutter | [Build a User Management App with Flutter](https://supabase.com/docs/guides/getting-started/tutorials/with-flutter) |

---

### Community Resources

| Resource | Link |
|----------|------|
| LogRocket Blog | [How to authenticate React applications with Supabase Auth](https://blog.logrocket.com/authenticate-react-applications-supabase-auth/) |
| OpenReplay Blog | [Authentication in React with Supabase](https://blog.openreplay.com/authentication-in-react-with-supabase/) |
| react-supabase library | [useAuth hook](https://react-supabase.vercel.app/recipes/use-auth) |

---

## References (None have concrete examples which use callback)

1. [Supabase JS Reference - onAuthStateChange](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
2. [GitHub gotrue-js types.ts](https://github.com/supabase/gotrue-js/blob/master/src/lib/types.ts)
3. [Supabase Advanced SSR Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
4. [GitHub Discussion #3031 - What events are available](https://github.com/orgs/supabase/discussions/3031)
5. [GitHub Issue #762 - Deadlock issue](https://github.com/supabase/gotrue-js/issues/762)
6. [GitHub Issue #902 - Cross-tab signOut](https://github.com/supabase/auth-js/issues/902)
7. [GitHub Issue #1594 - Web Locks deadlock](https://github.com/supabase/supabase-js/issues/1594)
8. [DeepWiki - Session Management](https://deepwiki.com/supabase/auth-js/4-session-management)
9. [Supabase Examples Repository](https://github.com/supabase/supabase/tree/master/examples)
10. [Supabase React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)
11. [Supabase React Native Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)