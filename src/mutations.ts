import { useMutation } from '@tanstack/react-query'
import { useAppStore } from './store'
import * as api from './api'
import { createBoard, getSortedBoards } from './model'

const BOARD_KEY = ['boards']

export function useResetMutation() {
  return useMutation({
    mutationKey: BOARD_KEY,
    scope: { id: 'boards' },
    mutationFn: async () => {
      console.log('[RESET] Starting reset, calling API...')
      await api.resetAll()
      console.log('[RESET] API complete')
    },
    onSuccess: () => {
      const boards = useAppStore.getState().boards
      console.log('[RESET] onSuccess, clearing state. Current boards:', Object.keys(boards))
      useAppStore.setState({ boards: {}, activeBoardId: null, cards: {}, columns: {} })
      console.log('[RESET] State cleared')
    },
  })
}

export function useAddBoardMutation() {
  return useMutation({
    mutationKey: BOARD_KEY,
    scope: { id: 'boards' },
    mutationFn: async (title: string) => {
      const { user, authLoading, boards } = useAppStore.getState()
      if (authLoading || !user) {
        throw new Error('Must be logged in to create a board')
      }
      const sortedBoards = getSortedBoards(boards)
      const lastPosition = sortedBoards.length > 0 ? sortedBoards[sortedBoards.length - 1].position : null
      const newBoard = createBoard(user.id, title, lastPosition)

      console.log('[ADD_BOARD] Adding board:', newBoard.id, 'title:', title)

      // Optimistic update
      useAppStore.setState({
        boards: { ...boards, [newBoard.id]: newBoard },
        activeBoardId: newBoard.id,
      })

      // Persist
      await api.persistBoard(newBoard)
      await api.persistActiveBoardId(newBoard.id)

      return newBoard
    },
    onError: (error) => {
      useAppStore.setState({ error: error.message })
    },
  })
}
