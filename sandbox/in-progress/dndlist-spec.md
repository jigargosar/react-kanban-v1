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

## 4. Grouping
1. Items belong to a group via `groupId`
2. DndList filters and sorts items per group
3. Cross-group moves: `toGroupId` reflects new group
4. Empty group drop: `beforeId = null`, `afterId = null`

## 5. Nested Draggables
1. Items can contain other items (e.g., columns contain cards)
2. Use `collisionPriority` to resolve which item is drop target
3. Drop on parent (not child): append to end

## 6. Index to ID Conversion
1. Client provides: items, sort function, getId function
2. DndList computes: sorted order, `prevId` per item
3. DndList stores `prevId` in dnd-kit's data bag
4. On drop, DndList retrieves target's `prevId` → `beforeId`, target's `id` → `afterId`

## 7. Type System
1. `draggableTypeId` and `acceptsDraggableTypes` are client-defined strings
2. DndList is agnostic - no hardcoded type literals
3. Client controls which types can drop on which

## Approach
1. Write `TestDndList.tsx` with desired API usage
2. Create `DndList.tsx` with type stubs (empty implementations)
3. Compiler passes
4. Fill in actual logic
5. Test in browser
