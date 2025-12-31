import { sampleBoard, type Card, type Column } from './model'

function CardView({ card }: { card: Card }) {
  return (
    <div className="bg-gray-700 rounded p-3 shadow text-gray-100">
      {card.title}
    </div>
  )
}

function ColumnView({ column, cards }: { column: Column; cards: Card[] }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 w-72 flex-shrink-0">
      <h2 className="text-gray-100 font-semibold mb-4">{column.title}</h2>
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <CardView key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}

function App() {
  const { cards, columns } = sampleBoard

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Kanban Board</h1>
      <div className="flex gap-4 overflow-x-auto">
        {columns.map((column) => (
          <ColumnView
            key={column.id}
            column={column}
            cards={column.cardIds.map((id) => cards[id])}
          />
        ))}
      </div>
    </div>
  )
}

export default App
