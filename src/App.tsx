import { useState, useRef, useEffect } from 'react'
import { type Card, type Column } from './model'
import { useAppStore } from './store'
import { Dnd, type MoveInfo } from './dnd'

function assertNever(value: never, msg?: string): never {
  throw new Error(msg ?? `Unexpected value: ${value}`)
}

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

// Card component (receives ref from Dnd.List)
function CardItem({
  cardRef,
  card,
  isDragging,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  cardRef: (element: HTMLElement | null) => void
  card: Card
  isDragging: boolean
  isEditing: boolean
  onStartEdit: () => void
  onSaveEdit: (title: string) => void
  onCancelEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      ref={cardRef}
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

// Column content (cards list)
function ColumnContent({
  column,
}: {
  column: Column
}) {
  const [isAdding, setIsAdding] = useState(false)
  const { cards, editing, startEditing, stopEditing, updateCard, deleteCard, addCard } = useAppStore()

  return (
    <div className="flex flex-col gap-2 overflow-y-auto flex-1 p-4 min-h-24">
      <Dnd.List
        items={cards}
        getId={(c) => c.id}
        group={column.id}
        getGroupId={(c) => c.columnId}
        compare={(a, b) => (a.position < b.position ? -1 : 1)}
        type="card"
        accept="card"
      >
        {({ ref, item: card, isDragging }) => {
          const isCardEditing = editing?.type === 'card' && editing.id === card.id
          return (
            <CardItem
              key={card.id}
              cardRef={ref}
              card={card}
              isDragging={isDragging}
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
        }}
      </Dnd.List>
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
  const { cards, columns, status, load, reset, moveCard, moveColumn, editing, startEditing, stopEditing } = useAppStore()

  useEffect(() => {
    load()
  }, [load])

  const handleMove = (info: MoveInfo) => {
    switch (info.type) {
      case 'card':
        moveCard({
          cardId: info.itemId,
          toColumnId: info.toGroupId,
          beforeId: info.beforeId,
          afterId: info.afterId,
        })
        break
      case 'column':
        moveColumn({
          columnId: info.itemId,
          beforeId: info.beforeId,
          afterId: info.afterId,
        })
        break
      default:
        assertNever(info.type as never)
    }
  }

  if (status === 'loading') {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

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
          <Dnd.Root onDragOver={handleMove} onDragEnd={handleMove}>
            <div className="flex gap-4 h-full">
              <Dnd.ColumnList
                columns={columns}
                cards={cards}
                getColumnId={(c) => c.id}
                getCardId={(c) => c.id}
                getCardColumnId={(c) => c.columnId}
                compareColumns={(a, b) => (a.position < b.position ? -1 : 1)}
                compareCards={(a, b) => (a.position < b.position ? -1 : 1)}
              >
                {({ ref, column, isDragging }) => {
                  const isColumnEditing = editing?.type === 'column' && editing.id === column.id
                  return (
                    <div
                      ref={ref}
                      className={`group bg-gray-800 rounded-lg w-72 shrink-0 flex flex-col max-h-full ${isDragging ? 'opacity-50' : ''}`}
                    >
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
                      <ColumnContent column={column} />
                    </div>
                  )
                }}
              </Dnd.ColumnList>
              <AddColumnButton />
            </div>
          </Dnd.Root>
        </div>
      </div>
    </>
  )
}

export default App
