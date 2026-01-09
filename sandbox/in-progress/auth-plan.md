# Auth Plan

## Design

GitHub OAuth via Supabase Auth.

**Why GitHub OAuth:**
- Free, unlimited (vs magic links 2/hour limit)
- No email confirmation required
- One-time setup, no ongoing costs

**Flow:**
```
User → "Login with GitHub" → GitHub consent → Supabase callback → App (authenticated)
```

**Data Model:**
- `user_id` on `boards` only (columns/cards inherit via FK)
- RLS subquery policies check ownership through parent

## Progress

| # | Item | Status |
|---|------|--------|
| 1 | Add `user_id` column to `boards` table | ✅ Done |
| 2 | Delete test data (removed seed.sql) | ✅ Done |
| 3 | Enable RLS on all tables | ✅ Done |
| 4 | Create RLS subquery policies | ✅ Done |
| 5 | Add indices for performance | ✅ Done |
| 6 | Update model/api/store to handle `user_id` | ✅ Done |
| 7 | Add AuthButton component | ✅ Done |
| 8 | Protect app routes (redirect if not auth) | Pending |
| 9 | Proper login page or modal | Pending |
| 10 | Onboarding flow (starter board on first login) | Pending |
| 11 | Test multi-user | Pending |

## Configuration

| Service | Setting | Value |
|---------|---------|-------|
| GitHub OAuth App | Callback URL | `https://mbwrlksbjyhgvlwlaoov.supabase.co/auth/v1/callback` |
| Supabase | Site URL | `http://localhost:5173` |
| Supabase | Redirect URLs | `http://localhost:5173/**` |

## Production

- Create separate GitHub OAuth app with production callback URL
- Update Supabase redirect URLs
