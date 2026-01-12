# DndList Spec

## 1. Core Problem
1. dnd-kit provides index-based positioning
2. DndList abstracts into ID-based positioning (`beforeId`/`afterId`)
3. Enables clients to implement fractional indexing without knowing internal sort mechanics

## 2. Concepts
- `type` - what kind of item this is (e.g., 'card', 'column'). Client-defined string.
- `accept` - what types can drop on this item (e.g., `['card']` means cards can drop on me). Controls drag-drop compatibility.
- `groupId` - which group this item belongs to for sorting/filtering. Items with same `groupId` are sorted together. When an item drops on a target, `toGroupId` in MoveInfo is set to target's `groupId`.

## 3. MoveInfo Contract
Output structure:
- `itemId` - ID of item being dragged
- `type` - client-defined type string
- `toGroupId` - destination group ID
- `beforeId` - ID of item that will precede (null if first)
- `afterId` - ID of item that will follow (null if last)

## 4. Drag Events
1. `onDragOver` - live preview during drag (optimistic UI)
2. `onDragEnd` - final commit when drag completes
3. Both emit same `MoveInfo` shape
4. Client decides what to do with each

## 5. Grouping
1. Items belong to a group via `groupId`
2. DndList filters and sorts items per group
3. Cross-group moves: `toGroupId` reflects new group
4. Empty group drop: `beforeId = null`, `afterId = null`

## 6. Nested Draggables
1. Containers are themselves draggable items
2. Containers hold child items in a nested group
3. Drop on container (not on child): append to end (`beforeId = lastChildId`, `afterId = null`)

## 7. Index to ID Conversion
1. Client provides: items, sort function, getId function
2. DndList computes: sorted order, `prevId` per item
3. DndList stores `prevId` in dnd-kit's data bag
4. On drop, DndList retrieves target's `prevId` → `beforeId`, target's `id` → `afterId`

## 8. Configuration

### Root Config
- `onDragOver` - preview callback
- `onDragEnd` - commit callback

### List Config
- `items` - data to render
- `getId` - extract ID from item
- `getGroupId` - extract group ID from item
- `compare` - sort function
- `type` - client-defined type string
- `accept` - array of types this list can receive
- `collisionPriority` - for nested item resolution

## 9. Type System
1. `type` and `accept` are client-defined strings
2. DndList is agnostic - no hardcoded type literals
3. Client controls which types can drop on which

## Approach
1. Write `TestDndList.tsx` with desired API usage
2. Create `DndList.tsx` with type stubs (empty implementations)
3. Compiler passes
4. Fill in actual logic
5. Test in browser
