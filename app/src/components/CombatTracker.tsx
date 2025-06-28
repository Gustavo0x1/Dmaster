// src/components/CombatTracker.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CombatTrackerToken } from '../types';
import { useTurn } from '../components/contexts/TurnContext'; // NEW: Import useTurn
import '../css/CombatTracker/CombatTracker.css'
// A única prop necessária é a lista de combatentes
interface CombatTrackerProps {
  combatants:CombatTrackerToken[];
}

const CombatTracker: React.FC<CombatTrackerProps> = ({ combatants: initialCombatants }) => {
  const [activeTab, setActiveTab] = useState<'iniciativa' | 'party' | 'historico'>('iniciativa');
  // OLD: const [turnIndex, setTurnIndex] = useState(0); // Turn index now managed by TurnContext
  // OLD: const [combatants, setCombatants] = useState<CombatTrackerToken[]>(initialCombatants); // Combatants state now managed by TurnContext

  // NEW: Use the useTurn hook
  const {
    currentTurnIndex,
    combatantsInTurnOrder,
    goToNextTurn,
    goToPreviousTurn,
    setCombatantsInTurnOrder
  } = useTurn();

  // NEW: State to manage the editing of initiative
  const [editingInitiativeId, setEditingInitiativeId] = useState<number | null>(null);
  const [editingInitiativeValue, setEditingInitiativeValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null); // Ref for the input field

  // Effect to update internal combatants in TurnContext when initialCombatants prop changes
  // This essentially passes the initial combatants from the parent (e.g., App.tsx) to the TurnContext
  useEffect(() => {
    setCombatantsInTurnOrder(initialCombatants);
  }, [initialCombatants, setCombatantsInTurnOrder]);

  // NEW: Add a useEffect to listen for new tokens from the main process
  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron) {
      console.warn('Objeto electron não encontrado. Ignorando listeners no CombatTracker.');
      return;
    }

    const handleAddTokensToInitiative = (newTokens: CombatTrackerToken[]) => {
      setCombatantsInTurnOrder(prevCombatants => {
        const existingTokenIds = new Set(prevCombatants.map(c => c.id));
        const filteredNewTokens = newTokens.filter(newToken => !existingTokenIds.has(newToken.id));
        return [...prevCombatants, ...filteredNewTokens];
      });
    };

    electron.on('add-tokens-to-combat-tracker', handleAddTokensToInitiative);

    return () => {
      electron.removeListener('add-tokens-to-combat-tracker', handleAddTokensToInitiative);
    };
  }, [setCombatantsInTurnOrder]); // Depend on setCombatantsInTurnOrder to ensure it's stable

  // OLD: Sorted combatants are now directly available from useTurn context
  // const sortedCombatants = useMemo(() =>
  //   [...combatants].sort((a, b) => b.initiative - a.initiative),
  //   [combatants]
  // );

  // NEW: handleInitiativeClick function
  const handleInitiativeClick = (token: CombatTrackerToken) => {
    setEditingInitiativeId(token.id);
    setEditingInitiativeValue(token.initiative.toString());
    // Focus the input field after it appears in the DOM
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  // NEW: Handle change in initiative input
  const handleInitiativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingInitiativeValue(e.target.value);
  };

  // NEW: Handle saving the initiative after editing
  const handleInitiativeBlur = () => {
    if (editingInitiativeId === null) return;

    const newInitiative = parseInt(editingInitiativeValue);

    setCombatantsInTurnOrder(prevCombatants => prevCombatants.map(token =>
      token.id === editingInitiativeId
        ? { ...token, initiative: isNaN(newInitiative) ? token.initiative : newInitiative }
        : token
    ));

    setEditingInitiativeId(null);
    setEditingInitiativeValue('');
  };

  // NEW: Handle key presses in the initiative input
  const handleInitiativeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInitiativeBlur();
    }
  };


  const renderInitiativeTab = () => (
    <>
      <div className="d-flex justify-content-around mb-2">
        <button className="btn btn-outline-light btn-sm" onClick={goToPreviousTurn}> {/* NEW: Use goToPreviousTurn from context */}
          <i className="bi bi-arrow-left-circle"></i> Turno Anterior
        </button>
        <button className="btn btn-outline-light btn-sm" onClick={goToNextTurn}> {/* NEW: Use goToNextTurn from context */}
          Próximo Turno <i className="bi bi-arrow-right-circle"></i>
        </button>
      </div>
      <ul id="initiative-list" className="list-group custom-scroll" style={{ flexGrow: 1, overflowY: 'auto' }}>
        {combatantsInTurnOrder.map((token, index) => ( // NEW: Use combatantsInTurnOrder from context
         <li key={token.id} className={`list-group-item d-flex align-items-center bg-dark text-white border-secondary mb-1 small py-1 px-2 ${index === currentTurnIndex ? 'highlight-current-turn' : ''}`}>
            {/* Turn Order Number */}
            <span className="fw-bold me-2" style={{ width: '25px', textAlign: 'center' }}>{index + 1}.</span>

            <img src={token.portraitUrl} alt={token.name} className="rounded-circle me-2" style={{ width: '24px', height: '24px' }} />
            <div className="flex-grow-1">
              <span className="fw-bold">{token.name}</span>
              <small className="text-muted d-block" style={{ lineHeight: '1' }}>HP: {token.currentHp}/{token.maxHp}</small>
            </div>
            {/* Editable Initiative Value */}
            {editingInitiativeId === token.id ? (
              <input
                ref={inputRef}
                type="number"
                value={editingInitiativeValue}
                onChange={handleInitiativeChange}
                onBlur={handleInitiativeBlur}
                onKeyPress={handleInitiativeKeyPress}
                className="form-control form-control-sm text-center bg-info text-dark"
                style={{ width: '60px' }}
              />
            ) : (
              <span className="badge bg-info text-dark" onClick={() => handleInitiativeClick(token)} style={{ cursor: 'pointer' }}>
                Ini: {token.initiative}
              </span>
            )}
          </li>
        ))}
      </ul>

    </>
  );

  const renderPartyTab = () => (
     <ul className="list-group custom-scroll" style={{ flexGrow: 1, overflowY: 'auto' }}>
       {/* Use combatantsInTurnOrder (or combatants if filtering is based on the unsorted list) here as needed */}
       {combatantsInTurnOrder.filter(c => c.type === 'ally').map(token => (
         <li key={token.id} className="list-group-item d-flex align-items-center bg-dark text-white border-secondary mb-1 small py-1 px-2">
           <img src={token.portraitUrl} alt={token.name} className="rounded-circle me-2" style={{ width: '24px', height: '24px' }} />
           <div className="flex-grow-1">
             <span className="fw-bold">{token.name}</span>
             <small className="text-muted d-block" style={{ lineHeight: '1' }}>HP: {token.currentHp}/{token.maxHp}</small>
           </div>
           <span className="badge bg-info text-dark">CA: {token.ac}</span> {/* Still showing CA in Party tab */}
         </li>
       ))}
     </ul>
  );


  const renderDamageHistoryTab = () => (
    <ul className="list-group custom-scroll" style={{ flexGrow: 1, overflowY: 'auto' }}>
      {combatantsInTurnOrder.map(token => ( // NEW: Use combatantsInTurnOrder from context
        <li key={token.id} className="list-group-item bg-dark text-white border-secondary mb-1 small p-2">
          <div className="d-flex align-items-center justify-content-between">
            {/* Nome do personagem */}
            <div className="d-flex align-items-center">
              <img src={token.portraitUrl} alt={token.name} className="rounded-circle me-2" style={{ width: '24px', height: '24px' }} />
              <span className="fw-bold">{token.name}</span>
            </div>

            {/* Números de Dano */}
            <div>
              <span className="badge text-bg-success me-2">Causado: {token.danoCausado}</span>
              <span className="badge text-bg-danger">Sofrido: {token.danoSofrido}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'iniciativa': return renderInitiativeTab();
      case 'party': return renderPartyTab();
      case 'historico': return renderDamageHistoryTab();
      default: return null;
    }
  };

  return (
    <div className="combat-tracker p-2 bg-dark h-100 text-white d-flex flex-column">
      <ul className="nav nav-tabs mb-2">
        <li className="nav-item">
          <button className={`nav-link small py-1 px-2 ${activeTab === 'iniciativa' ? 'active' : 'text-white bg-dark'}`} onClick={() => setActiveTab('iniciativa')}>Iniciativa</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link small py-1 px-2 ${activeTab === 'party' ? 'active' : 'text-white bg-dark'}`} onClick={() => setActiveTab('party')}>Party</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link small py-1 px-2 ${activeTab === 'historico' ? 'active' : 'text-white bg-dark'}`} onClick={() => setActiveTab('historico')}>Histórico</button>
        </li>
      </ul>
      <div className="tab-content h-100 d-flex flex-column">
        {renderActiveTabContent()}
      </div>
    </div>
  );
};

export default CombatTracker;