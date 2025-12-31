import { useState, useRef, useEffect } from 'react'
import { sampleBoard, type Board, type Card, type Column, type ColumnId } from './model'

function CardView({ card }: { card: Card }) {
  return (
    <div className="bg-gray-700 rounded p-3 shadow text-gray-100">
      {card.title}
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
      onBlur={handleSubmit}
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

  return (
    <div className="bg-gray-800 rounded-lg w-72 flex-shrink-0 flex flex-col max-h-full">
      <h2 className="text-gray-100 font-semibold p-4 pb-0">{column.title}</h2>
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 p-4">
        {cards.map((card) => (
          <CardView key={card.id} card={card} />
        ))}
        {isAdding ? (
          <AddCardInput
            onAdd={(title) => {
              onAddCard(column.id, title)
              setIsAdding(false)
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

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
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
  )
}

export default App
