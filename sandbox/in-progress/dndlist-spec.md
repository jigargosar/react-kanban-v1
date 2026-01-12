# DndList Module Requirements

## 1. Core Problem
1. dnd-kit provides index-based positioning
2. Module abstracts into ID-based positioning (`beforeId`/`afterId`)
3. Enables consumers to implement fractional indexing without knowing internal sort mechanics

## 2. MoveInfo Contract
Output structure:
- `itemId` - ID of item being dragged
- `type` - consumer-defined type string
- `toGroupId` - destination group ID
- `beforeId` - ID of item that will precede (null if first)
- `afterId` - ID of item that will follow (null if last)

## 3. Drag Events
1. `onDragOver` - live preview during drag (optimistic UI)
2. `onDragEnd` - final commit when drag completes
3. Both emit same `MoveInfo` shape
4. Consumer decides what to do with each

## 4. Grouping
1. Items belong to a group via `groupId`
2. Module filters and sorts items per group
3. Cross-group moves: `toGroupId` reflects new group
4. Empty group drop: `beforeId = null`, `afterId = null`

## 5. Nested Draggables
1. Containers are themselves draggable items
2. Containers hold child items in a nested group
3. Drop on container (not on child): append to end (`beforeId = lastChildId`, `afterId = null`)

## 6. Index to ID Conversion
1. Consumer provides: items, sort function, getId function
2. Module computes: sorted order, `prevId` per item
3. Module stores `prevId` in dnd-kit's data bag
4. On drop, module retrieves target's `prevId` → `beforeId`, target's `id` → `afterId`

## 7. Item Configuration
All explicit, no optionals:
- `id` - unique identifier
- `type` - consumer-defined type string
- `groupId` - which group this item belongs to
- `accept` - array of types this item can receive
- `collisionPriority` - for nested item resolution

## 8. Type System
1. `type` and `accept` are consumer-defined strings
2. Module is agnostic - no hardcoded type literals
3. Consumer controls which types can drop on which

## Approach
1. Write `TestDndList.tsx` with desired API usage
2. Create `DndList.tsx` with type stubs (empty implementations)
3. Compiler passes
4. Fill in actual logic
5. Test in browser
