import { useState, useRef, useEffect } from 'react'
import * as Dnd from './Dnd'
import { type Card, type ColumnId, getColumnCards, sampleBoard } from './model'
import { useAppStore } from './store'

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
  return (
    <Dnd.Sortable id={card.id} group={columnId} index={index}>
      {({ ref, isDragging }) => (
        <div ref={ref}>
          <CardView card={card} isDragging={isDragging} />
        </div>
      )}
    </Dnd.Sortable>
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

  return (
    <div className="bg-gray-800 rounded-lg w-72 shrink-0 flex flex-col max-h-full">
      <h2 className="text-gray-100 font-semibold p-4 pb-0">{title}</h2>
      <Dnd.Droppable id={columnId}>
        {({ ref }) => (
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
        )}
      </Dnd.Droppable>
    </div>
  )
}

function App() {
  const { cards, status, load, addCard, moveCard, persistCard, reset } = useAppStore()
  const columns = sampleBoard.columns

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">Error loading board</div>
      </div>
    )
  }

  const columnIds = columns.map(c => c.id)
  const cardList = Object.values(cards)

  return (
    <Dnd.Provider
      groups={columnIds}
      items={cardList}
      getId={(card) => card.id}
      getGroupId={(card) => card.columnId}
      onMove={moveCard}
      onMoveEnd={(info) => persistCard(info.itemId)}
    >
      <div className="h-screen bg-gray-900 flex flex-col overflow-hidden select-none">
        <header className="p-8 pb-0 flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-100">Kanban Board</h1>
          <button
            onClick={reset}
            className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-700"
          >
            Reset
          </button>
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
    </Dnd.Provider>
  )
}

export default App
