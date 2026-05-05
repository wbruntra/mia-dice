import { createContext, useContext, useState } from 'react'

const GameUIContext = createContext(null)

export function GameUIProvider({ children }) {
  const [showClaimPicker, setShowClaimPicker] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [pendingValue, setPendingValue] = useState(null)

  return (
    <GameUIContext.Provider
      value={{
        showClaimPicker,
        setShowClaimPicker,
        pendingAction,
        setPendingAction,
        pendingValue,
        setPendingValue,
      }}
    >
      {children}
    </GameUIContext.Provider>
  )
}

export function useGameUI() {
  const ctx = useContext(GameUIContext)
  if (!ctx) throw new Error('useGameUI must be used within GameUIProvider')
  return ctx
}
