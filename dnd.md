# DnD Facade Design

## 1. Requirements

### Goals
- Encapsulate `@dnd-kit/react` into a clean facade (`Dnd.Root`, `Dnd.List`)
- Hide index management from consumers - indices are DnD implementation detail
- Emit semantic `MoveInfo` with `beforeId`/`afterId` instead of numeric indices
- Support nested sortables (columns containing cards)
- Support cross-container moves (cards between columns)
- Preserve all current functionality without bugs

### MoveInfo Type
```ts
type MoveInfo = {
  itemId: string
  type: string           // 'card' | 'column' - needed to dispatch to correct handler
  toGroupId: string | null  // null for top-level (columns)
  beforeId: string | null   // item to insert after (null = start)
  afterId: string | null    // item to insert before (null = end)
}
```

### Proposed Facade API
```tsx
<Dnd.Root onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
  <Dnd.List
    items={sortedColumns}
    type="column"
    accept={['card', 'column']}
    collisionPriority={CollisionPriority.Low}
  >
    {({ ref, item: column, isDragging }) => (
      <div ref={ref} className={isDragging ? 'opacity-50' : ''}>
        <Dnd.List
          items={columnCards}
          type="card"
          accept="card"
          group={column.id}
        >
          {({ ref, item: card, isDragging }) => (
            <div ref={ref}>{card.title}</div>
          )}
        </Dnd.List>
      </div>
    )}
  </Dnd.List>
</Dnd.Root>
```

### Why type is needed in MoveInfo
- `DragDropProvider` fires events at root level, not per-list
- Single `onDragOver`/`onDragEnd` receives all moves
- Client needs `type` to dispatch to correct store method (`moveCard` vs `moveColumn`)

---

## 2. Current Implementation Analysis

### Architecture
- `DragDropProvider` wraps entire board (single provider for all lists)
- `useSortable` on both columns and cards
- Columns: `type: 'column'`, `accept: ['card', 'column']`, `collisionPriority: Low`
- Cards: `type: 'card'`, `accept: 'card'`, `group: columnId`

### Event Flow
1. `onDragOver` - fires during drag, used for cross-column card moves (live preview)
2. `onDragEnd` - fires on drop, used for final position (both cards and columns)

### Current Index-Based Pattern
```
DnD event → extract targetIndex → store.moveCard(id, columnId, toIndex)
                                         ↓
                               calculatePosition(sortedItems, toIndex)
                                         ↓
                               generateKeyBetween(before, after)
```

**App.tsx** extracts index:
```tsx
// Column reorder
const overIndex = columnOrder.indexOf(target.id as ColumnId)
moveColumn(source.id as ColumnId, overIndex)

// Card reorder
targetIndex = targetCards.findIndex(c => c.id === target.id)
moveCard(sourceCard.id, targetColumnId, targetIndex)
```

**store.ts** uses index to calculate position:
```tsx
moveCard: (cardId, toColumnId, toIndex) => {
  const targetCards = getColumnCards(cards, toColumnId).filter(c => c.id !== cardId)
  const newPosition = calculatePosition(targetCards, toIndex)
}
```

**model.ts** derives before/after from index:
```tsx
function calculatePosition(sortedItems, targetIndex) {
  const before = sortedItems[targetIndex - 1]?.position ?? null
  const after = sortedItems[targetIndex]?.position ?? null
  return generateKeyBetween(before, after)
}
```

### Known Bug
- Ghost item sometimes displays at top of column during drag
- On drop, card appears as second item instead of first
- Likely caused by index calculation mismatch between visual and data state

### Proposed Change
Instead of index-based:
```
DnD → beforeId/afterId → store.moveCard(id, columnId, { beforeId, afterId })
                                  ↓
                         lookup positions directly from beforeId/afterId
```

---

## 3. DnD Kit Architecture Constraints

### Single Provider Requirement
- `DragDropProvider` is a context provider - only one exists
- All drag events fire at provider level, not per-list
- Nested `Dnd.List` cannot have own `onDragOver`/`onDragEnd`
- Events include `source.type` to identify which list the item came from

### useSortable vs useDroppable
- `useSortable` = draggable + droppable combined
- `accept` prop filters which types can be dropped
- No need for separate `useDroppable` in our case
- Docs example uses `useDroppable` for columns that aren't themselves draggable

### move Helper from @dnd-kit/helpers
- Designed for array-based state: `{ A: ['id1', 'id2'], B: ['id3'] }`
- Our state uses fractional-indexing: `Record<CardId, Card>` with `position` strings
- Cannot use `move` helper directly - need custom implementation

---

## 4. Available DnD Kit Features

### Sensors (detect drag interactions)
| Sensor           | Purpose               | Currently Used |
|------------------|-----------------------|----------------|
| `PointerSensor`  | Mouse and touch       | Yes (default)  |
| `KeyboardSensor` | Arrow keys navigation | No             |

### Plugins (extend functionality)
| Plugin          | Purpose                            | Currently Used             |
|-----------------|------------------------------------|----------------------------|
| `AutoScroller`  | Auto-scroll containers during drag | Appears to work (default?) |
| `Accessibility` | Screen reader announcements        | No                         |

### Modifiers (customize drag behavior)
| Modifier                   | Purpose                          |
|----------------------------|----------------------------------|
| `RestrictToWindow`         | Keep within viewport             |
| `RestrictToElement`        | Keep within parent container     |
| `RestrictToHorizontalAxis` | Lock to horizontal only          |
| `RestrictToVerticalAxis`   | Lock to vertical only            |
| `Snap`                     | Snap to grid (configurable size) |

### DragOverlay
- Renders dragged item outside normal flow
- Smooth drop animations (configurable duration/easing)
- Can have separate modifiers
- Currently not used - using opacity change instead

### Configuration Example
```tsx
<DragDropProvider
  sensors={[PointerSensor, KeyboardSensor]}
  plugins={[AutoScroller, Accessibility]}
  modifiers={[RestrictToWindow]}
>
```

---

## 5. Potential UX Enhancements

### Priority 1: Keyboard Support
- Add `KeyboardSensor` for accessibility
- Arrow keys to navigate, Enter/Space to pick up/drop
- Required for WCAG compliance

### Priority 2: Drag Overlay
- Better visual feedback during drag
- Item follows cursor outside normal flow
- Smooth drop animations
- Shows clear preview of dragged item

### Priority 3: Accessibility Plugin
- Screen reader announcements
- "Picked up item X", "Dropped in column Y"

### Priority 4: Touch Improvements
- Delay before drag starts (prevent accidental drags)
- Touch-specific feedback

---

## 6. Implementation Plan

### Phase 1: Facade without behavior changes
1. Create `Dnd.Root` wrapping `DragDropProvider`
2. Create `Dnd.List` encapsulating `useSortable` + index management
3. Construct `MoveInfo` internally with `beforeId`/`afterId`
4. Update store to accept `beforeId`/`afterId` instead of index
5. Verify all current functionality works

### Phase 2: Bug fixes
1. Investigate ghost item position mismatch
2. Ensure index calculation is correct during drag
3. Test edge cases: empty columns, single item, first/last positions

### Phase 3: UX enhancements
1. Add `KeyboardSensor`
2. Add `Accessibility` plugin
3. Consider `DragOverlay` for better visual feedback
