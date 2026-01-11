import { useState, useRef, useEffect } from 'react'
import { type Card, type Column, getSortedBoards } from './model'
import { useAppStore } from './store'
import { Dnd, type MoveInfo } from './dnd'

function assertNever(value: never, msg?: string): never {
  throw new Error(msg ?? `Unexpected value: ${String(value)}`)
}

// Board selector dropdown
function BoardSelector() {
  const [isAdding, setIsAdding] = useState(false)
  const { boards, activeBoardId, setActiveBoard, addBoard, updateBoard, deleteBoard, editing, startEditing, stopEditing } = useAppStore()
  const sortedBoards = getSortedBoards(boards)
  const activeBoard = activeBoardId != null ? boards[activeBoardId] : null
  const isEditingBoard = editing?.type === 'board' && editing.id === activeBoardId

  if (isAdding) {
    return (
      <EditableInput
        value=""
        onSave={(title) => {
          addBoard(title)
          setIsAdding(false)
        }}
        onCancel={() => { setIsAdding(false); }}
        className="bg-gray-700 text-gray-100 rounded px-3 py-1 outline-none w-48"
      />
    )
  }

  if (isEditingBoard && activeBoard != null) {
    return (
      <EditableInput
        value={activeBoard.title}
        onSave={(title) => {
          updateBoard(activeBoardId, title)
          stopEditing()
        }}
        onCancel={stopEditing}
        className="bg-gray-700 text-gray-100 rounded px-3 py-1 outline-none w-48"
      />
    )
  }

  return (
    <div className="flex items-center gap-2">
      {activeBoardId != null ? (
        <>
          <select
            value={activeBoardId}
            onChange={(e) => { setActiveBoard(e.target.value); }}
            className="bg-gray-700 text-gray-100 rounded px-3 py-1 outline-none cursor-pointer"
          >
            {sortedBoards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => { startEditing('board', activeBoardId); }}
            className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700"
            title="Edit board"
          >
            ✎
          </button>
          <button
            onClick={() => { deleteBoard(activeBoardId); }}
            className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700"
            title="Delete board"
          >
            ×
          </button>
        </>
      ) : null}
      <button
        onClick={() => { setIsAdding(true); }}
        className="text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-700"
        data-testid="add-board-button"
      >
        + New Board
      </button>
    </div>
  )
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
      onChange={(e) => { setText(e.target.value); }}
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
      onChange={(e) => { setTitle(e.target.value); }}
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
  searchTerm,
}: {
  column: Column
  searchTerm: string
}) {
  const [isAdding, setIsAdding] = useState(false)
  const { cards, editing, startEditing, stopEditing, updateCard, deleteCard, addCard } = useAppStore()

  // Filter cards by search term
  const columnCards = Object.entries(cards).filter(([, card]) => card.columnId === column.id)
  const filteredCards = Object.fromEntries(
    columnCards.filter(([, card]) =>
      card.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )
  const hasCardsButNoMatch = searchTerm.length > 0 && columnCards.length > 0 && Object.keys(filteredCards).length === 0

  return (
    <div className="flex flex-col gap-2 overflow-y-auto flex-1 p-4 min-h-24">
      {hasCardsButNoMatch && (
        <div className="text-gray-500 text-sm p-2">No cards match</div>
      )}
      <Dnd.List
        items={filteredCards}
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
              onStartEdit={() => { startEditing('card', card.id); }}
              onSaveEdit={(title) => {
                updateCard(card.id, title)
                stopEditing()
              }}
              onCancelEdit={stopEditing}
              onDelete={() => { deleteCard(card.id); }}
            />
          )
        }}
      </Dnd.List>
      {isAdding ? (
        <AddCardInput
          onAdd={(title) => {
            addCard(column.id, title)
          }}
          onCancel={() => { setIsAdding(false); }}
        />
      ) : (
        <button
          onClick={() => { setIsAdding(true); }}
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
          onCancel={() => { setIsAdding(false); }}
          className="w-full bg-gray-700 text-gray-100 rounded p-2 outline-none placeholder-gray-400"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => { setIsAdding(true); }}
      className="bg-gray-800/50 hover:bg-gray-800 rounded-lg w-72 shrink-0 p-4 text-gray-400 hover:text-gray-200 text-left transition-colors"
    >
      + Add column
    </button>
  )
}

// Error notification
function ErrorNotification() {
  const { error, clearError } = useAppStore()
  if (error == null) return null

  return (
    <div data-testid="error-notification" className="fixed top-4 right-4 bg-red-600 text-white px-4 py-3 rounded shadow-lg flex items-center gap-3">
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

// Auth component
function AuthButton() {
  const { user, authLoading, signIn, signOut } = useAppStore()

  if (authLoading) return null

  if (user != null) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">{user.name}</span>
        <button
          onClick={signOut}
          className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-700"
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={signIn}
      className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-700"
    >
      Login with GitHub
    </button>
  )
}

// Search input
function SearchInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder="Search cards..."
        className="bg-gray-700 text-gray-100 rounded px-3 py-1 pl-8 outline-none placeholder-gray-400 w-48"
      />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      {value.length > 0 && (
        <button
          onClick={() => { onChange(''); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
        >
          ×
        </button>
      )}
    </div>
  )
}

// Main App
function App() {
  const { cards, columns, activeBoardId, status, reset, moveCard, moveColumn, editing, startEditing, stopEditing, initAuth } = useAppStore()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    return initAuth()
  }, [initAuth])

  const handleMove = (info: MoveInfo, persist: boolean) => {
    switch (info.type) {
      case 'card':
        moveCard({
          cardId: info.itemId,
          toColumnId: info.toGroupId,
          beforeId: info.beforeId,
          afterId: info.afterId,
          persist,
        })
        break
      case 'column':
        moveColumn({
          columnId: info.itemId,
          beforeId: info.beforeId,
          afterId: info.afterId,
          persist,
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

  // Filter columns for active board
  const boardColumns = activeBoardId != null
    ? Object.fromEntries(Object.entries(columns).filter(([, col]) => col.boardId === activeBoardId))
    : {}

  return (
    <>
      <ErrorNotification />
      <div className="h-screen bg-gray-900 flex flex-col overflow-hidden select-none">
        <header className="p-8 pb-0 flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-100">Kanban</h1>
          <BoardSelector />
          {activeBoardId != null && editing == null && <SearchInput value={searchTerm} onChange={setSearchTerm} />}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={reset}
              className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-700"
            >
              Reset
            </button>
            <AuthButton />
          </div>
        </header>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 pt-4">
          {activeBoardId == null ? (
            <div className="text-gray-400 text-center mt-8">
              Create your first board to get started
            </div>
          ) : (
            <Dnd.Root onDragOver={(info) => { handleMove(info, false); }} onDragEnd={(info) => { handleMove(info, true); }}>
              <div className="flex gap-4 h-full">
                <Dnd.ColumnList
                  columns={boardColumns}
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
                          onStartEdit={() => { startEditing('column', column.id); }}
                          onSaveEdit={(title) => {
                            useAppStore.getState().updateColumn(column.id, title)
                            stopEditing()
                          }}
                          onCancelEdit={stopEditing}
                          onDelete={() => { useAppStore.getState().deleteColumn(column.id); }}
                        />
                        <ColumnContent column={column} searchTerm={searchTerm} />
                      </div>
                    )
                  }}
                </Dnd.ColumnList>
                <AddColumnButton />
              </div>
            </Dnd.Root>
          )}
        </div>
      </div>
    </>
  )
}

export default App
