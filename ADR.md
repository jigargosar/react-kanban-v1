# Architecture Decision Records

* Client-side UUID as primary key: Helps optimistic updates, reduces client complexity.
* Error Handling: Fail fast, capture in store and show minimal display. Revisit when polishing app for production.
* DB: `ON DELETE CASCADE`: DB handles referential integrity. Revisit if soft-delete needed.
* Auth: GitHub OAuth — free, no email limits, Supabase handles flow.
* Store as facade: Views access data through Zustand only, never direct API/TanStack.
* TanStack Query: Handles race conditions, caching, request deduplication internally.
* DB: Ownership via boards.user_id only. Columns/cards inherit via FK. Single source of truth, avoids inconsistency.
  * RLS subquery policies: Check ownership through parent chain. Indices ensure performance.
* Onboarding: creates starter board only on first login
