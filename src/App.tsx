import { useState, useRef, useEffect } from 'react'
import { DragDropProvider, useDroppable } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { move } from '@dnd-kit/helpers'
import { CollisionPriority } from '@dnd-kit/abstract'
import { sampleBoard, type Card, type ColumnId } from './model'

type CardPositions = Record<ColumnId, string[]>

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

function SortableCard({
  card,
  columnId,
  index,
}: {
  card: Card
  columnId: ColumnId
  index: number
}) {
  const { ref, isDragging } = useSortable({
    id: card.id,
    index,
    group: columnId,
    type: 'item',
  })

  return (
    <div ref={ref}>
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
  columnId,
  title,
  cardIds,
  cards,
  onAddCard,
}: {
  columnId: ColumnId
  title: string
  cardIds: string[]
  cards: Record<string, Card>
  onAddCard: (columnId: ColumnId, title: string) => void
}) {
  const [isAdding, setIsAdding] = useState(false)
  const { ref } = useDroppable({
    id: columnId,
    type: 'column',
    accept: 'item',
    collisionPriority: CollisionPriority.Low,
  })

  return (
    <div className="bg-gray-800 rounded-lg w-72 shrink-0 flex flex-col max-h-full">
      <h2 className="text-gray-100 font-semibold p-4 pb-0">{title}</h2>
      <div
        ref={ref}
        className="flex flex-col gap-2 overflow-y-auto flex-1 p-4"
      >
        {cardIds.map((cardId, index) => (
          <SortableCard
            key={cardId}
            card={cards[cardId]}
            columnId={columnId}
            index={index}
          />
        ))}
        {isAdding ? (
          <AddCardInput
            onAdd={(title) => {
              onAddCard(columnId, title)
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
  const [cards, setCards] = useState(sampleBoard.cards)
  const [columns] = useState(sampleBoard.columns)
  const [cardPositions, setCardPositions] = useState<CardPositions>(() => {
    const result: CardPositions = {}
    for (const col of sampleBoard.columns) {
      result[col.id] = col.cardIds
    }
    return result
  })

  const addCard = (columnId: ColumnId, title: string) => {
    const cardId = crypto.randomUUID()
    const newCard: Card = { id: cardId, title }

    setCards((prev) => ({ ...prev, [cardId]: newCard }))
    setCardPositions((prev) => ({
      ...prev,
      [columnId]: [...prev[columnId], cardId],
    }))
  }

  return (
    <DragDropProvider
      onDragOver={(event) => {
        setCardPositions((positions) => move(positions, event))
      }}
    >
      <div className="h-screen bg-gray-900 flex flex-col overflow-hidden select-none">
        <header className="p-8 pb-0">
          <h1 className="text-2xl font-bold text-gray-100 mb-6">Kanban Board</h1>
        </header>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 pt-0">
          <div className="flex gap-4 h-full">
            {columns.map((column) => (
              <ColumnView
                key={column.id}
                columnId={column.id}
                title={column.title}
                cardIds={cardPositions[column.id]}
                cards={cards}
                onAddCard={addCard}
              />
            ))}
          </div>
        </div>
      </div>
    </DragDropProvider>
  )
}

export default App
