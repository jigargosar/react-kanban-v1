# Search Feature

## Goal

Client-side filter to find cards by title.

## Design Decisions

| Decision           | Choice            | Rationale                    |
|--------------------|-------------------|------------------------------|
| Scope              | Active board only | Simple, most common use case |
| Filter behavior    | Hide non-matching | Clean UI, less visual noise  |
| State location     | Component-local   | Simple, no need to persist   |
| Match highlighting | Pending           | Keep it simple for MVP       |
| Empty state        | "No cards match"  | Clear feedback               |
| Keyboard shortcut  | Pending           | Nice-to-have later           |

## Design

- Search input in board view
- Filter visible cards as user types
- Hide non-matching cards
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

| # | Item                                | Status  |
|---|-------------------------------------|---------|
| 1 | Add search input to UI              | Done    |
| 2 | Add search state (store or local)   | Done    |
| 3 | Filter cards by search term         | Done    |
| 4 | Show/hide or dim non-matching cards | Done    |
| 5 | Add clear search button             | Done    |
| 6 | Show match count                    | Pending |
| 7 | Match highlighting                  | Pending |
| 8 | Keyboard shortcut (Ctrl+F or /)     | Pending |
