// src/components/contexts/TurnContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react'; // Removed useCallback, useMemo
import { CombatTrackerToken } from '../../types'; // Assuming types.ts is in the parent directory

interface TurnContextProps {
  combatantsInTurnOrder: CombatTrackerToken[];
  currentTurnIndex: number | null; // Pode ser null se não houver combatentes ou o turno não tiver iniciado
  setCombatantsInTurnOrder: React.Dispatch<React.SetStateAction<CombatTrackerToken[]>>;
  setCurrentTurnIndex: React.Dispatch<React.SetStateAction<number | null>>; // Added setCurrentTurnIndex back
}

const TurnContext = createContext<TurnContextProps | undefined>(undefined);

export const useTurn = () => {
  const context = useContext(TurnContext);
  if (!context) {
    throw new Error('useTurn must be used within a TurnProvider');
  }
  return context;
};

export const TurnProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // These states will now be updated directly by CombatTracker based on server syncs
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number | null>(null);
  const [combatantsInTurnOrder, setCombatantsInTurnOrder] = useState<CombatTrackerToken[]>([]);

  // Removed internal sorting and turn progression logic (goToNextTurn, goToPreviousTurn)
  // as the server will manage the initiative order and current turn index.

  return (
    <TurnContext.Provider
      value={{
        currentTurnIndex,
        combatantsInTurnOrder,
        setCombatantsInTurnOrder,
        setCurrentTurnIndex, // Provided for CombatTracker to update the state from server
      }}
    >
      {children}
    </TurnContext.Provider>
  );
};