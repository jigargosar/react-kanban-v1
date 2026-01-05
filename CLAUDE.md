# Supabase

Using Supabase cloud, not local. No `supabase start`.

- No new migration files while project not live. Replace init migration file for any changes.
- Reset DB: `echo "y" | pnpm exec supabase db reset --linked`
- Regenerate types: `pnpm exec supabase gen types typescript --linked > src/database.types.ts`

# Testing

- When testing using Chrome MCP in Claude code: Skip pointer/dnd browser testing. Has issues, wastes time. (FYI this applies only to slow non-repeatable chrome plugin of Claude code, nothing else.)
