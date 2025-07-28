// src/components/CombatTracker.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CombatTrackerToken } from '../types';
import { useTurn } from '../components/contexts/TurnContext';
import '../css/CombatTracker/CombatTracker.css'

interface CombatTrackerProps {
  currentUserId: number | null; // A prop currentUserId é mantida
}

const CombatTracker: React.FC<CombatTrackerProps> = ({ currentUserId }) => {
  const [activeTab, setActiveTab] = useState<'iniciativa' | 'party' | 'historico'>('iniciativa');
  const {
    currentTurnIndex,
    combatantsInTurnOrder,
    setCombatantsInTurnOrder, // Mantido para atualizar o estado local com dados do servidor
    setCurrentTurnIndex       // Mantido para atualizar o estado local com dados do servidor
  } = useTurn();

  const [editingInitiativeId, setEditingInitiativeId] = useState<number | null>(null);
  const [editingInitiativeValue, setEditingInitiativeValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Removido o useEffect que inicializava combatants do prop initialCombatants,
  // pois agora o estado será sincronizado pelo servidor.

  // Mocks de tokens para o CombatTokensDisplay (mantidos como você os tinha)
  useEffect(() => {
        const electron = (window as any).electron;
    if (electron) {


      const handleInitiativeSync = ( data: any) => {
        console.log("[CombatInterface] Dados de iniciativa recebidos do servidor:", data);
        setCombatantsInTurnOrder(data.combatants)

      };

      electron.on('initiative-sync-from-server', handleInitiativeSync);

      // NOVO: Envia uma requisição para o main.js para obter o estado inicial da iniciativa
      console.log("[CombatInterface] Requisitando estado inicial da iniciativa...");
      electron.send('request-initial-initiative-state'); //

      return () => {
        electron.DoremoveListener('initiative-sync-from-server', handleInitiativeSync);
      };
    }
  }, []);
  
  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron) {
      console.warn('Objeto electron não encontrado. Ignorando listeners no CombatTracker.');
      return;
    }

    // Handler para receber a sincronização de iniciativa do servidor
    const handleInitiativeSync = (data: { combatants: CombatTrackerToken[]; currentTurnIndex: number }) => {
      console.log("Recebida sincronização de iniciativa do servidor:", data);
      setCombatantsInTurnOrder(data.combatants);
      setCurrentTurnIndex(data.currentTurnIndex);
    };

    // Assina o evento para receber atualizações do servidor via main.js
    electron.on('initiative-sync-from-server', handleInitiativeSync);

    return () => {
      // Remove o listener ao desmontar o componente
      electron.DoremoveListener('initiative-sync-from-server', handleInitiativeSync);
    };
  }, [setCombatantsInTurnOrder, setCurrentTurnIndex]); // Dependências para garantir que o efeito seja re-executado se essas funções mudarem

  // NOVO useEffect para notificação de turno
  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron || currentUserId === null) {
      // Não notifica se o objeto electron não estiver disponível ou se não houver um ID de usuário logado
      return;
    }

    if (combatantsInTurnOrder.length > 0 && currentTurnIndex !== null) {
      const currentToken = combatantsInTurnOrder[currentTurnIndex];
      // Verifica se o token atual tem um playerId e se ele corresponde ao currentUserId
      if (currentToken && currentToken.playerId !== null && currentToken.playerId === currentUserId) {
        console.log(`É o turno de ${currentToken.name}! Enviando notificação.`);
        electron.send('notify-my-turn', {
          title: 'Seu Turno!',
          body: `É a vez de ${currentToken.name} agir.`,
          icon: currentToken.portraitUrl // Opcional: usa a imagem do token como ícone
        });
      }
    }
  }, [currentTurnIndex, combatantsInTurnOrder, currentUserId]); // Dependências: reage a mudanças no turno ou na lista de combatentes/ID do usuário

  const handleInitiativeClick = (token: CombatTrackerToken) => {
    setEditingInitiativeId(token.id);
    setEditingInitiativeValue(token.initiative.toString());
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleInitiativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingInitiativeValue(e.target.value);
  };

  const handleInitiativeBlur = async () => { // Função agora é assíncrona
    if (editingInitiativeId === null) return;

    const newInitiative = parseInt(editingInitiativeValue);
    const tokenIdToUpdate = editingInitiativeId; // Captura o ID antes de resetar o estado

    if (!isNaN(newInitiative)) {
        const electron = (window as any).electron;
        if (electron?.invoke) {
            // Envia a atualização para o processo principal (main.js), que a retransmitirá para o servidor
            await electron.invoke('update-combatant-initiative', tokenIdToUpdate, newInitiative);
        }
    }

    setEditingInitiativeId(null);
    setEditingInitiativeValue('');
  };

  const handleInitiativeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInitiativeBlur();
    }
  };

  const handleGoToNextTurn = async () => { // Função agora é assíncrona
    const electron = (window as any).electron;
    if (electron?.invoke) {
        // Solicita ao processo principal (main.js) para avançar o turno no servidor
        await electron.invoke('request-next-turn');
    }
  };

  const handleGoToPreviousTurn = async () => { // Função agora é assíncrona
    const electron = (window as any).electron;
    if (electron?.invoke) {
        // Solicita ao processo principal (main.js) para retroceder o turno no servidor
        await electron.invoke('request-previous-turn');
    }
  };

  const renderInitiativeTab = () => (
    <>
      <div className="d-flex justify-content-around mb-2">
        <button className="btn btn-outline-light btn-sm" onClick={handleGoToPreviousTurn}> {/* Atualizado onClick */}
          <i className="bi bi-arrow-left-circle"></i> Turno Anterior
        </button>
        <button className="btn btn-outline-light btn-sm" onClick={handleGoToNextTurn}> {/* Atualizado onClick */}
          Próximo Turno <i className="bi bi bi-arrow-right-circle"></i>
        </button>
      </div>
      <ul id="initiative-list" className="list-group custom-scroll" style={{ flexGrow: 1, overflowY: 'auto' }}>
        {combatantsInTurnOrder.map((token, index) => (
         <li key={token.id} className={`list-group-item d-flex align-items-center bg-dark text-white border-secondary mb-1 small py-1 px-2 ${index === currentTurnIndex ? 'highlight-current-turn' : ''}`}>
            <span className="fw-bold me-2" style={{ width: '25px', textAlign: 'center' }}>{index + 1}.</span>

            <img src={token.portraitUrl} alt={token.name} className="rounded-circle me-2" style={{ width: '24px', height: '24px' }} />
            <div className="flex-grow-1">
              <span className="fw-bold">{token.name}</span>
              {/* Exibindo o ID do jogador se existir */}
              {token.playerId !== null && <small className="text-muted d-block" style={{ lineHeight: '1' }}>Player ID: {token.playerId}</small>}
              <small className="text-muted d-block" style={{ lineHeight: '1' }}>HP: {token.currentHp}/{token.maxHp}</small>
            </div>
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
       {combatantsInTurnOrder.filter(c => c.type === 'ally').map(token => (
         <li key={token.id} className="list-group-item d-flex align-items-center bg-dark text-white border-secondary mb-1 small py-1 px-2">
           <img src={token.portraitUrl} alt={token.name} className="rounded-circle me-2" style={{ width: '24px', height: '24px' }} />
           <div className="flex-grow-1">
             <span className="fw-bold">{token.name}</span>
             {token.playerId !== null && <small className="text-muted d-block" style={{ lineHeight: '1' }}>Player ID: {token.playerId}</small>}
             <small className="text-muted d-block" style={{ lineHeight: '1' }}>HP: {token.currentHp}/{token.maxHp}</small>
           </div>
           <span className="badge bg-info text-dark">CA: {token.ac}</span>
         </li>
       ))}
     </ul>
  );

  const renderDamageHistoryTab = () => (
    <ul className="list-group custom-scroll" style={{ flexGrow: 1, overflowY: 'auto' }}>
      {combatantsInTurnOrder.map(token => (
        <li key={token.id} className="list-group-item bg-dark text-white border-secondary mb-1 small p-2">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <img src={token.portraitUrl} alt={token.name} className="rounded-circle me-2" style={{ width: '24px', height: '24px' }} />
              <span className="fw-bold">{token.name}</span>
            </div>
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