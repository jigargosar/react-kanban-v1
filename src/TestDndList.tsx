import { useState } from 'react'
import { DndList, type MoveInfo } from './DndList'
import { CollisionPriority } from '@dnd-kit/abstract'

// ============================================
// Example 1: Simple List (reorder items)
// ============================================
type Item = { id: string; position: string }

const initialItems: Item[] = [
  { id: 'item-a', position: 'a' },
  { id: 'item-b', position: 'b' },
  { id: 'item-c', position: 'c' },
]

function SimpleList() {
  const [items] = useState(initialItems)

  const handleMove = (info: MoveInfo) => {
    console.log('SimpleList move:', info)
  }

  return (
    <div style={{ padding: 16, background: '#222', borderRadius: 8 }}>
      <h3>Simple List</h3>
      <DndList.Root
        config={{
          onDragOver: handleMove,
          onDragEnd: handleMove,
        }}
      >
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
          {({ ref, item, isDragging }) => (
            <div
              ref={ref}
              style={{
                opacity: isDragging ? 0.5 : 1,
                padding: 8,
                margin: 4,
                background: '#444',
                borderRadius: 4,
              }}
            >
              ○ {item.id}
            </div>
          )}
        </DndList.List>
      </DndList.Root>
    </div>
  )
}

// ============================================
// Example 2: Grouped List (buckets with balls)
// ============================================
type Ball = { id: string; bucketId: string; position: string }

const initialBalls: Ball[] = [
  { id: 'ball-1', bucketId: 'bucket-x', position: 'a' },
  { id: 'ball-2', bucketId: 'bucket-x', position: 'b' },
  { id: 'ball-3', bucketId: 'bucket-x', position: 'c' },
  { id: 'ball-4', bucketId: 'bucket-y', position: 'a' },
]

function GroupedList() {
  const [balls] = useState(initialBalls)

  const handleMove = (info: MoveInfo) => {
    console.log('GroupedList move:', info)
  }

  return (
    <div style={{ padding: 16, background: '#222', borderRadius: 8 }}>
      <h3>Grouped List (buckets with balls)</h3>
      <DndList.Root
        config={{
          onDragOver: handleMove,
          onDragEnd: handleMove,
        }}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          {['bucket-x', 'bucket-y'].map((bucketId) => (
            <div
              key={bucketId}
              style={{ padding: 16, background: '#333', borderRadius: 8, minWidth: 150 }}
            >
              <div style={{ marginBottom: 8 }}>{bucketId}</div>
              <DndList.List
                config={{
                  items: balls,
                  getId: (b) => b.id,
                  getGroupId: (b) => b.bucketId,
                  groupId: bucketId,
                  compare: (a, b) => (a.position < b.position ? -1 : 1),
                  draggableTypeId: 'ball',
                  acceptsDraggableTypes: ['ball'],
                  collisionPriority: CollisionPriority.Normal,
                }}
              >
                {({ ref, item, isDragging }) => (
                  <div
                    ref={ref}
                    style={{
                      opacity: isDragging ? 0.5 : 1,
                      padding: 8,
                      margin: 4,
                      background: '#555',
                      borderRadius: 4,
                    }}
                  >
                    ○ {item.id}
                  </div>
                )}
              </DndList.List>
            </div>
          ))}
        </div>
      </DndList.Root>
    </div>
  )
}

// ============================================
// Example 3: Nested List (shelves with boxes)
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
  { id: 'box-d', shelfId: 'shelf-2', position: 'a' },
  { id: 'box-e', shelfId: 'shelf-2', position: 'b' },
]

function NestedList() {
  const [shelves] = useState(initialShelves)
  const [boxes] = useState(initialBoxes)

  const handleMove = (info: MoveInfo) => {
    console.log('NestedList move:', info)
  }

  return (
    <div style={{ padding: 16, background: '#222', borderRadius: 8 }}>
      <h3>Nested List (shelves with boxes)</h3>
      <DndList.Root
        config={{
          onDragOver: handleMove,
          onDragEnd: handleMove,
        }}
      >
        <DndList.List
          config={{
            items: shelves,
            getId: (s) => s.id,
            getGroupId: () => 'room',
            groupId: 'room',
            compare: (a, b) => (a.position < b.position ? -1 : 1),
            draggableTypeId: 'shelf',
            acceptsDraggableTypes: ['shelf'],
            collisionPriority: CollisionPriority.Low,
          }}
        >
          {({ ref, item: shelf, isDragging }) => (
            <div
              ref={ref}
              style={{
                opacity: isDragging ? 0.5 : 1,
                padding: 16,
                margin: 8,
                background: '#333',
                borderRadius: 8,
              }}
            >
              <div style={{ marginBottom: 8 }}>▣ {shelf.id}</div>
              <div style={{ display: 'flex', gap: 8 }}>
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
                  {({ ref, item: box, isDragging }) => (
                    <div
                      ref={ref}
                      style={{
                        opacity: isDragging ? 0.5 : 1,
                        padding: 8,
                        background: '#555',
                        borderRadius: 4,
                      }}
                    >
                      □ {box.id}
                    </div>
                  )}
                </DndList.List>
              </div>
            </div>
          )}
        </DndList.List>
      </DndList.Root>
    </div>
  )
}

// ============================================
// Main Test Page
// ============================================
export function TestDndList() {
  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 32 }}>
      <h1>DndList Test</h1>
      <SimpleList />
      <GroupedList />
      <NestedList />
    </div>
  )
}
