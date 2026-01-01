import { useReducer, useCallback, useRef, useEffect } from 'react'

export type Effect<Msg> = () => Promise<Msg | void> | Msg | void

export type UpdateResult<State, Msg> = [State] | [State, Effect<Msg>]

type Dispatch<Msg> = (msg: Msg) => void

type ReducerState<State, Msg> = {
  appState: State
  effect: Effect<Msg> | null
}

type ReducerAction<State, Msg> =
  | { type: 'dispatch'; msg: Msg; update: (state: State, msg: Msg) => UpdateResult<State, Msg> }
  | { type: 'clearEffect' }

function reducer<State, Msg>(
  state: ReducerState<State, Msg>,
  action: ReducerAction<State, Msg>
): ReducerState<State, Msg> {
  switch (action.type) {
    case 'dispatch': {
      const result = action.update(state.appState, action.msg)
      return {
        appState: result[0],
        effect: result[1] ?? null,
      }
    }
    case 'clearEffect':
      return { ...state, effect: null }
  }
}

export function useElmish<State, Msg>(
  init: () => UpdateResult<State, Msg>,
  update: (state: State, msg: Msg) => UpdateResult<State, Msg>
): [State, Dispatch<Msg>] {
  const [state, rawDispatch] = useReducer(
    reducer<State, Msg>,
    null,
    () => {
      const result = init()
      return { appState: result[0], effect: result[1] ?? null }
    }
  )

  const updateRef = useRef(update)
  useEffect(() => {
    updateRef.current = update
  })

  const dispatch = useCallback((msg: Msg) => {
    rawDispatch({ type: 'dispatch', msg, update: updateRef.current })
  }, [])

  // Process effects
  useEffect(() => {
    if (!state.effect) return

    const runEffect = async () => {
      const result = await state.effect!()
      rawDispatch({ type: 'clearEffect' })
      if (result !== undefined && result !== null) {
        rawDispatch({ type: 'dispatch', msg: result as Msg, update: updateRef.current })
      }
    }

    runEffect()
  }, [state.effect])

  return [state.appState, dispatch]
}
