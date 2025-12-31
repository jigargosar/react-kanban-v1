import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { sampleBoard, type Board, type Card, type CardId, type Column, type ColumnId } from './model'

function CardView({ card, isDragging }: { card: Card; isDragging?: boolean }) {
  return (
    <div
      className={`bg-gray-700 rounded p-3 shadow text-gray-100 ${
        isDragging ? 'opacity-50 cursor-default' : 'cursor-pointer'
      }`}
    >
      {card.title}
    </div>
  )
}

function SortableCard({ card }: { card: Card }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardView card={card} isDragging={isDragging} />
    </div>
  )
}

function AddCardInput({
  onAdd,
  onCancel,
}: {
  onAdd: (title: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const trimmed = title.trim()
    if (trimmed) {
      onAdd(trimmed)
      setTitle('')
    } else {
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSubmit()
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={onCancel}
      placeholder="Card title..."
      className="w-full bg-gray-700 text-gray-100 rounded p-3 outline-none placeholder-gray-400"
    />
  )
}

function ColumnView({
  column,
  cards,
  onAddCard,
}: {
  column: Column
  cards: Card[]
  onAddCard: (columnId: ColumnId, title: string) => void
}) {
  const [isAdding, setIsAdding] = useState(false)
  const { setNodeRef } = useDroppable({ id: column.id })

  return (
    <div className="bg-gray-800 rounded-lg w-72 flex-shrink-0 flex flex-col max-h-full">
      <h2 className="text-gray-100 font-semibold p-4 pb-0">{column.title}</h2>
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 overflow-y-auto flex-1 p-4"
      >
        <SortableContext
          items={column.cardIds}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {isAdding ? (
          <AddCardInput
            onAdd={(title) => {
              onAddCard(column.id, title)
            }}
            onCancel={() => setIsAdding(false)}
          />
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="text-gray-400 hover:text-gray-200 text-left p-2 rounded hover:bg-gray-700 transition-colors"
          >
            + Add card
          </button>
        )}
      </div>
    </div>
  )
}

function App() {
  const [board, setBoard] = useState<Board>(sampleBoard)
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const addCard = (columnId: ColumnId, title: string) => {
    const cardId = crypto.randomUUID()
    const newCard: Card = { id: cardId, title }

    setBoard((prev) => ({
      cards: { ...prev.cards, [cardId]: newCard },
      columns: prev.columns.map((col) =>
        col.id === columnId ? { ...col, cardIds: [...col.cardIds, cardId] } : col
      ),
    }))
  }

  const findColumnByCardId = (cardId: CardId): Column | undefined => {
    return board.columns.find((col) => col.cardIds.includes(cardId))
  }

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as CardId
    setActiveCard(board.cards[cardId] || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeCardId = active.id as CardId
    const overId = over.id as string

    const sourceColumn = findColumnByCardId(activeCardId)
    if (!sourceColumn) return

    // Check if dropping over a card or a column
    const overColumn = findColumnByCardId(overId as CardId) ||
      board.columns.find((col) => col.id === overId)

    if (!overColumn) return

    // Same column reorder
    if (sourceColumn.id === overColumn.id) {
      const oldIndex = sourceColumn.cardIds.indexOf(activeCardId)
      const newIndex = sourceColumn.cardIds.indexOf(overId as CardId)

      if (oldIndex !== newIndex && newIndex !== -1) {
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.map((col) => {
            if (col.id !== sourceColumn.id) return col
            const newCardIds = [...col.cardIds]
            newCardIds.splice(oldIndex, 1)
            newCardIds.splice(newIndex, 0, activeCardId)
            return { ...col, cardIds: newCardIds }
          }),
        }))
      }
    } else {
      // Move to different column
      const overCardIndex = overColumn.cardIds.indexOf(overId as CardId)
      const insertIndex = overCardIndex !== -1 ? overCardIndex : overColumn.cardIds.length

      setBoard((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => {
          if (col.id === sourceColumn.id) {
            return { ...col, cardIds: col.cardIds.filter((id) => id !== activeCardId) }
          }
          if (col.id === overColumn.id) {
            const newCardIds = [...col.cardIds]
            newCardIds.splice(insertIndex, 0, activeCardId)
            return { ...col, cardIds: newCardIds }
          }
          return col
        }),
      }))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen bg-gray-900 flex flex-col overflow-hidden select-none">
        <header className="p-8 pb-0">
          <h1 className="text-2xl font-bold text-gray-100 mb-6">Kanban Board</h1>
        </header>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 pt-0">
          <div className="flex gap-4 h-full">
            {board.columns.map((column) => (
              <ColumnView
                key={column.id}
                column={column}
                cards={column.cardIds.map((id) => board.cards[id])}
                onAddCard={addCard}
              />
            ))}
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeCard ? <CardView card={activeCard} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}

export default App
