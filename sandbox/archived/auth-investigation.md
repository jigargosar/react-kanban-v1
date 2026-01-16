# Supabase Auth Investigation

## Known (from docs/source)

1. `INITIAL_SESSION` — fires once on client construction, loads session from localStorage
2. `SIGNED_IN` — fires on actual auth events (OAuth callback, password login, token refresh)
3. `getSession()` — reads from localStorage only, no server verification
4. `getUser()` — makes server request, validates JWT, returns authentic data
5. localStorage key format: `sb-{projectId}-auth-token`
6. Session structure: `{ access_token, refresh_token, expires_at, user }`

## Assumptions (unverified)

1. `INITIAL_SESSION` with session ≠ user is authenticated (session could be expired/invalid)
2. For valid unexpired session, `SIGNED_IN` does NOT fire after `INITIAL_SESSION`
3. `SIGNED_OUT` clears localStorage
4. Token refresh happens automatically before expiry
5. `TOKEN_REFRESHED` fires on successful refresh
6. If token refresh fails, `SIGNED_OUT` fires
7. API 401 triggers `SIGNED_OUT` automatically

## Unknown (need to verify)

1. Event sequence: fresh OAuth login (cold start → OAuth → return)
2. Event sequence: page reload when already logged in
3. Event sequence: page reload with expired token
4. When exactly is localStorage cleared on signOut?
5. What happens if localStorage is manually cleared while app running?
6. What happens if server rejects session during API call (401)?
7. Is `getUser()` needed before trusting `INITIAL_SESSION`?

---

## Test Groups

### Group 1: Basic Event Observation
**Changes:** Enhanced logging (already in api.ts)
**Flows:**
- 1.1: Clear localStorage, refresh → observe events (expect: INITIAL_SESSION null)
- 1.2: With valid session, refresh → observe events (expect: INITIAL_SESSION with user, then ?)
- 1.3: Sign out while logged in → observe events + localStorage state
- 1.4: Full OAuth login flow → observe events from start to finish
**Verifies:** Assumptions 2, 3; Unknowns 1, 2, 4

### Group 2: Expired Token Behavior
**Changes:** Manually edit localStorage expires_at to past timestamp
**Flows:**
- 2.1: Edit expires_at, refresh → observe events (expect: TOKEN_REFRESHED? SIGNED_IN?)
**Verifies:** Assumptions 4, 5; Unknown 3

### Group 3: Server Verification
**Changes:** Add getUser() call after INITIAL_SESSION, log result
**Flows:**
- 3.1: Valid session + getUser() → does it succeed?
- 3.2: Invalid session (revoke via dashboard?) + getUser() → does it catch?
**Verifies:** Assumption 1; Unknown 7

### Group 4: API 401 Behavior
**Changes:** Add logging for API errors, force 401 scenario
**Flows:**
- 4.1: Manually corrupt access_token, call fetchAll → does SIGNED_OUT fire?
**Verifies:** Assumption 7; Unknown 6

---

## Current State

Debug logging added to api.ts (lines 146-168) — logs auth events with timing.

Next: Run Group 1 flows to establish baseline understanding.
