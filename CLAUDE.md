# Supabase

Using Supabase cloud, not local. No `supabase start`.

- No new migration files while project not live. Replace init migration file for any changes.
- Reset DB: `echo "y" | pnpm exec supabase db reset --linked`
- Regenerate types: `pnpm exec supabase gen types typescript --linked > src/database.types.ts`

# Testing

- When testing using Chrome MCP in Claude code: Skip pointer/dnd browser testing. Has issues, wastes time. (FYI this applies only to slow non-repeatable chrome plugin of Claude code, nothing else.)

# Sandbox Folder (`sandbox/`)

Design docs and reference materials organized by status:

- `backlog/` - Planned features not yet started
- `in-progress/` - Active design/implementation docs
- `done/` - Completed feature docs (for reference)
- `external-ref/` - Third-party docs (zustand, dnd-kit, etc.)
