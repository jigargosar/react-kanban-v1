# Architecture Decision Records

* Client-side UUID as primary key: Helps optimistic updates, reduces client complexity.
* Error Handling: Fail fast, capture in store and show minimal display. Revisit when polishing app for production.
* `ON DELETE CASCADE`: DB handles referential integrity. Revisit if soft-delete needed.
* Auth: GitHub OAuth — free, no email limits, Supabase handles flow.
* Store as facade: Views access data through Zustand only, never direct API/TanStack.
* TanStack Query: Handles race conditions, caching, request deduplication internally.
