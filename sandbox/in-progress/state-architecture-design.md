# State Architecture Design

## Problem Statement

Current implementation has architectural issues exposed by React StrictMode:

1. **Double API calls on mount** — StrictMode double-mounts components, causing 6 API requests instead of 3
2. **No race condition protection** — Rapid navigation could cause stale data to overwrite fresh data
3. **No request cancellation** — Unmounted components still process API responses
4. **Fragmented state concerns** — Server state and UI state mixed in single store

These are symptoms of missing proper data fetching infrastructure.

## Goals

1. **Eliminate race conditions** — Only process responses for current requests
2. **Proper cleanup** — Cancel/ignore in-flight requests on unmount
3. **Centralized state access** — Views only interact with store, never directly with API
4. **Separation of concerns** — Distinguish server state from UI state
5. **Offline resilience** — Graceful degradation, cache survives refresh
6. **Optimistic updates** — Snappy UI without waiting for server confirmation

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│  Views (React Components)                           │
│  - Render only                                      │
│  - No direct API calls                              │
│  - Use selector hooks (useCards, useBoards, etc.)  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  Store (Zustand)                                    │
│  - Single point of access for all state            │
│  - Exposes scoped selector hooks                   │
│  - Delegates data fetching to TanStack Query       │
│  - Manages UI state (editing, activeBoardId)       │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  TanStack Query (internal to store)                 │
│  - Request deduplication                           │
│  - Race condition handling                         │
│  - Caching & staleness                             │
│  - Optimistic updates                              │
│  - Offline detection                               │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  API Layer (api.ts)                                 │
│  - Supabase calls                                  │
│  - Returns data, no state management               │
└─────────────────────────────────────────────────────┘
```

### Key Principle

**Views are agnostic to data source.** Whether data comes from Supabase, localStorage, or WebSocket — views don't know or care. Store is the only interface.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Views | React | UI rendering |
| State | Zustand | Centralized store, UI state |
| Data Fetching | TanStack Query | Server state, caching, race conditions |
| Routing | TanStack Router | Type-safe routing, URL as state |
| Persistence | query-persist-client | Cache survives refresh |
| Backend | Supabase | Database, API |

### Why TanStack Query?

Solves all identified problems:

| Problem | TanStack Solution |
|---------|-------------------|
| Double fetches | Request deduplication |
| Race conditions | Request ID tracking, automatic cancellation |
| Stale data | Configurable staleness, background refetch |
| Offline | `onlineManager` pauses queries, queues mutations |
| Optimistic updates | `onMutate` / `onError` rollback pattern |

### Why Keep Zustand?

TanStack Query handles server state. Zustand handles:

- UI state (`editing`, modal open/closed)
- Derived state
- Actions that coordinate multiple queries
- Facade over TanStack (components don't import TanStack directly)

## State Classification

| State | Type | Location |
|-------|------|----------|
| `boards`, `columns`, `cards` | Server | TanStack Query (via store) |
| `status`, `error` | Server metadata | TanStack Query (built-in) |
| `activeBoardId` | Navigation | URL param (TanStack Router) |
| `editing` | UI | Zustand or component-local |

## Selector Hooks Pattern

Components access store via scoped hooks, not raw `useAppStore`:

```tsx
// Current (exposes everything)
const { boards, cards, columns, moveCard, deleteCard, ... } = useAppStore()

// Better (scoped access)
const { cards, addCard, updateCard, deleteCard } = useCards()
const { editing, startEditing, stopEditing } = useEditing()
```

Benefits:
- Encapsulation — component sees only what it needs
- Re-render optimization — only triggers on slice changes
- Discoverability — clear API surface
- Refactoring safety — change internals without touching components

## Store + TanStack Integration

Store wraps TanStack, components never use TanStack directly:

```tsx
// Inside store — uses TanStack
export const useCards = () => {
  const queryClient = useQueryClient()

  const { data: cards } = useQuery({
    queryKey: ['cards'],
    queryFn: () => api.fetchCards(),
  })

  const addCard = useMutation({
    mutationFn: api.persistCard,
    onMutate: async (newCard) => {
      // Optimistic update
      await queryClient.cancelQueries(['cards'])
      const previous = queryClient.getQueryData(['cards'])
      queryClient.setQueryData(['cards'], (old) => [...old, newCard])
      return { previous }
    },
    onError: (err, newCard, context) => {
      // Rollback on error
      queryClient.setQueryData(['cards'], context.previous)
    },
  })

  return { cards, addCard: addCard.mutate }
}

// Component — only sees store API
function CardList() {
  const { cards, addCard } = useCards()
  // ...
}
```

## Routing with TanStack Router

Move `activeBoardId` from store to URL:

```
/boards/:boardId
```

Benefits:
- Shareable URLs
- Browser back/forward works
- Bookmarkable
- SSR-ready

## Offline Strategy

Using `@tanstack/query-persist-client`:

1. Cache persisted to localStorage/IndexedDB
2. Survives page refresh
3. Shows cached data when offline
4. Queues mutations, retries when online

Not full offline-first, but graceful degradation — good enough for portfolio.

## Migration Steps

1. Add TanStack Query, wrap in store
2. Add selector hooks (`useCards`, `useBoards`, `useColumns`)
3. Migrate `load()` to `useQuery`
4. Migrate mutations to `useMutation` with optimistic updates
5. Add TanStack Router, move `activeBoardId` to URL
6. Add `query-persist-client` for offline cache
7. Clean up Zustand — remove server state, keep UI state only

## Decisions Made

1. **Centralized store** — Views never access API or TanStack directly
2. **Zustand + TanStack hybrid** — Not either/or, each handles different state type
3. **Selector hooks** — Scoped access, not raw store exposure
4. **URL for navigation state** — `activeBoardId` belongs in URL
5. **Graceful offline** — Cache persistence, not full offline-first
6. **React ecosystem** — Broad appeal for portfolio, tech differentiation in future projects
