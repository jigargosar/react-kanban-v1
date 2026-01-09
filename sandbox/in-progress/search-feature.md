# Search Feature

## Goal

Client-side filter to find cards by title.

## Design

- Search input in header or board view
- Filter visible cards as user types
- Highlight matches or dim non-matches
- Clear search to show all

## UI Changes

- Add search input (text field with placeholder "Search cards...")
- Cards not matching filter: hide or dim
- Show match count (e.g., "3 of 12 cards")

## Implementation

```tsx
// In store or component
const [searchTerm, setSearchTerm] = useState('')

const filteredCards = Object.values(cards).filter(card =>
  card.title.toLowerCase().includes(searchTerm.toLowerCase())
)
```

## Progress

| # | Item | Status |
|---|------|--------|
| 1 | Add search input to UI | Pending |
| 2 | Add search state (store or local) | Pending |
| 3 | Filter cards by search term | Pending |
| 4 | Show/hide or dim non-matching cards | Pending |
| 5 | Add clear search button | Pending |
| 6 | Show match count | Pending |
