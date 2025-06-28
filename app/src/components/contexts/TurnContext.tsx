// src/components/contexts/TurnContext.tsx
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { CombatTrackerToken } from '../../types'; // Assuming types.ts is in the parent directory

interface TurnContextProps {
  currentTurnIndex: number;
  combatantsInTurnOrder: CombatTrackerToken[];
  goToNextTurn: () => void;
  goToPreviousTurn: () => void;
  setCombatantsInTurnOrder: React.Dispatch<React.SetStateAction<CombatTrackerToken[]>>;
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
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [combatants, setCombatants] = useState<CombatTrackerToken[]>([]); // This will hold the "unsorted" combatants received from MainGrids

  // This memoized value ensures sorting only happens when combatants change
  const combatantsInTurnOrder = useMemo(() =>
    [...combatants].sort((a, b) => b.initiative - a.initiative),
    [combatants]
  );

  const goToNextTurn = useCallback(() => {
    
    if (combatantsInTurnOrder.length > 0) {
      setCurrentTurnIndex(prev => (prev + 1) % combatantsInTurnOrder.length);
    } else {
      setCurrentTurnIndex(0);
    }
  }, [combatantsInTurnOrder.length]);

  const goToPreviousTurn = useCallback(() => {
    if (combatantsInTurnOrder.length > 0) {
      setCurrentTurnIndex(prev => (prev - 1 + combatantsInTurnOrder.length) % combatantsInTurnOrder.length);
    } else {
      setCurrentTurnIndex(0);
    }
  }, [combatantsInTurnOrder.length]);

  const setCombatantsInTurnOrder = useCallback((newCombatants: React.SetStateAction<CombatTrackerToken[]>) => {
    setCombatants(newCombatants);
  }, []);

  return (
    <TurnContext.Provider
      value={{
        currentTurnIndex,
        combatantsInTurnOrder,
        goToNextTurn,
        goToPreviousTurn,
        setCombatantsInTurnOrder,
      }}
    >
      {children}
    </TurnContext.Provider>
  );
};