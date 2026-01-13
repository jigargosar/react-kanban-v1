import { useState, useRef } from 'react'
import { DndList, type MoveInfo } from './DndList'
import { CollisionPriority } from '@dnd-kit/abstract'
import { DragDropProvider, PointerSensor } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { useDroppable } from '@dnd-kit/react'
import { move } from '@dnd-kit/helpers'

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
          {({ containerRef, isDropTarget, renderItems }) => (
            <div
              ref={containerRef}
              style={{
                background: isDropTarget ? '#444' : '#333',
                padding: 8,
                borderRadius: 4,
                minHeight: 50,
              }}
            >
              {renderItems(({ ref, item, isDragging }) => (
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
              ))}
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
  // bucket-y starts empty to test empty group drops
]

function GroupedList() {
  const [balls, setBalls] = useState(initialBalls)

  const handleDragOver = (info: MoveInfo) => {
    console.log('GroupedList dragOver:', info)
  }
  const handleDragEnd = (info: MoveInfo) => {
    console.log('GroupedList dragEnd:', info)
    setBalls((prev) => {
      const ball = prev.find((b) => b.id === info.itemId)
      if (ball == null) return prev

      // Remove ball from current position
      const without = prev.filter((b) => b.id !== info.itemId)

      // Find new position in target group
      const targetBalls = without.filter((b) => b.bucketId === info.toGroupId)
      let newPosition: string

      if (info.afterId != null) {
        const afterBall = targetBalls.find((b) => b.id === info.afterId)
        newPosition = afterBall != null ? afterBall.position + '_' : 'a'
      } else if (info.beforeId != null) {
        const beforeBall = targetBalls.find((b) => b.id === info.beforeId)
        newPosition = beforeBall != null ? beforeBall.position + 'z' : 'z'
      } else {
        newPosition = 'a'
      }

      return [...without, { ...ball, bucketId: info.toGroupId, position: newPosition }]
    })
  }

  return (
    <div style={{ padding: 16, background: '#222', borderRadius: 8 }}>
      <h3>Grouped List (buckets with balls)</h3>
      <DndList.Root
        config={{
          onDragOver: handleDragOver,
          onDragEnd: handleDragEnd,
        }}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          {['bucket-x', 'bucket-y'].map((bucketId) => (
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
                    minHeight: 100,
                  }}
                >
                  <div style={{ marginBottom: 8 }}>{bucketId}</div>
                  {renderItems(({ ref, item, isDragging }) => (
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
                  ))}
                </div>
              )}
            </DndList.List>
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
  // shelf-2 starts empty to test empty group drops
]

function NestedList() {
  const [shelves, setShelves] = useState(initialShelves)
  const [boxes, setBoxes] = useState(initialBoxes)

  const handleDragOver = (info: MoveInfo) => {
    console.log('NestedList dragOver:', info)
  }
  const handleDragEnd = (info: MoveInfo) => {
    console.log('NestedList dragEnd:', info)

    if (info.draggableTypeId === 'box') {
      setBoxes((prev) => {
        const box = prev.find((b) => b.id === info.itemId)
        if (box == null) return prev

        const without = prev.filter((b) => b.id !== info.itemId)
        const targetBoxes = without.filter((b) => b.shelfId === info.toGroupId)
        let newPosition: string

        if (info.afterId != null) {
          const afterBox = targetBoxes.find((b) => b.id === info.afterId)
          newPosition = afterBox != null ? afterBox.position + '_' : 'a'
        } else if (info.beforeId != null) {
          const beforeBox = targetBoxes.find((b) => b.id === info.beforeId)
          newPosition = beforeBox != null ? beforeBox.position + 'z' : 'z'
        } else {
          newPosition = 'a'
        }

        return [...without, { ...box, shelfId: info.toGroupId, position: newPosition }]
      })
    } else if (info.draggableTypeId === 'shelf') {
      setShelves((prev) => {
        const shelf = prev.find((s) => s.id === info.itemId)
        if (shelf == null) return prev

        const without = prev.filter((s) => s.id !== info.itemId)
        let newPosition: string

        if (info.afterId != null) {
          const afterShelf = without.find((s) => s.id === info.afterId)
          newPosition = afterShelf != null ? afterShelf.position + '_' : 'a'
        } else if (info.beforeId != null) {
          const beforeShelf = without.find((s) => s.id === info.beforeId)
          newPosition = beforeShelf != null ? beforeShelf.position + 'z' : 'z'
        } else {
          newPosition = 'a'
        }

        return [...without, { ...shelf, position: newPosition }]
      })
    }
  }

  return (
    <div style={{ padding: 16, background: '#222', borderRadius: 8 }}>
      <h3>Nested List (shelves with boxes)</h3>
      <DndList.Root
        config={{
          onDragOver: handleDragOver,
          onDragEnd: handleDragEnd,
        }}
      >
        {shelves
          .slice()
          .sort((a, b) => (a.position < b.position ? -1 : 1))
          .map((shelf, index, sortedShelves) => {
            const prevShelf = sortedShelves[index - 1]
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
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>▣ {shelf.id}</div>
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
                                padding: 8,
                                background: '#666',
                                borderRadius: 4,
                              }}
                            >
                              □ {box.id}
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
      </DndList.Root>
    </div>
  )
}

// ============================================
// Example 4: Direct dnd-kit (buckets with balls)
// ============================================

function DirectBallV2({ ballId, index, bucketId }: { ballId: string; index: number; bucketId: string }) {
  const { ref, isDragging } = useSortable({
    id: ballId,
    index,
    type: 'dball',
    accept: ['dball'],
    group: bucketId,
    collisionPriority: CollisionPriority.High,
  })

  return (
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
      ○ {ballId}
    </div>
  )
}

function DirectBucketV2({ bucketId, ballIds }: { bucketId: string; ballIds: string[] }) {
  const { ref, isDropTarget } = useDroppable({
    id: bucketId,
    type: 'dbucket',
    accept: ['dball'],
    collisionPriority: CollisionPriority.Low,
  })

  return (
    <div
      ref={ref}
      style={{
        padding: 16,
        background: isDropTarget ? '#444' : '#333',
        borderRadius: 8,
        minWidth: 150,
        minHeight: 100,
      }}
    >
      <div style={{ marginBottom: 8 }}>{bucketId}</div>
      {ballIds.map((ballId, index) => (
        <DirectBallV2 key={ballId} ballId={ballId} index={index} bucketId={bucketId} />
      ))}
    </div>
  )
}

function DirectKitGroupedList() {
  const [items, setItems] = useState<Record<string, string[]>>({
    'dbucket-x': ['dball-1', 'dball-2', 'dball-3'],
    'dbucket-y': ['dball-4'],
  })
  const lastItems = useRef(items)

  return (
    <div style={{ padding: 16, background: '#222', borderRadius: 8 }}>
      <h3>Direct dnd-kit (buckets with balls)</h3>
      <DragDropProvider
        sensors={[PointerSensor]}
        onDragStart={() => {
          lastItems.current = items
        }}
        onDragOver={(event) => {
          setItems((items) => move(items, event))
        }}
        onDragEnd={(event) => {
          if (event.canceled) {
            setItems(lastItems.current)
            return
          }
          setItems((items) => move(items, event))
        }}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          {Object.entries(items).map(([bucketId, ballIds]) => (
            <DirectBucketV2 key={bucketId} bucketId={bucketId} ballIds={ballIds} />
          ))}
        </div>
      </DragDropProvider>
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
      <DirectKitGroupedList />
    </div>
  )
}
