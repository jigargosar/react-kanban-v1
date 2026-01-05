# Auth Design

## Goal

Secure user authentication with minimal friction. Users own their data, see only their boards/cards.

## Solution

GitHub OAuth via Supabase Auth.

**Why GitHub OAuth:**
- Free, unlimited (vs magic links 2/hour limit)
- No email confirmation required
- One-time setup, no ongoing costs
- Supabase handles entire flow

## Flow

```
User → "Login with GitHub" → GitHub consent → Supabase callback → App (authenticated)
```

## Configuration

| Service | Setting | Value |
|---------|---------|-------|
| GitHub OAuth App | Callback URL | `https://mbwrlksbjyhgvlwlaoov.supabase.co/auth/v1/callback` |
| Supabase | Site URL | `http://localhost:5173` |
| Supabase | Redirect URLs | `http://localhost:5173/**` |
| Supabase | Allow users without email | Enabled |

## Data Model Changes

- Add `user_id` (UUID, FK to `auth.users`) to: `boards`, `columns`, `cards`
- RLS policies: users see/modify only their own data

## Production

- Create separate GitHub OAuth app with production callback URL
- Update Supabase redirect URLs
