# DnD Facade Implementation Plan

## 1. Facade Internal Computations

What facade needs to compute/manage internally:
- Index management for `useSortable`
- `beforeId`/`afterId` derivation from sorted items
- Registering items with context for MoveInfo construction

**Open questions:**
- How does Root know about items in child Lists?
- Does List register with Root via context?

---

## 2. Client Code Changes

How migration affects client code:
- Store API: `moveCard(id, columnId, toIndex)` → `moveCard(id, columnId, { beforeId, afterId })`
- `onDragOver`/`onDragEnd` handlers - what do they receive?
- What props move from client to facade?

**Open questions:**
- Does store need both APIs during migration?
- How does `calculatePosition` change?

---

## 3. Edge Cases

Scenarios to handle correctly:
- Empty columns (no beforeId/afterId)
- Single item in column
- Cross-column moves during drag (onDragOver)
- Column reordering
- First/last position drops

**Open questions:**
- How to represent "insert at start" vs "insert at end"?
- What if target column is empty?

---

## 4. React Context Structure

How Root and List communicate:
- Does List need to register with Root?
- How does Root access sorted items from Lists?
- Event flow from DragDropProvider → Root → MoveInfo

**Open questions:**
- Can Root construct MoveInfo without knowing List internals?
- What context shape do we need?

---

## 5. Implementation Sequence

Order of changes:
- TBD after resolving above questions

---

## Discussion Log

(We'll capture key decisions here as we iterate)
