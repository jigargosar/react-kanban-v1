/* eslint-disable react-refresh/only-export-components */
import { type ReactNode } from 'react'
import { type CollisionPriority } from '@dnd-kit/abstract'

export type MoveInfo = {
  itemId: string
  draggableTypeId: string
  toGroupId: string
  beforeId: string | null
  afterId: string | null
}

type RootConfig = {
  onDragOver: (info: MoveInfo) => void
  onDragEnd: (info: MoveInfo) => void
}

type RootProps = {
  config: RootConfig
  children: ReactNode
}

function Root({ children }: RootProps) {
  return <>{children}</>
}

type ListConfig<T> = {
  items: T[]
  getId: (item: T) => string
  getGroupId: (item: T) => string
  groupId: string
  compare: (a: T, b: T) => number
  draggableTypeId: string
  acceptsDraggableTypes: string[]
  collisionPriority: CollisionPriority
}

type ListProps<T> = {
  config: ListConfig<T>
  children: (props: { ref: (element: HTMLElement | null) => void; item: T; isDragging: boolean }) => ReactNode
}

function List<T>({ config, children }: ListProps<T>) {
  const { items, getId, getGroupId, groupId, compare } = config

  const filteredItems = items.filter((item) => getGroupId(item) === groupId).sort(compare)

  return (
    <>
      {filteredItems.map((item) => (
        <ListItem key={getId(item)} item={item}>
          {children}
        </ListItem>
      ))}
    </>
  )
}

type ListItemProps<T> = {
  item: T
  children: (props: { ref: (element: HTMLElement | null) => void; item: T; isDragging: boolean }) => ReactNode
}

function ListItem<T>({ item, children }: ListItemProps<T>) {
  const ref = () => {}
  return <>{children({ ref, item, isDragging: false })}</>
}

export const DndList = {
  Root,
  List,
}
