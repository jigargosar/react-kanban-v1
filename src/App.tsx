import { useState, useRef, useEffect } from 'react'
import { DragDropProvider, useDroppable } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { CollisionPriority } from '@dnd-kit/abstract'
import { sampleBoard, type Card, type ColumnId, getColumnCards, positionBetween } from './model'

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
  columnCards,
  onAddCard,
}: {
  columnId: ColumnId
  title: string
  columnCards: Card[]
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
        {columnCards.map((card, index) => (
          <SortableCard
            key={card.id}
            card={card}
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

  const addCard = (columnId: ColumnId, title: string) => {
    const cardId = crypto.randomUUID()
    const columnCards = getColumnCards(cards, columnId)
    const lastPosition = columnCards.length > 0 ? columnCards[columnCards.length - 1].position : null
    const newCard: Card = {
      id: cardId,
      title,
      columnId,
      position: positionBetween(lastPosition, null),
    }
    setCards((prev) => ({ ...prev, [cardId]: newCard }))
  }

  const moveCard = (cardId: string, toColumnId: ColumnId, newIndex: number) => {
    setCards((prev) => {
      const columnCards = getColumnCards(prev, toColumnId).filter(c => c.id !== cardId)
      const beforeCard = columnCards[newIndex - 1] ?? null
      const afterCard = columnCards[newIndex] ?? null
      const newPosition = positionBetween(
        beforeCard?.position ?? null,
        afterCard?.position ?? null
      )

      console.log('moveCard', { cardId, toColumnId, newIndex, newPosition })

      return {
        ...prev,
        [cardId]: { ...prev[cardId], columnId: toColumnId, position: newPosition },
      }
    })
  }

  return (
    <DragDropProvider
      onDragOver={(event) => {
        const { source, target } = event.operation
        if (!source || !target || event.operation.canceled) return

        const cardId = source.id as string
        const card = cards[cardId]
        if (!card) return

        // Determine target column and index
        const isDropOnColumn = columns.some(c => c.id === target.id)
        let toColumnId: ColumnId
        let newIndex: number

        if (isDropOnColumn) {
          // Dropped on empty column area
          toColumnId = target.id as ColumnId
          newIndex = getColumnCards(cards, toColumnId).length
        } else {
          // Dropped on another card - get that card's column and position
          const targetCard = cards[target.id as string]
          if (!targetCard) return
          toColumnId = targetCard.columnId
          const targetColumnCards = getColumnCards(cards, toColumnId)
          const targetIdx = targetColumnCards.findIndex(c => c.id === targetCard.id)
          // Insert at target's position (target will shift down)
          newIndex = targetIdx >= 0 ? targetIdx : targetColumnCards.length
        }

        // Only update if position actually changed
        const currentColumnCards = getColumnCards(cards, card.columnId)
        const currentIdx = currentColumnCards.findIndex(c => c.id === cardId)
        if (card.columnId === toColumnId && currentIdx === newIndex) return

        moveCard(cardId, toColumnId, newIndex)
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
                columnCards={getColumnCards(cards, column.id)}
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
