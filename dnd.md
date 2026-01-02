# Drag and Drop Requirements

## Overview

A generic, reusable drag-and-drop facade that abstracts dnd-kit complexity while supporting nested sortable contexts.

## Core Requirements

### Generic Facade

The facade must remain agnostic of domain concepts (columns, cards, tasks, etc.). It operates on:

- **Items** - any sortable entities
- **Groups** - containers that hold items
- **MoveInfo** - reports what moved and its new neighbors

### Uniform Group Handling

Single-group and multi-group scenarios use identical facade logic:

- Single group: client returns a constant group ID for all items (e.g., `"board"`)
- Multiple groups: client returns varying group IDs per item (e.g., `card.columnId`)

The facade has no awareness of whether there's one group or many. No special cases, no conditional handling.

### MoveInfo Contract

```ts
type MoveInfo = {
  movedItemId: ItemId
  destGroupId: GroupId
  beforeId: ItemId | null
  afterId: ItemId | null
}

onDndMove(info: MoveInfo, isEnd: boolean)
```

Consumers derive domain-specific values (e.g., fractional positions) from neighbor IDs.

### Nesting Support

The facade must support composition for nested drag-and-drop:

- Outer level: e.g., columns sortable within a board
- Inner level: e.g., cards sortable within and across columns

Each level is an independent facade instance. Nesting is a client-side concern through composition, not a special mode within the facade.

## Current Problem

The existing implementation has become entangled with application-specific logic:

- Column and card handling mixed into the facade
- No longer generic or reusable
- Difficult to understand and maintain
- Lost the clean abstraction that separated dnd-kit mechanics from domain logic

## Goal

Restore the facade to a clean, generic abstraction that:

1. Works identically for any sortable items with groups
2. Supports nesting through composition
3. Keeps all domain logic in the consumer
4. Remains easy to understand and maintain

---

## Implementation Plan A

### Components

**Dnd.Root**
- Wraps `DragDropProvider` from dnd-kit
- Passes through provider props (sensors, modifiers, etc.)
- Provides context for List registration
- Routes drag events to registered Lists by `source.type`

**Dnd.List**
- Registers `{type, items, getId, group, onMove}` with Root
- Iterates items and renders via children callback
- Computes `MoveInfo` with neighbor IDs
- Handles droppable zone for empty groups

### API

```tsx
<Dnd.Root sensors={[PointerSensor]}>
  <Dnd.List
    type="column"
    items={columns}
    getId={(c) => c.id}
    onMove={handleColumnMove}
  >
    {(col, { ref, isDragging }) => (
      <div ref={ref} className={isDragging ? 'opacity-50' : ''}>
        <ColumnHeader column={col} />
        <Dnd.List
          type="card"
          items={getColumnCards(col.id)}
          getId={(c) => c.id}
          group={col.id}
          onMove={handleCardMove}
        >
          {(card, { ref, isDragging }) => (
            <div ref={ref} className={isDragging ? 'opacity-50' : ''}>
              {card.title}
            </div>
          )}
        </Dnd.List>
      </div>
    )}
  </Dnd.List>
</Dnd.Root>
```

### Props

**Root:**
- `children` - React children
- `...providerProps` - passed through to DragDropProvider (sensors, modifiers, etc.)

**List:**
- `type` - string identifier for this sortable level (e.g., "column", "card")
- `items` - array of items to render
- `getId` - function to extract ID from item
- `group` - optional group ID for multi-container (defaults to type)
- `onMove` - callback receiving `(info: MoveInfo, isEnd: boolean)`
- `children` - render function `(item, { ref, isDragging }) => ReactNode`

### Render Callback

```tsx
{(item: T, dnd: { ref: RefCallback, isDragging: boolean }) => ReactNode}
```

Client attaches `ref` to wrapper element. Choice of element (div, li, custom component with forwardRef) is client's decision.
