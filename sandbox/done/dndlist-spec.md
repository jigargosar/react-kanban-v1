# DndList Spec

## 1. Core Problem

dnd-kit provides index-based positioning. For fractional indexing, clients need ID-based positioning (`beforeId`/`afterId`).

DndList solves this by:
1. Abstracting index-based API into ID-based API
2. Computing `beforeId`/`afterId` from sort order
3. Returning IDs in `MoveInfo` so clients can calculate new position

Additional requirements:
4. Grouping - items belong to groups via `groupId`, can move between groups
5. Nesting - items can contain other items, both parent and child are draggable

## 2. Examples

### Simple List (reorder items)
```
┌─────────────────────┐
│  ○ Item A           │  draggableTypeId: 'item'
│  ○ Item B           │  acceptsDraggableTypes: ['item']
│  ○ Item C           │  groupId: 'list'
└─────────────────────┘
```
- One list, one type, one group
- Items reorder within the list

### Grouped List (buckets with balls)
```
┌─────────────┐  ┌─────────────┐
│ Bucket X    │  │ Bucket Y    │   (not draggable)
│ ┌─────────┐ │  │ ┌─────────┐ │
│ │ ○ Ball 1│ │  │ │ ○ Ball 4│ │   draggableTypeId: 'ball'
│ │ ○ Ball 2│ │  │ └─────────┘ │   acceptsDraggableTypes: ['ball']
│ │ ○ Ball 3│ │  │             │   groupId: 'bucket-x' or 'bucket-y'
│ └─────────┘ │  │             │
└─────────────┘  └─────────────┘
```
- Buckets are static containers (DOM only)
- Balls can drag between buckets
- One `DndList.List` for balls, `groupId` determines which bucket

### Nested List (shelves with boxes)
```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │ ▣ Shelf 1                           │ │  draggableTypeId: 'shelf'
│ │ ┌───────┐ ┌───────┐ ┌───────┐       │ │  acceptsDraggableTypes: ['shelf', 'box']
│ │ │□ Box A│ │□ Box B│ │□ Box C│       │ │  groupId: 'room'
│ │ └───────┘ └───────┘ └───────┘       │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ▣ Shelf 2                           │ │  draggableTypeId: 'shelf'
│ │ ┌───────┐ ┌───────┐                 │ │  acceptsDraggableTypes: ['shelf', 'box']
│ │ │□ Box D│ │□ Box E│                 │ │  groupId: 'room'
│ │ └───────┘ └───────┘                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

Boxes:
  draggableTypeId: 'box'
  acceptsDraggableTypes: ['box']
  groupId: 'shelf-1' or 'shelf-2'
```
- Shelves are draggable (reorder shelves)
- Boxes are draggable (reorder boxes, move between shelves)
- Two `DndList.List` - one for shelves, one for boxes
- Shelf ID becomes box's `groupId`
- Shelves accept boxes (for dropping into) and shelves (for reordering)

## 3. Root Config
- `onDragOver` - called during drag with live position (for optimistic UI preview)
- `onDragEnd` - called when drag completes (for persisting changes)

Both callbacks receive `MoveInfo`:
- `itemId` - ID of item being dragged
- `draggableTypeId` - type ID of item being dragged
- `toGroupId` - destination group ID
- `beforeId` - ID of item before the drop position
- `afterId` - ID of item after the drop position

## 4. List Config
- `items` - data to render
- `getId` - extract ID from item
- `getGroupId` - extract group ID from item. Items with same `groupId` are sorted together.
- `compare` - sort function for ordering items within a group
- `draggableTypeId` - identifies what kind of item this is. Used by other items' `acceptsDraggableTypes` to check drag-drop compatibility.
- `acceptsDraggableTypes` - array of type IDs this item can receive as drop target.
- `collisionPriority` - when multiple items overlap, higher priority wins as drop target.

## Approach
1. Write `TestDndList.tsx` with desired API usage
2. Create `DndList.tsx` with type stubs (empty implementations)
3. Compiler passes
4. Fill in actual logic
5. Test in browser
