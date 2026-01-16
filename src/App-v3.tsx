import { useState, useRef, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import {
  useStore,
  rootStore,
  InitializingState,
  UnauthenticatedState,
  LoadingState,
  ReadyState,
  type AppData,
  type Column,
  type Card,
  type AppState,
} from './store-v3'
import { DndList, type MoveInfo } from '@external-lib/DndList'
import { CollisionPriority } from '@dnd-kit/abstract'

function assertNever(value: never, msg?: string): never {
  throw new Error(msg ?? `Unexpected value: ${String(value)}`)
}

// Editable text input
function EditableInput({
  value,
  onSave,
  onCancel,
  className,
  testId,
}: {
  value: string
  onSave: (value: string) => void
  onCancel: () => void
  className?: string
  testId?: string
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
      data-testid={testId}
    />
  )
}

// Board selector dropdown
const BoardSelector = observer(({ data, userId }: { data: AppData; userId: string }) => {
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const sortedBoards = data.sortedBoards
  const activeBoard = data.activeBoard

  if (isAdding) {
    return (
      <EditableInput
        value=""
        onSave={(title) => {
          data.addBoard(userId, title)
          setIsAdding(false)
        }}
        onCancel={() => { setIsAdding(false); }}
        className="bg-gray-700 text-gray-100 rounded px-3 py-1 outline-none w-48"
      />
    )
  }

  if (isEditing && activeBoard != null) {
    return (
      <EditableInput
        value={activeBoard.title}
        onSave={(title) => {
          data.updateBoard(activeBoard.id, title)
          setIsEditing(false)
        }}
        onCancel={() => { setIsEditing(false); }}
        className="bg-gray-700 text-gray-100 rounded px-3 py-1 outline-none w-48"
        testId="edit-board-input"
      />
    )
  }

  return (
    <div className="flex items-center gap-2">
      {activeBoard != null ? (
        <>
          <select
            value={activeBoard.id}
            onChange={(e) => { data.setActiveBoard(e.target.value); }}
            className="bg-gray-700 text-gray-100 rounded px-3 py-1 outline-none cursor-pointer"
          >
            {sortedBoards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => { setIsEditing(true); }}
            className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700"
            title="Edit board"
          >
            ✎
          </button>
          <button
            onClick={() => { data.deleteBoard(activeBoard.id); }}
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
})

// Card component
const CardItem = observer(({
  cardRef,
  card,
  isDragging,
  data,
}: {
  cardRef: (element: HTMLElement | null) => void
  card: Card
  isDragging: boolean
  data: AppData
}) => {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div
      ref={cardRef}
      className={`group relative bg-gray-700 rounded p-3 shadow text-gray-100 cursor-grab ${isDragging ? 'opacity-50' : ''}`}
      onDoubleClick={() => { setIsEditing(true); }}
    >
      {isEditing ? (
        <EditableInput
          value={card.title}
          onSave={(title) => {
            data.updateCard(card.id, title)
            setIsEditing(false)
          }}
          onCancel={() => { setIsEditing(false); }}
          className="w-full bg-gray-600 text-gray-100 rounded px-1 -mx-1 outline-none"
          testId="edit-card-input"
        />
      ) : (
        <>
          {card.title}
          <button
            onClick={(e) => {
              e.stopPropagation()
              data.deleteCard(card.id)
            }}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-600 transition-opacity"
          >
            ×
          </button>
        </>
      )}
    </div>
  )
})

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

// Column header
const ColumnHeader = observer(({
  column,
  onDelete,
  data,
}: {
  column: Column
  onDelete: () => void
  data: AppData
}) => {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="flex items-center justify-between p-4 pb-0">
      {isEditing ? (
        <EditableInput
          value={column.title}
          onSave={(title) => {
            data.updateColumn(column.id, title)
            setIsEditing(false)
          }}
          onCancel={() => { setIsEditing(false); }}
          className="flex-1 bg-gray-700 text-gray-100 font-semibold rounded px-2 py-1 outline-none"
          testId="edit-column-input"
        />
      ) : (
        <h2
          className="text-gray-100 font-semibold cursor-pointer"
          onDoubleClick={() => { setIsEditing(true); }}
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
})

// Column content (cards list)
const ColumnContent = observer(({
  column,
  data,
  searchTerm,
}: {
  column: Column
  data: AppData
  searchTerm: string
}) => {
  const [isAdding, setIsAdding] = useState(false)

  // Get cards for this column
  const columnCards = data.getCardsForColumn(column.id)
  const filteredCards = columnCards.filter((card) =>
    card.title.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const hasCardsButNoMatch = searchTerm.length > 0 && columnCards.length > 0 && filteredCards.length === 0

  return (
    <DndList.List
      config={{
        items: filteredCards,
        getId: (c) => c.id,
        getGroupId: (c) => c.columnId,
        groupId: column.id,
        compare: (a, b) => (a.position < b.position ? -1 : 1),
        draggableTypeId: 'card',
        acceptsDraggableTypes: ['card'],
        collisionPriority: CollisionPriority.High,
      }}
    >
      {({ containerRef, isDropTarget, renderItems }) => (
        <div
          ref={containerRef}
          className={`flex flex-col gap-2 overflow-y-auto flex-1 p-4 min-h-24 ${isDropTarget ? 'bg-gray-700/30' : ''}`}
        >
          {hasCardsButNoMatch && (
            <div className="text-gray-500 text-sm p-2">No cards match</div>
          )}
          {renderItems(({ ref, item: card, isDragging }) => (
            <CardItem
              key={card.id}
              cardRef={ref}
              card={card}
              isDragging={isDragging}
              data={data}
            />
          ))}
          {isAdding ? (
            <AddCardInput
              onAdd={(title) => {
                data.addCard(column.id, title)
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
      )}
    </DndList.List>
  )
})

// Add column button
const AddColumnButton = observer(({ data }: { data: AppData }) => {
  const [isAdding, setIsAdding] = useState(false)

  if (isAdding) {
    return (
      <div className="bg-gray-800 rounded-lg w-72 shrink-0 p-4">
        <EditableInput
          value=""
          onSave={(title) => {
            data.addColumn(title)
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
})

// Error notification
const MutationErrorNotification = observer(({ data }: { data: AppData }) => {
  if (data.mutationError == null) return null

  return (
    <div data-testid="error-notification" className="fixed top-4 right-4 bg-red-600 text-white px-4 py-3 rounded shadow-lg flex items-center gap-3">
      <span>{data.mutationError}</span>
      <button
        onClick={() => { data.clearMutationError(); }}
        className="text-white hover:text-red-200"
      >
        ×
      </button>
    </div>
  )
})

// Auth button
const AuthButton = observer(({ state }: { state: AppState }) => {
  if (state instanceof InitializingState || state instanceof LoadingState) {
    return null
  }

  if (state instanceof ReadyState) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">{state.userName}</span>
        <button
          onClick={() => { state.signOut(); }}
          className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-700"
        >
          Logout
        </button>
      </div>
    )
  }

  if (state instanceof UnauthenticatedState) {
    return (
      <button
        onClick={() => { state.signIn(); }}
        className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-700"
      >
        Login with GitHub
      </button>
    )
  }

  return null
})

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

// Ready view - main kanban board
const ReadyView = observer(({ state }: { state: ReadyState }) => {
  const { userId, data } = state
  const [searchTerm, setSearchTerm] = useState('')

  const handleMove = (info: MoveInfo, persist: boolean) => {
    switch (info.draggableTypeId) {
      case 'card':
        data.moveCard(info.itemId, info.toGroupId, info.beforeId, info.afterId, persist)
        break
      case 'column':
        data.moveColumn(info.itemId, info.beforeId, info.afterId, persist)
        break
      default:
        assertNever(info.draggableTypeId as never)
    }
  }

  // Get columns for active board
  const boardColumns = data.activeBoardId != null
    ? data.getColumnsForBoard(data.activeBoardId)
    : []

  return (
    <>
      <MutationErrorNotification data={data} />
      <div className="h-screen bg-gray-900 flex flex-col overflow-hidden select-none">
        <header className="p-8 pb-0 flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-100">Kanban</h1>
          <BoardSelector data={data} userId={userId} />
          {data.activeBoardId != null && <SearchInput value={searchTerm} onChange={setSearchTerm} />}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { data.reset(); }}
              className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-700"
            >
              Reset
            </button>
            <AuthButton state={state} />
          </div>
        </header>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 pt-4">
          {data.activeBoardId == null ? (
            <div className="text-gray-400 text-center mt-8">
              Create your first board to get started
            </div>
          ) : (
            <DndList.Root config={{ onDragOver: (info) => { handleMove(info, false); }, onDragEnd: (info) => { handleMove(info, true); } }}>
              <div className="flex gap-4 h-full">
                {boardColumns.map((column, index) => {
                  const prevColumn = boardColumns[index - 1]
                  return (
                    <DndList.Group
                      key={column.id}
                      config={{
                        id: column.id,
                        index,
                        draggableTypeId: 'column',
                        acceptsDraggableTypes: ['column'],
                        groupId: 'board',
                        prevId: prevColumn?.id ?? null,
                        acceptsChildTypes: ['card'],
                        collisionPriority: CollisionPriority.Low,
                      }}
                    >
                      {({ ref, isDragging, isDropTarget }) => (
                        <div
                          ref={ref}
                          className={`group bg-gray-800 rounded-lg w-72 shrink-0 flex flex-col max-h-full ${isDragging ? 'opacity-50' : ''} ${isDropTarget ? 'ring-2 ring-blue-500' : ''}`}
                        >
                          <ColumnHeader
                            column={column}
                            onDelete={() => { data.deleteColumn(column.id); }}
                            data={data}
                          />
                          <ColumnContent column={column} data={data} searchTerm={searchTerm} />
                        </div>
                      )}
                    </DndList.Group>
                  )
                })}
                <AddColumnButton data={data} />
              </div>
            </DndList.Root>
          )}
        </div>
      </div>
    </>
  )
})

// Main App with instanceof state machine
const AppV3 = observer(() => {
  const root = useStore()
  const { state } = root

  useEffect(() => {
    return rootStore.initAuth()
  }, [])

  if (state instanceof InitializingState) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col overflow-hidden select-none">
        <header className="p-8 pb-0 flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-100">Kanban</h1>
        </header>
      </div>
    )
  }

  if (state instanceof UnauthenticatedState) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-gray-100">Kanban</h1>
        <AuthButton state={state} />
      </div>
    )
  }

  if (state instanceof LoadingState) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (state instanceof ReadyState) {
    return <ReadyView state={state} />
  }

  // TypeScript should infer never here, but assertNever ensures exhaustiveness
  assertNever(state)
})

export default AppV3
