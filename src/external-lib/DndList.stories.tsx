/**
 * DndList: Sortable list components built on dnd-kit
 *
 * Components:
 * - Root: Wraps DragDropProvider, receives onDragOver/onDragEnd callbacks
 * - List: Sortable items with built-in container drop target
 * - Group: Sortable container that also accepts child items (for nesting)
 *
 * Key patterns:
 * - containerRef: Attach to container div - enables drops on empty lists
 * - renderItems(fn): Render function receives {ref, item, isDragging} per item
 * - isDropTarget: True when draggable is over this container
 *
 * MoveInfo callback shape:
 * - itemId: ID of dragged item
 * - draggableTypeId: Type of dragged item (for multi-type lists)
 * - toGroupId: Target container ID
 * - beforeId/afterId: Adjacent item IDs for position calculation
 */

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { DndList, type MoveInfo } from './DndList'
import { CollisionPriority } from '@dnd-kit/abstract'

const meta: Meta = {
  title: 'DndList',
}

export default meta

// ============================================
// Helper: Position calculation from MoveInfo
// ============================================
function calculatePosition<T extends { id: string; position: string }>(
  items: T[],
  info: MoveInfo,
  getGroupId: (item: T) => string
): string {
  const targetItems = items.filter((i) => getGroupId(i) === info.toGroupId)

  if (info.afterId != null) {
    const afterItem = targetItems.find((i) => i.id === info.afterId)
    return afterItem != null ? afterItem.position + '_' : 'a'
  }
  if (info.beforeId != null) {
    const beforeItem = targetItems.find((i) => i.id === info.beforeId)
    return beforeItem != null ? beforeItem.position + 'z' : 'z'
  }
  return 'a'
}

// ============================================
// Story 1: Simple List
// Single container, reorder items within
// ============================================
type Item = { id: string; position: string }

const initialItems: Item[] = [
  { id: 'item-a', position: 'a' },
  { id: 'item-b', position: 'b' },
  { id: 'item-c', position: 'c' },
]

function SimpleListExample() {
  const [items, setItems] = useState(initialItems)

  const handleDragEnd = (info: MoveInfo) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === info.itemId)
      if (item == null) return prev

      const without = prev.filter((i) => i.id !== info.itemId)
      const newPosition = calculatePosition(without, info, () => 'list')
      return [...without, { ...item, position: newPosition }]
    })
  }

  return (
    <DndList.Root config={{ onDragOver: () => {}, onDragEnd: handleDragEnd }}>
      <DndList.List
        config={{
          items,
          getId: (i) => i.id,
          getGroupId: () => 'list',
          groupId: 'list',
          compare: (a, b) => (a.position < b.position ? -1 : 1),
          draggableTypeId: 'item',
          acceptsDraggableTypes: ['item'],
          collisionPriority: CollisionPriority.Normal,
        }}
      >
        {({ containerRef, isDropTarget, renderItems }) => (
          <div
            ref={containerRef}
            style={{
              background: isDropTarget ? '#444' : '#333',
              padding: 8,
              borderRadius: 8,
              width: 200,
            }}
          >
            {renderItems(({ ref, item, isDragging }) => (
              <div
                ref={ref}
                style={{
                  opacity: isDragging ? 0.5 : 1,
                  padding: 12,
                  margin: 4,
                  background: '#555',
                  borderRadius: 4,
                  cursor: 'grab',
                }}
              >
                {item.id}
              </div>
            ))}
          </div>
        )}
      </DndList.List>
    </DndList.Root>
  )
}

export const SimpleList: StoryObj = {
  render: () => <SimpleListExample />,
}

// ============================================
// Story 2: Grouped List
// Multiple containers, items move between them
// Demonstrates: containerRef enables empty container drops
// ============================================
type Ball = { id: string; bucketId: string; position: string }

const initialBalls: Ball[] = [
  { id: 'ball-1', bucketId: 'bucket-a', position: 'a' },
  { id: 'ball-2', bucketId: 'bucket-a', position: 'b' },
  { id: 'ball-3', bucketId: 'bucket-a', position: 'c' },
  // bucket-b starts empty - tests empty container drops
]

function GroupedListExample() {
  const [balls, setBalls] = useState(initialBalls)

  const handleDragEnd = (info: MoveInfo) => {
    setBalls((prev) => {
      const ball = prev.find((b) => b.id === info.itemId)
      if (ball == null) return prev

      const without = prev.filter((b) => b.id !== info.itemId)
      const newPosition = calculatePosition(without, info, (b) => b.bucketId)
      return [...without, { ...ball, bucketId: info.toGroupId, position: newPosition }]
    })
  }

  return (
    <DndList.Root config={{ onDragOver: () => {}, onDragEnd: handleDragEnd }}>
      <div style={{ display: 'flex', gap: 16 }}>
        {['bucket-a', 'bucket-b'].map((bucketId) => (
          <DndList.List
            key={bucketId}
            config={{
              items: balls,
              getId: (b) => b.id,
              getGroupId: (b) => b.bucketId,
              groupId: bucketId,
              compare: (a, b) => (a.position < b.position ? -1 : 1),
              draggableTypeId: 'ball',
              acceptsDraggableTypes: ['ball'],
              collisionPriority: CollisionPriority.High,
            }}
          >
            {({ containerRef, isDropTarget, renderItems }) => (
              <div
                ref={containerRef}
                style={{
                  padding: 16,
                  background: isDropTarget ? '#444' : '#333',
                  borderRadius: 8,
                  minWidth: 150,
                  minHeight: 120,
                }}
              >
                <div style={{ marginBottom: 8, color: '#888' }}>{bucketId}</div>
                {renderItems(({ ref, item, isDragging }) => (
                  <div
                    ref={ref}
                    style={{
                      opacity: isDragging ? 0.5 : 1,
                      padding: 10,
                      margin: 4,
                      background: '#555',
                      borderRadius: 4,
                      cursor: 'grab',
                    }}
                  >
                    {item.id}
                  </div>
                ))}
              </div>
            )}
          </DndList.List>
        ))}
      </div>
    </DndList.Root>
  )
}

export const GroupedList: StoryObj = {
  render: () => <GroupedListExample />,
}

// ============================================
// Story 3: Nested List
// Sortable containers (shelves) containing sortable items (boxes)
// Demonstrates: Group component for sortable containers
// ============================================
type Shelf = { id: string; position: string }
type Box = { id: string; shelfId: string; position: string }

const initialShelves: Shelf[] = [
  { id: 'shelf-1', position: 'a' },
  { id: 'shelf-2', position: 'b' },
]

const initialBoxes: Box[] = [
  { id: 'box-a', shelfId: 'shelf-1', position: 'a' },
  { id: 'box-b', shelfId: 'shelf-1', position: 'b' },
  { id: 'box-c', shelfId: 'shelf-1', position: 'c' },
  // shelf-2 starts empty - tests empty container drops
]

function NestedListExample() {
  const [shelves, setShelves] = useState(initialShelves)
  const [boxes, setBoxes] = useState(initialBoxes)

  const handleDragEnd = (info: MoveInfo) => {
    // Handle box moves
    if (info.draggableTypeId === 'box') {
      setBoxes((prev) => {
        const box = prev.find((b) => b.id === info.itemId)
        if (box == null) return prev

        const without = prev.filter((b) => b.id !== info.itemId)
        const newPosition = calculatePosition(without, info, (b) => b.shelfId)
        return [...without, { ...box, shelfId: info.toGroupId, position: newPosition }]
      })
    }

    // Handle shelf reordering
    if (info.draggableTypeId === 'shelf') {
      setShelves((prev) => {
        const shelf = prev.find((s) => s.id === info.itemId)
        if (shelf == null) return prev

        const without = prev.filter((s) => s.id !== info.itemId)
        const newPosition = calculatePosition(without, info, () => 'room')
        return [...without, { ...shelf, position: newPosition }]
      })
    }
  }

  return (
    <DndList.Root config={{ onDragOver: () => {}, onDragEnd: handleDragEnd }}>
      <div style={{ width: 400 }}>
        {shelves
          .slice()
          .sort((a, b) => (a.position < b.position ? -1 : 1))
          .map((shelf, index, sorted) => {
            const prevShelf = sorted[index - 1]
            return (
              <DndList.Group
                key={shelf.id}
                config={{
                  id: shelf.id,
                  index,
                  draggableTypeId: 'shelf',
                  acceptsDraggableTypes: ['shelf'],
                  groupId: 'room',
                  prevId: prevShelf?.id ?? null,
                  acceptsChildTypes: ['box'],
                  collisionPriority: CollisionPriority.Low,
                }}
              >
                {({ ref, isDragging, isDropTarget }) => (
                  <div
                    ref={ref}
                    style={{
                      opacity: isDragging ? 0.5 : 1,
                      padding: 16,
                      margin: 8,
                      background: isDropTarget ? '#444' : '#333',
                      borderRadius: 8,
                      cursor: 'grab',
                    }}
                  >
                    <div style={{ marginBottom: 8, color: '#888' }}>{shelf.id}</div>
                    <DndList.List
                      config={{
                        items: boxes,
                        getId: (b) => b.id,
                        getGroupId: (b) => b.shelfId,
                        groupId: shelf.id,
                        compare: (a, b) => (a.position < b.position ? -1 : 1),
                        draggableTypeId: 'box',
                        acceptsDraggableTypes: ['box'],
                        collisionPriority: CollisionPriority.High,
                      }}
                    >
                      {({ containerRef, isDropTarget: isListDropTarget, renderItems }) => (
                        <div
                          ref={containerRef}
                          style={{
                            display: 'flex',
                            gap: 8,
                            minHeight: 40,
                            background: isListDropTarget ? '#555' : 'transparent',
                            padding: 4,
                            borderRadius: 4,
                          }}
                        >
                          {renderItems(({ ref, item: box, isDragging }) => (
                            <div
                              ref={ref}
                              style={{
                                opacity: isDragging ? 0.5 : 1,
                                padding: 10,
                                background: '#666',
                                borderRadius: 4,
                                cursor: 'grab',
                              }}
                            >
                              {box.id}
                            </div>
                          ))}
                        </div>
                      )}
                    </DndList.List>
                  </div>
                )}
              </DndList.Group>
            )
          })}
      </div>
    </DndList.Root>
  )
}

export const NestedList: StoryObj = {
  render: () => <NestedListExample />,
}
