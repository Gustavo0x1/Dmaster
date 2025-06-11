// src/components/CombatTracker.tsx

import React, { useState, useMemo } from 'react';
import { CombatTrackerToken } from '../types';


// A única prop necessária é a lista de combatentes
interface CombatTrackerProps {
  combatants:CombatTrackerToken[];
}

const CombatTracker: React.FC<CombatTrackerProps> = ({ combatants }) => {
  const [activeTab, setActiveTab] = useState<'iniciativa' | 'party' | 'historico'>('iniciativa');
  const [turnIndex, setTurnIndex] = useState(0);

  const sortedCombatants = useMemo(() =>
    [...combatants].sort((a, b) => b.initiative - a.initiative),
    [combatants]
  );

  const handleNextTurn = () => setTurnIndex(prev => (prev + 1) % sortedCombatants.length);
  const handlePreviousTurn = () => setTurnIndex(prev => (prev - 1 + sortedCombatants.length) % sortedCombatants.length);

  // As funções renderInitiativeTab e renderPartyTab permanecem as mesmas...

  const renderInitiativeTab = () => (
    <>
      <ul id="initiative-list" className="list-group custom-scroll" style={{ flexGrow: 1, overflowY: 'auto' }}>
        {sortedCombatants.map((token, index) => (
          <li key={token.id} className={`list-group-item d-flex align-items-center bg-dark text-white border-secondary mb-1 small py-1 px-2 ${index === turnIndex ? 'bg-primary border-light' : ''}`}>
            <span className="fw-bold me-2" style={{ width: '25px' }}>{token.initiative}</span>
            <img src={token.portraitUrl} alt={token.name} className="rounded-circle me-2" style={{ width: '24px', height: '24px' }} />
            <div className="flex-grow-1">
              <span className="fw-bold">{token.name}</span>
              <small className="text-muted d-block" style={{ lineHeight: '1' }}>HP: {token.currentHp}/{token.maxHp}</small>
            </div>
            <span className="badge bg-info text-dark">CA: {token.ac}</span>
          </li>
        ))}
      </ul>

    </>
  );

  const renderPartyTab = () => (
     <ul className="list-group custom-scroll" style={{ flexGrow: 1, overflowY: 'auto' }}>
       {combatants.filter(c => c.type === 'ally').map(token => (
         <li key={token.id} className="list-group-item d-flex align-items-center bg-dark text-white border-secondary mb-1 small py-1 px-2">
           <img src={token.portraitUrl} alt={token.name} className="rounded-circle me-2" style={{ width: '24px', height: '24px' }} />
           <div className="flex-grow-1">
             <span className="fw-bold">{token.name}</span>
             <small className="text-muted d-block" style={{ lineHeight: '1' }}>HP: {token.currentHp}/{token.maxHp}</small>
           </div>
           <span className="badge bg-info text-dark">CA: {token.ac}</span>
         </li>
       ))}
     </ul>
  );


  // NOVO: A aba "Histórico" agora exibe os dois números de dano
  const renderDamageHistoryTab = () => (
    <ul className="list-group custom-scroll" style={{ flexGrow: 1, overflowY: 'auto' }}>
      {sortedCombatants.map(token => (
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