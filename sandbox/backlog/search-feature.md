# Search Feature

## Goal

Find cards across all boards by title.

## UI

- Search box in header
- Results dropdown/panel showing matching cards
- Click result → navigate to board, highlight card

## Implementation

### Phase 1: Client-side search

1. Add search input to header
2. Filter cards by title (case-insensitive contains)
3. Show results with board/column context
4. Click → `setActiveBoard(boardId)`, scroll to card

### Phase 2: Enhancements (Deferred)

- Debounced input
- Keyboard navigation (arrow keys, enter to select)
- Search columns and boards too
- Highlight matching text in results

## Notes

- Client-side only (all data already loaded)
- No backend search needed for current scale
