import { useState, useRef, useEffect } from 'react'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { CollisionPriority } from '@dnd-kit/abstract'
import { type Card, type CardId, type Column, type ColumnId, getColumnCards, getSortedColumns } from './model'
import { useAppStore } from './store'

// Editable text input (used for both cards and columns)
function EditableInput({
  value,
  onSave,
  onCancel,
  className,
}: {
  value: string
  onSave: (value: string) => void
  onCancel: () => void
  className?: string
}) {
  const [text, setText] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSave = () => {
    const trimmed = text.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    } else {
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSave()
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={handleSave}
      className={className}
    />
  )
}

// Sortable card
function SortableCard({
  card,
  index,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  card: Card
  index: number
  isEditing: boolean
  onStartEdit: () => void
  onSaveEdit: (title: string) => void
  onCancelEdit: () => void
  onDelete: () => void
}) {
  const { ref, isDragging } = useSortable({
    id: card.id,
    index,
    type: 'card',
    accept: 'card',
    group: card.columnId,
  })

  return (
    <div
      ref={ref}
      className={`group relative bg-gray-700 rounded p-3 shadow text-gray-100 cursor-grab ${isDragging ? 'opacity-50' : ''}`}
      onDoubleClick={onStartEdit}
    >
      {isEditing ? (
        <EditableInput
          value={card.title}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          className="w-full bg-gray-600 text-gray-100 rounded px-1 -mx-1 outline-none"
        />
      ) : (
        <>
          {card.title}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-600 transition-opacity"
          >
            ×
          </button>
        </>
      )}
    </div>
  )
}

// Add card input
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
      onBlur={handleSubmit}
      placeholder="Card title..."
      className="w-full bg-gray-700 text-gray-100 rounded p-3 outline-none placeholder-gray-400"
    />
  )
}

// Column header (editable)
function ColumnHeader({
  column,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  column: Column
  isEditing: boolean
  onStartEdit: () => void
  onSaveEdit: (title: string) => void
  onCancelEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between p-4 pb-0">
      {isEditing ? (
        <EditableInput
          value={column.title}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          className="flex-1 bg-gray-700 text-gray-100 font-semibold rounded px-2 py-1 outline-none"
        />
      ) : (
        <h2
          className="text-gray-100 font-semibold cursor-pointer"
          onDoubleClick={onStartEdit}
        >
          {column.title}
        </h2>
      )}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700 transition-opacity ml-2"
      >
        ×
      </button>
    </div>
  )
}

// Sortable column
function SortableColumn({
  column,
  index,
  columnCards,
}: {
  column: Column
  index: number
  columnCards: Card[]
}) {
  const [isAdding, setIsAdding] = useState(false)
  const { editing, startEditing, stopEditing, updateCard, deleteCard, addCard } = useAppStore()
  const isColumnEditing = editing?.type === 'column' && editing.id === column.id

  const { ref } = useSortable({
    id: column.id,
    index,
    type: 'column',
    collisionPriority: CollisionPriority.Low,
    accept: ['card', 'column'],
  })

  return (
    <div ref={ref} className="group bg-gray-800 rounded-lg w-72 shrink-0 flex flex-col max-h-full">
      <ColumnHeader
        column={column}
        isEditing={isColumnEditing}
        onStartEdit={() => startEditing('column', column.id)}
        onSaveEdit={(title) => {
          useAppStore.getState().updateColumn(column.id, title)
          stopEditing()
        }}
        onCancelEdit={stopEditing}
        onDelete={() => useAppStore.getState().deleteColumn(column.id)}
      />
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 p-4 min-h-24">
        {columnCards.map((card, cardIndex) => {
          const isCardEditing = editing?.type === 'card' && editing.id === card.id
          return (
            <SortableCard
              key={card.id}
              card={card}
              index={cardIndex}
              isEditing={isCardEditing}
              onStartEdit={() => startEditing('card', card.id)}
              onSaveEdit={(title) => {
                updateCard(card.id, title)
                stopEditing()
              }}
              onCancelEdit={stopEditing}
              onDelete={() => deleteCard(card.id)}
            />
          )
        })}
        {isAdding ? (
          <AddCardInput
            onAdd={(title) => {
              addCard(column.id, title)
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

// Add column button
function AddColumnButton() {
  const [isAdding, setIsAdding] = useState(false)
  const { addColumn } = useAppStore()

  if (isAdding) {
    return (
      <div className="bg-gray-800 rounded-lg w-72 shrink-0 p-4">
        <EditableInput
          value=""
          onSave={(title) => {
            addColumn(title)
            setIsAdding(false)
          }}
          onCancel={() => setIsAdding(false)}
          className="w-full bg-gray-700 text-gray-100 rounded p-2 outline-none placeholder-gray-400"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="bg-gray-800/50 hover:bg-gray-800 rounded-lg w-72 shrink-0 p-4 text-gray-400 hover:text-gray-200 text-left transition-colors"
    >
      + Add column
    </button>
  )
}

// Error notification
function ErrorNotification() {
  const { error, clearError } = useAppStore()
  if (!error) return null

  return (
    <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-3 rounded shadow-lg flex items-center gap-3">
      <span>{error}</span>
      <button
        onClick={clearError}
        className="text-white hover:text-red-200"
      >
        ×
      </button>
    </div>
  )
}

// Main App
function App() {
  const { cards, columns, status, load, reset, moveCard, moveColumn } = useAppStore()

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

  const sortedColumns = getSortedColumns(columns)
  const columnOrder = sortedColumns.map(c => c.id)

  return (
    <>
      <ErrorNotification />
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
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 pt-4">
          <DragDropProvider
            onDragOver={(event) => {
              const { source } = event.operation
              if (source?.type === 'column') return

              // Card drag over - move card between columns
              if (source?.type === 'card') {
                const sourceCard = cards[source.id as CardId]
                if (!sourceCard) return

                const { target } = event.operation
                if (!target) return

                // Get target column
                let targetColumnId: ColumnId | null = null
                let targetIndex = 0

                if (target.type === 'column') {
                  targetColumnId = target.id as ColumnId
                  targetIndex = getColumnCards(cards, targetColumnId).length
                } else if (target.type === 'card') {
                  const targetCard = cards[target.id as CardId]
                  if (targetCard) {
                    targetColumnId = targetCard.columnId
                    const targetCards = getColumnCards(cards, targetColumnId)
                    targetIndex = targetCards.findIndex(c => c.id === target.id)
                  }
                }

                if (targetColumnId && sourceCard.columnId !== targetColumnId) {
                  moveCard(sourceCard.id, targetColumnId, targetIndex)
                }
              }
            }}
            onDragEnd={(event) => {
              if (event.canceled) return

              const { source, target } = event.operation
              if (!source || !target) return

              // Column reorder
              if (source.type === 'column' && target.type === 'column') {
                const overIndex = columnOrder.indexOf(target.id as ColumnId)
                if (overIndex !== -1) {
                  moveColumn(source.id as ColumnId, overIndex)
                }
                return
              }

              // Card reorder (within same column or final position)
              if (source.type === 'card') {
                const sourceCard = cards[source.id as CardId]
                if (!sourceCard) return

                let targetColumnId: ColumnId
                let targetIndex: number

                if (target.type === 'column') {
                  targetColumnId = target.id as ColumnId
                  targetIndex = getColumnCards(cards, targetColumnId).length
                } else if (target.type === 'card') {
                  const targetCard = cards[target.id as CardId]
                  if (!targetCard) return
                  targetColumnId = targetCard.columnId
                  const targetCards = getColumnCards(cards, targetColumnId)
                  targetIndex = targetCards.findIndex(c => c.id === target.id)
                } else {
                  return
                }

                moveCard(sourceCard.id, targetColumnId, targetIndex)
              }
            }}
          >
            <div className="flex gap-4 h-full">
              {sortedColumns.map((column, index) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  index={index}
                  columnCards={getColumnCards(cards, column.id)}
                />
              ))}
              <AddColumnButton />
            </div>
          </DragDropProvider>
        </div>
      </div>
    </>
  )
}

export default App
