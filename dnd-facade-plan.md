# DnD Facade Implementation Plan

## 1. Facade Internal Computations

What facade needs to compute/manage internally:
- Index management for `useSortable`
- `beforeId`/`afterId` derivation from sorted items

**Resolution:** No register pattern needed. List attaches data via `useSortable({ data })`:
```tsx
useSortable({
  id: getId(item),
  index,
  type,
  data: {
    groupId: group,    // List's group prop
    prevId,            // sorted[index-1]?.id ?? null
  }
})
```
Root reads `source.data` and `target.data` from event to construct MoveInfo.

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

**Resolutions:**

| Scenario | toGroupId | beforeId | afterId |
|----------|-----------|----------|---------|
| Card → Card | target.data.groupId | target.data.prevId | target.id |
| Card → Column (empty/end) | target.id | target.data.lastCardId | null |
| Column → Column | 'board' | target.data.prevId | target.id |
| Insert at start | groupId | null | firstItem.id |
| Insert at end | groupId | lastItem.id | null |

---

## 4. React Context Structure

**Resolution:** No custom context needed for data flow.

Data flows via `useSortable({ data })` prop:
1. List computes sorted items
2. List attaches `{ groupId, prevId }` to each item via `useSortable({ data })`
3. DragDropProvider fires event with `source.data` and `target.data`
4. Root reads data from event, constructs MoveInfo

**MoveInfo construction in Root:**
```tsx
onDragEnd={(event) => {
  const { source, target } = event.operation

  const moveInfo = {
    itemId: source.id,
    type: source.type,
    toGroupId: target.type === 'column' ? target.id : target.data.groupId,
    beforeId: target.type === 'column' ? target.data.lastCardId : target.data.prevId,
    afterId: target.type === 'column' ? null : target.id,
  }

  onDragEnd(moveInfo)  // call client's handler
}}
```

**Column data:** Columns also attach `lastCardId` for drops on empty/end of column:
```tsx
useSortable({
  id: column.id,
  type: 'column',
  data: {
    lastCardId: columnCards.at(-1)?.id ?? null,
    prevId: sortedColumns[index - 1]?.id ?? null,
  }
})
```

---

## 5. Implementation Sequence

Order of changes:
- TBD after resolving above questions

---

## Discussion Log

### Decision: Data via useSortable, not register pattern

**Problem:** How does Root construct MoveInfo when sorted items live in child Lists?

**Options considered:**
1. Register pattern - List registers sorted items with Root via context
2. List handles MoveInfo - Root forwards raw event, each List checks if it's involved

**Solution:** Neither. Use `useSortable({ data })` prop.
- List already computes sorted items for rendering
- List attaches `{ groupId, prevId }` to each item via data prop
- DragDropProvider includes this data in event
- Root reads `source.data` and `target.data` to construct MoveInfo

**Benefits:**
- No custom context machinery
- No registration/unregistration lifecycle
- Data flows naturally with dnd-kit's existing mechanism
- List encapsulates sorting, Root encapsulates MoveInfo construction
