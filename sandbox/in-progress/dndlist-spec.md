# DndList Spec

## 1. Core Problem
1. dnd-kit provides index-based positioning
2. DndList abstracts into ID-based positioning (`beforeId`/`afterId`)
3. Enables clients to implement fractional indexing without knowing internal sort mechanics

## 2. List Config
- `items` - data to render
- `getId` - extract ID from item
- `getGroupId` - extract group ID from item. Items with same `groupId` are sorted together.
- `compare` - sort function for ordering items within a group
- `draggableTypeId` - identifies what kind of item this is. Used by other items' `acceptsDraggableTypes` to check drag-drop compatibility.
- `acceptsDraggableTypes` - array of type IDs this item can receive as drop target.
- `collisionPriority` - when multiple items overlap, higher priority wins as drop target.

## 3. Root Config
- `onDragOver` - called during drag with live position (for optimistic UI preview)
- `onDragEnd` - called when drag completes (for persisting changes)

Both callbacks receive `MoveInfo`:
- `itemId` - ID of item being dragged
- `draggableTypeId` - type ID of item being dragged
- `toGroupId` - destination group ID
- `beforeId` - ID of item before the drop position
- `afterId` - ID of item after the drop position

## 4. Grouping & Nesting

### Grouping
1. Items belong to a group via `groupId`
2. DndList filters and sorts items per group
3. Cross-group moves: `toGroupId` reflects new group
4. Empty group drop: `beforeId = null`, `afterId = null`

### Nesting
1. Items can contain other items
2. Use `collisionPriority` to resolve which item is drop target
3. Drop on parent (not child): append to end

### Example 1: Grouping (buckets with balls)
- Buckets are static containers (not draggable)
- Balls can drag between buckets
- One `DndList.List` for balls with different `groupId` values

### Example 2: Nesting (shelves with boxes)
- Shelves are draggable (reorder shelves)
- Boxes on shelves are draggable (reorder boxes, move between shelves)
- Two `DndList.List` - one for shelves, one for boxes
- Shelf ID becomes box's `groupId`

## Approach
1. Write `TestDndList.tsx` with desired API usage
2. Create `DndList.tsx` with type stubs (empty implementations)
3. Compiler passes
4. Fill in actual logic
5. Test in browser
