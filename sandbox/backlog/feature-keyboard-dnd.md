# Keyboard DnD Feature Plan

## Problem Statement

KeyboardSensor in @dnd-kit has issues in our kanban app:

1. **Default `preventActivation` is inverted** - Returns `true` (prevent) when focus IS on the element, should be opposite
2. **No distinction between card/column elements and their children** - Typing in inputs triggers drag
3. **Current elements are `<div>` not focusable** - Cards and columns use `<div>` without `tabIndex`

### Bug in dnd-kit Default

From `reference/dnd-kit-dom/index.js:1340-1356`:

```javascript
var defaults = Object.freeze({
  // ...
  preventActivation(event, source) {
    var _a4;
    const target = (_a4 = source.handle) != null ? _a4 : source.element;
    return event.target === target;  // BUG: returns TRUE when target IS the element
  }
});
```

The logic is inverted - it **prevents** activation when `event.target === target`, meaning it blocks drag when focus is correctly on the draggable element. This appears to be a bug in @dnd-kit/dom@0.2.1.

## Current Architecture

### Elements Structure

```
Column (div ref={ref})           <-- Draggable, not focusable
├── ColumnHeader
│   ├── h2 (column title)        <-- Double-click to edit
│   ├── EditableInput            <-- When editing
│   └── Delete button
└── ColumnContent
    ├── Card (div ref={ref})     <-- Draggable, not focusable
    │   ├── card.title text
    │   ├── EditableInput        <-- When editing (double-click)
    │   └── Delete button
    ├── AddCardInput             <-- When adding
    └── "+ Add card" button
```

### Key Observations

1. **Cards**: `<div>` with `ref={cardRef}`, not focusable, has child delete button and edit input
2. **Columns**: `<div>` with `ref={ref}`, not focusable, contains header, cards, and add button
3. **Sensors**: Currently only `PointerSensor` is configured in `dnd.tsx`

---

## Options

### Option 1: Configure KeyboardSensor with `preventActivation`

**Approach**: Fix the inverted logic and prevent activation when focus is on child elements.

```typescript
KeyboardSensor.configure({
  preventActivation: (event, source) => {
    const activator = source.handle ?? source.element
    return event.target !== activator
  }
})
```

**Pros**:
- Minimal code change
- Uses existing API as intended

**Cons**:
- Requires cards/columns to be focusable (`tabIndex={0}`)
- Current `<div>` elements would need `tabIndex={0}` added
- User must Tab to exact element to drag (not intuitive if focus lands on child)

**Required Changes**:
1. Add `tabIndex={0}` to card `<div>` (line 153-155 in App.tsx)
2. Add `tabIndex={0}` to column `<div>` (line 453-455 in App.tsx)
3. Configure KeyboardSensor in dnd.tsx

---

### Option 2: Add Explicit Drag Handles

**Approach**: Add dedicated drag handle elements that receive focus and initiate drag.

```tsx
// Card with drag handle
<div ref={ref} className="card">
  <button ref={handleRef} className="drag-handle" tabIndex={0}>
    ⠿
  </button>
  <span>{card.title}</span>
  <button className="delete">×</button>
</div>
```

**Pros**:
- Clear visual affordance for drag
- Separates drag activation from content interaction
- Better accessibility (handle can have aria-label)
- Matches dnd-kit's expected pattern

**Cons**:
- More significant UI change
- Requires `useDraggable` with `handleRef` instead of `useSortable`
- Need to modify Dnd facade to expose `handleRef`

**Required Changes**:
1. Modify `Dnd.List` to expose `handleRef` callback
2. Update `CardItem` to render drag handle with `handleRef`
3. Update `Column` wrapper to render drag handle with `handleRef`
4. Style drag handles
5. Configure KeyboardSensor (same as Option 1)

---

### Option 3: Convert Cards/Columns to `<button>` Elements

**Approach**: Make the draggable element itself a `<button>` (inherently focusable).

```tsx
<button
  ref={cardRef}
  className="card"
  onDoubleClick={onStartEdit}
>
  {isEditing ? <EditableInput /> : card.title}
  <span className="delete" onClick={onDelete}>×</span>
</button>
```

**Pros**:
- Semantically correct for interactive elements
- Naturally focusable
- No extra drag handle UI needed

**Cons**:
- Buttons have default styles to reset
- Nested buttons (delete) are invalid HTML - need to use different element
- May affect existing click/double-click behavior
- Cards with edit inputs inside buttons is problematic

**Required Changes**:
1. Change card `<div>` to `<button>`
2. Change column wrapper to `<button>` or add button wrapper
3. Fix nested interactive element issues
4. Configure KeyboardSensor

---

### Option 4: Hybrid - Focusable Div + Smart preventActivation

**Approach**: Keep `<div>` but make focusable, use smarter `preventActivation` that checks for interactive children.

```typescript
KeyboardSensor.configure({
  preventActivation: (event, source) => {
    const target = event.target as HTMLElement
    const activator = source.handle ?? source.element

    // Prevent if not on activator AND not inside activator
    if (!activator?.contains(target)) return true

    // Prevent if on interactive child element
    if (target !== activator) {
      const isInteractive = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName)
      if (isInteractive) return true
    }

    return false
  }
})
```

**Pros**:
- Allows keyboard activation from anywhere on card/column (not just exact element)
- Still prevents activation when on inputs/buttons
- No drag handle UI needed
- Minimal structural changes

**Cons**:
- More complex logic
- May have edge cases with nested elements
- Focus could land on non-interactive child (like a `<span>`) and allow drag

**Required Changes**:
1. Add `tabIndex={0}` to cards and columns
2. Configure KeyboardSensor with smart `preventActivation`
3. Possibly add focus styles for accessibility

---

## Recommendation

**Option 4 (Hybrid)** for MVP, with path to **Option 2 (Drag Handles)** for better UX later.

### Rationale

1. **Option 4 is lowest effort** - Only requires `tabIndex` additions and sensor config
2. **Solves immediate problem** - Keyboard DnD works without conflicting with inputs
3. **Option 2 is better UX long-term** - Clear drag affordance, but more work
4. **Options 1 & 3 have significant drawbacks** - Too restrictive or structural issues

### Implementation Steps (Option 4)

#### Phase 1: Enable KeyboardSensor

```typescript
// dnd.tsx
import { KeyboardSensor } from '@dnd-kit/react'

const configuredKeyboardSensor = KeyboardSensor.configure({
  preventActivation: (event, source) => {
    const target = event.target as HTMLElement
    const activator = source.handle ?? source.element

    if (!activator?.contains(target)) return true

    const interactiveTags = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A']
    if (target !== activator && interactiveTags.includes(target.tagName)) {
      return true
    }

    return false
  }
})

// In Root component
<DragDropProvider
  sensors={[PointerSensor, configuredKeyboardSensor]}
  ...
>
```

#### Phase 2: Make Elements Focusable

```tsx
// Card - add tabIndex
<div
  ref={cardRef}
  tabIndex={0}
  className={`... ${isDragging ? 'opacity-50' : ''}`}
  ...
>

// Column - add tabIndex
<div
  ref={ref}
  tabIndex={0}
  className={`... ${isDragging ? 'opacity-50' : ''}`}
>
```

#### Phase 3: Add Focus Styles (Accessibility)

```tsx
// Card
className={`... focus:outline-none focus:ring-2 focus:ring-blue-500`}

// Column
className={`... focus:outline-none focus:ring-2 focus:ring-blue-500`}
```

---

## Testing Plan

1. **Tab navigation**: Can tab through cards and columns
2. **Keyboard drag start**: Space/Enter on card/column starts drag
3. **Arrow key movement**: Arrow keys move dragged item
4. **Escape cancels**: Escape key cancels drag
5. **Space/Enter confirms**: Confirms drop
6. **Input protection**: Space/Enter in add card input does NOT start drag
7. **Edit protection**: Typing in edit input does NOT interfere
8. **Delete button**: Delete button click works (not triggering drag)

---

## Open Questions

1. Should drag handles be added for better UX? (Future consideration)
2. Should cards be `<button>` elements for better semantics? (Structural change)
3. Do we need visual feedback during keyboard drag? (Accessibility enhancement)

---

## References

- `reference/dnd-kit-dom/index.d.ts` - Sensor API types
- `reference/dnd-kit-dom/index.js:1340-1356` - KeyboardSensor defaults
- `reference/dnd-kit-dom/index.js:1358-1522` - KeyboardSensor implementation
