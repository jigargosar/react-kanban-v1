import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

// Card content (presentational)
function CardContent({
  card,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isDragging = false,
}: {
  card: Card
  isEditing?: boolean
  onStartEdit?: () => void
  onSaveEdit?: (title: string) => void
  onCancelEdit?: () => void
  onDelete?: () => void
  isDragging?: boolean
}) {
  return (
    <div
      className={`relative bg-gray-700 rounded p-3 shadow text-gray-100 cursor-grab ${isDragging ? 'opacity-50' : ''}`}
      onDoubleClick={onStartEdit}
    >
      {isEditing && onSaveEdit && onCancelEdit ? (
        <EditableInput
          value={card.title}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          className="w-full bg-gray-600 text-gray-100 rounded px-1 -mx-1 outline-none"
        />
      ) : (
        <>
          {card.title}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-600 transition-opacity"
            >
              ×
            </button>
          )}
        </>
      )}
    </div>
  )
}

// Sortable card wrapper
function SortableCard({
  card,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  card: Card
  isEditing: boolean
  onStartEdit: () => void
  onSaveEdit: (title: string) => void
  onCancelEdit: () => void
  onDelete: () => void
}) {
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group">
      <CardContent
        card={card}
        isEditing={isEditing}
        onStartEdit={onStartEdit}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onDelete={onDelete}
        isDragging={isDragging}
      />
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

// Column view
function ColumnView({
  column,
  columnCards,
}: {
  column: Column
  columnCards: Card[]
}) {
  const [isAdding, setIsAdding] = useState(false)
  const { editing, startEditing, stopEditing, updateCard, deleteCard, addCard } = useAppStore()
  const isColumnEditing = editing?.type === 'column' && editing.id === column.id
  const { setNodeRef } = useDroppable({ id: `column:${column.id}` })

  return (
    <div className="group bg-gray-800 rounded-lg w-72 shrink-0 flex flex-col max-h-full">
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
      <div ref={setNodeRef} className="flex flex-col gap-2 overflow-y-auto flex-1 p-4 min-h-24">
        <SortableContext items={columnCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {columnCards.map((card) => {
            const isCardEditing = editing?.type === 'card' && editing.id === card.id
            return (
              <SortableCard
                key={card.id}
                card={card}
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
        </SortableContext>
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
  const { cards, columns, status, load, reset, moveCard } = useAppStore()
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  useEffect(() => {
    load()
  }, [load])

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as CardId
    const card = cards[cardId]
    if (card) setActiveCard(card)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeCardId = active.id as CardId
    const activeCard = cards[activeCardId]
    if (!activeCard) return

    const overId = over.id as string

    // Determine target column
    let targetColumnId: ColumnId
    let targetIndex: number

    if (overId.startsWith('column:')) {
      targetColumnId = overId.replace('column:', '') as ColumnId
      targetIndex = getColumnCards(cards, targetColumnId).length
    } else {
      const overCard = cards[overId as CardId]
      if (!overCard) return
      targetColumnId = overCard.columnId
      const targetCards = getColumnCards(cards, targetColumnId)
      targetIndex = targetCards.findIndex(c => c.id === overId)
    }

    // Only move if changing columns
    if (activeCard.columnId !== targetColumnId) {
      moveCard(activeCardId, targetColumnId, targetIndex)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeCardId = active.id as CardId
    const activeCard = cards[activeCardId]
    if (!activeCard) return

    const overId = over.id as string

    // Dropped on column itself (empty area)
    if (overId.startsWith('column:')) {
      const targetColumnId = overId.replace('column:', '') as ColumnId
      const targetCards = getColumnCards(cards, targetColumnId)
      moveCard(activeCardId, targetColumnId, targetCards.length)
      return
    }

    // Dropped on another card
    const overCard = cards[overId as CardId]
    if (!overCard) return

    const targetColumnId = overCard.columnId
    const allTargetCards = getColumnCards(cards, targetColumnId)
    const overIndex = allTargetCards.findIndex(c => c.id === overId)

    moveCard(activeCardId, targetColumnId, overIndex)
  }

  if (status === 'loading') {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  const sortedColumns = getSortedColumns(columns)

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full">
              {sortedColumns.map((column) => (
                <ColumnView
                  key={column.id}
                  column={column}
                  columnCards={getColumnCards(cards, column.id)}
                />
              ))}
              <AddColumnButton />
            </div>
            <DragOverlay>
              {activeCard && (
                <div className="bg-gray-700 rounded p-3 shadow-lg text-gray-100 cursor-grabbing w-64">
                  {activeCard.title}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </>
  )
}

export default App
