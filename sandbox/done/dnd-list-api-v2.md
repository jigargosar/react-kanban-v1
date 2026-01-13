# DndList API v2 Design

## Problem Statement

The current DndList implementation has three components:
- **List** - renders sortable items
- **Group** - static droppable container
- **SortableGroup** - sortable + droppable container

Issues identified:
1. **ID suffix hack** - `GROUP_ID_SUFFIX = '::group'` used to avoid ID conflicts
2. **Three components** - could be simplified to two
3. **ID parsing** - `targetId.replace(GROUP_ID_SUFFIX, '')` in constructMoveInfo

## Requirements Evolution

### Initial State
Started with `DndList.List` only - no support for empty containers receiving drops.

### Problem Discovery
When all items leave a group (e.g., all balls moved from bucket-x to bucket-y), the empty group has no drop target. Items cannot be dragged back.

### First Solution: DndList.Group
Added `DndList.Group` using `useDroppable` to make containers accept drops. Works for static containers (buckets that don't move).

### Second Problem: Sortable Containers
For nested lists (shelves with boxes), shelves need to be:
1. Draggable (reorder shelves)
2. Drop targets (accept boxes)

Single element needs two refs - one from `useSortable`, one from `useDroppable`.

### Second Solution: DndList.SortableGroup
Created `SortableGroup` combining both hooks with `combinedRef` callback.

### ID Conflict Problem
When shelf (id: 'shelf-1') is both sortable AND has a droppable for children, both can't use 'shelf-1' as ID. Added `GROUP_ID_SUFFIX = '::group'` hack:
- Sortable: `id: 'shelf-1'`
- Droppable: `id: 'shelf-1::group'`

Required parsing in `constructMoveInfo` to strip suffix.

### User Requirement: Simplify to Two Components
Request to reduce from 3 to 2 components without boolean flags or complex detection logic.

### Failed Approach: Optional Sortable Config
Proposed unified config with optional `sortable` object - rejected as too complex and requiring dummy values for static containers.

### User Insight: Use dnd-kit's Data Attachment
dnd-kit allows arbitrary `data` on sortables/droppables, available in event handlers via `source.data` and `target.data`.

## Final Solution

### Key Insight
Instead of encoding `groupId` in the droppable ID (requiring suffix + parsing), use:
1. `useId()` for unique droppable IDs (no conflicts)
2. Store `groupId` in `data` object
3. Read `target.data.groupId` in constructMoveInfo

No ID parsing, no suffixes.

### Component Consolidation

**Merge List + Group:**
List handles both sortable items AND the container drop target.

**Rename SortableGroup to Group:**
For containers that are themselves sortable (shelves, columns).

### New List API

Current API (item-centric):
```tsx
<DndList.List config={...}>
  {({ ref, item, isDragging }) => (
    <div ref={ref}>{item.id}</div>
  )}
</DndList.List>
```

Problem: List returns fragment, no container element for droppable ref.

New API (container + items):
```tsx
<DndList.List config={...}>
  {({ containerRef, isDropTarget, items }) => (
    <div ref={containerRef} style={{ background: isDropTarget ? '#444' : '#333' }}>
      {items.map(({ ref, item, isDragging }) => (
        <div ref={ref} key={item.id} style={{ opacity: isDragging ? 0.5 : 1 }}>
          {item.id}
        </div>
      ))}
    </div>
  )}
</DndList.List>
```

Benefits:
- Client controls container element
- Empty lists have drop target (containerRef)
- `isDropTarget` enables visual feedback
- No separate Group needed for static containers

### New Group API (renamed from SortableGroup)

For containers that can be reordered (shelves, columns):

```tsx
<DndList.Group
  config={{
    id: shelf.id,
    index,
    draggableTypeId: 'shelf',
    acceptsPeers: ['shelf'],
    parentGroupId: 'room',
    prevId: prevShelf?.id ?? null,
    acceptsChildren: ['box'],
  }}
>
  {({ ref, isDragging, isDropTarget }) => (
    <div ref={ref}>
      <DndList.List config={...}>
        {/* boxes inside shelf */}
      </DndList.List>
    </div>
  )}
</DndList.Group>
```

Internally uses `useId()` for droppable, stores `groupId` in data.

## Implementation Details

### constructMoveInfo Changes

Before (with ID parsing):
```tsx
const targetId = String(target.id)
const groupId = isGroupTarget ? targetId.replace(GROUP_ID_SUFFIX, '') : targetId
```

After (using data):
```tsx
const LIST_TYPE = Symbol('dndlist-list')
const GROUP_TYPE = Symbol('dndlist-group')

function constructMoveInfo(source, target): MoveInfo {
  const targetData = target.data ?? {}

  // Container targets (List droppable or Group droppable)
  if (target.type === LIST_TYPE || target.type === GROUP_TYPE) {
    return {
      itemId: String(source.id),
      draggableTypeId: String(source.type),
      toGroupId: targetData.groupId,
      beforeId: null,
      afterId: null,
    }
  }

  // Item targets (sortable)
  return {
    itemId: String(source.id),
    draggableTypeId: String(source.type),
    toGroupId: targetData.groupId,
    beforeId: targetData.prevId ?? null,
    afterId: String(target.id),
  }
}
```

### List Internal Droppable

```tsx
function List<T>({ config, children }: ListProps<T>) {
  const { items, getId, getGroupId, groupId, compare, draggableTypeId, acceptsPeers, collisionPriority } = config

  const listDroppableId = useId()
  const { ref: containerRef, isDropTarget } = useDroppable({
    id: listDroppableId,
    type: LIST_TYPE,
    accept: acceptsPeers,
    collisionPriority: CP.Low,
    data: {
      groupId,
    },
  })

  const sortedItems = useMemo(() => {
    return items.filter((item) => getGroupId(item) === groupId).sort(compare)
  }, [items, getGroupId, groupId, compare])

  const itemProps = sortedItems.map((item, index) => {
    // ... create { ref, item, isDragging } for each
  })

  return <>{children({ containerRef, isDropTarget, items: itemProps })}</>
}
```

### Group Internal Droppable

```tsx
function Group({ config, children }: GroupProps) {
  const { id, index, draggableTypeId, acceptsPeers, parentGroupId, prevId, acceptsChildren, collisionPriority } = config

  const groupDroppableId = useId()

  const { ref: sortableRef, isDragging } = useSortable({
    id,
    index,
    type: draggableTypeId,
    accept: acceptsPeers,
    group: parentGroupId,
    collisionPriority: collisionPriority ?? CP.Low,
    data: {
      groupId: parentGroupId,
      prevId,
    },
  })

  const { ref: droppableRef, isDropTarget } = useDroppable({
    id: groupDroppableId,
    type: GROUP_TYPE,
    accept: acceptsChildren,
    collisionPriority: CP.Low,
    data: {
      groupId: id,  // This group's id is the groupId for children
    },
  })

  const combinedRef = useCallback(
    (element: HTMLElement | null) => {
      sortableRef(element)
      droppableRef(element)
    },
    [sortableRef, droppableRef]
  )

  return <>{children({ ref: combinedRef, isDragging, isDropTarget })}</>
}
```

## Summary

### Before (3 components, ID hack)
- List - sortable items only
- Group - static droppable (useDroppable)
- SortableGroup - sortable + droppable (useSortable + useDroppable)
- ID suffix hack: `groupId + '::group'`

### After (2 components, clean)
- List - sortable items + container droppable
- Group - sortable container + droppable (renamed from SortableGroup)
- No ID hack: `useId()` + `data.groupId`

### Breaking Changes
- List children signature changes from `({ ref, item, isDragging })` to `({ containerRef, isDropTarget, items })`
- Old Group component removed (functionality absorbed by List)
- SortableGroup renamed to Group

## Migration Guide

### Static Container (buckets)

Before:
```tsx
<DndList.Group config={{ groupId: 'bucket-x', accept: ['ball'] }}>
  {({ ref, isDropTarget }) => (
    <div ref={ref}>
      <DndList.List config={...}>
        {({ ref, item, isDragging }) => (
          <div ref={ref}>{item.id}</div>
        )}
      </DndList.List>
    </div>
  )}
</DndList.Group>
```

After:
```tsx
<DndList.List config={{ groupId: 'bucket-x', acceptsPeers: ['ball'], ... }}>
  {({ containerRef, isDropTarget, items }) => (
    <div ref={containerRef}>
      {items.map(({ ref, item, isDragging }) => (
        <div ref={ref} key={item.id}>{item.id}</div>
      ))}
    </div>
  )}
</DndList.List>
```

### Sortable Container (shelves)

Before:
```tsx
<DndList.SortableGroup config={{ id: shelf.id, ..., acceptsChildTypes: ['box'] }}>
  {({ ref, isDragging, isDropTarget }) => (
    <div ref={ref}>
      <DndList.List config={...}>
        {({ ref, item, isDragging }) => (
          <div ref={ref}>{item.id}</div>
        )}
      </DndList.List>
    </div>
  )}
</DndList.SortableGroup>
```

After:
```tsx
<DndList.Group config={{ id: shelf.id, ..., acceptsChildren: ['box'] }}>
  {({ ref, isDragging, isDropTarget }) => (
    <div ref={ref}>
      <DndList.List config={{ groupId: shelf.id, acceptsPeers: ['box'], ... }}>
        {({ containerRef, isDropTarget, items }) => (
          <div ref={containerRef}>
            {items.map(({ ref, item, isDragging }) => (
              <div ref={ref} key={item.id}>{item.id}</div>
            ))}
          </div>
        )}
      </DndList.List>
    </div>
  )}
</DndList.Group>
```
