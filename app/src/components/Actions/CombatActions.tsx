// src/components/CombatActions/CombatActions.tsx
import React, { useState, useMemo } from 'react';
import { CombatAction, Token } from '../../types'; // Importe Token padronizado

interface CombatActionsProps {
  actions: CombatAction[];
  onDeleteAction: (actionId: string) => void;
  onEditAction: (action: CombatAction) => void;
  onToggleFavorite: (actionId: string, isFavorite: boolean) => void;
  availableTokens: Token[]; // NOVO: Tokens disponíveis para serem alvos (já serão os selecionados)
  onTokenSelected: (token: Token | null) => void; // NOVO: Callback para notificar o Manager sobre o token selecionado
}

const CombatActions: React.FC<CombatActionsProps> = ({ actions, onDeleteAction, onEditAction, onToggleFavorite, availableTokens, onTokenSelected }) => {
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedTargetTokenId, setSelectedTargetTokenId] = useState<number | null>(null); // ID do token alvo, pode ser number
  
  const selectedAction = useMemo(() => {
    return actions.find(action => action.id === selectedActionId);
  }, [actions, selectedActionId]);

  const favoriteActions = useMemo(() => {
    return actions.filter(action => action.isFavorite);
  }, [actions]);

  const normalActions = useMemo(() => {
    return actions.filter(action => !action.isFavorite);
  }, [actions]);

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedActionId(e.target.value);
    setSelectedTargetTokenId(null); // Limpa alvo ao mudar a ação
    onTokenSelected(null); // Limpa o token exibido na direita
  };

  const handleTargetTokenSelect = (tokenId: number) => { // Manipulador de seleção de alvo
    setSelectedTargetTokenId(tokenId);
    const token = availableTokens.find(t => t.id === tokenId) || null;
    onTokenSelected(token); // Notifica o Manager sobre o token selecionado
  };

  const handlePerformAction = () => {
    if (selectedAction) {
      const targetToken = availableTokens.find(t => t.id === selectedTargetTokenId);
      const targetName = targetToken ? targetToken.name : "Nenhum Alvo Selecionado"; // Mensagem mais clara
      alert(`Executando "${selectedAction.name}" em "${targetName}"!`);
      console.log("Ação a ser executada:", selectedAction, "Alvo:", targetToken);
      // Aqui você passaria a lógica para aplicar dano/efeito ao targetToken
    }
  };

  return (
    <div className="card bg-dark border-secondary text-white h-100 p-3 combat-actions-card">
      <h5 className="card-title text-warning mb-3">Ações Salvas</h5>

      <div className="card-body p-0 custom-scroll overflow-auto">
        {/* Seção de Ações Favoritas */}
        {favoriteActions.length > 0 && (
          <div className="favorite-actions-section mb-3">
            <h6 className="text-info text-start px-3 pt-2">Favoritos</h6>
            <div className="d-flex flex-wrap gap-2 justify-content-center px-2 pb-2">
              {favoriteActions.map(action => (
                <div key={action.id} 
                     className={`card bg-secondary border-secondary text-white p-2 favorite-action-card ${selectedActionId === action.id ? 'active-favorite-card' : ''}`}
                     onClick={() => setSelectedActionId(action.id)}
                     style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-warning">{action.name}</small>
                    <i className="bi bi-star-fill text-warning" onClick={(e) => { e.stopPropagation(); onToggleFavorite(action.id, false); }} style={{ cursor: 'pointer' }}></i>
                  </div>
                  <small className="text-muted">{action.type === 'attack' ? 'Ataque' : `Nv.${action.level}`}</small>
                  {action.effectType === 'damage' && action.damage && <small className="text-info d-block">{action.damage}</small>}
                  {action.effectType === 'utility' && action.utilityTitle && <small className="text-info d-block">{action.utilityTitle}</small>}
                  {action.type === 'spell' && action.description && <p className="mb-0 small p-limit-text-lines">{action.description}</p>}
                </div>
              ))}
            </div>
            <hr className="border-secondary my-3"/>
          </div>
        )}

        {/* Seleção de Ações Normais */}
        <div className="mb-3">
          <label htmlFor="combatActionSelect" className="form-label small text-muted px-3">Selecionar Ação:</label>
          <select
            id="combatActionSelect"
            className="form-select form-select-sm bg-dark text-white border-secondary mx-3 w-auto flex-grow-1"
            value={selectedActionId || ''}
            onChange={handleActionChange}
            style={{ maxWidth: 'calc(100% - 1.5rem)' }}
          >
            <option value="">-- Selecione uma ação --</option>
            {normalActions.map(action => (
              <option key={action.id} value={action.id}>
                {action.name} ({action.type === 'attack' ? 'Ataque' : `Magia Nv.${action.level}`})
              </option>
            ))}
          </select>
          {actions.length === 0 && <small className="text-muted mt-2 d-block px-3">Nenhuma ação salva ainda. Crie uma na aba "Criar Ação"!</small>}
        </div>

        {/* Detalhes da Ação Selecionada */}
        {selectedAction && (
          <div className="card bg-secondary text-white p-2 mb-3 selected-action-detail-card">
            <h6 className="card-subtitle mb-1 text-warning">{selectedAction.name}</h6>
            <p className="mb-1 small">Tipo: {selectedAction.type === 'attack' ? 'Ataque' : 'Magia'}</p>
            <p className="mb-1 small">Efeito: {selectedAction.effectType === 'damage' ? 'Dano' : 'Utilidade'}</p>
            {selectedAction.range && <p className="mb-1 small">Alcance: {selectedAction.range}</p>}

            {selectedAction.effectType === 'damage' && selectedAction.damage && (
                <p className="mb-1 small">Dano: <strong className="text-info">{selectedAction.damage}</strong></p>
            )}
            {selectedAction.effectType === 'utility' && selectedAction.utilityTitle && (
                <p className="mb-1 small">Efeito: <strong className="text-info">{selectedAction.utilityTitle}</strong> {selectedAction.utilityValue && `(${selectedAction.utilityValue})`}</p>
            )}

            {selectedAction.type === 'attack' ? (
              <>
                {selectedAction.properties && selectedAction.properties.length > 0 && (
                  <p className="mb-1 small">Propriedades: {selectedAction.properties.join(', ')}</p>
                )}
              </>
            ) : ( // Magia
              <>
                <p className="mb-1 small">Nível: {selectedAction.level}</p>
                <p className="mb-1 small">Tempo de Conjuração: {selectedAction.castingTime}</p>
                <p className="mb-1 small">Duração: {selectedAction.duration}</p>
                {selectedAction.school && <p className="mb-1 small">Escola: {selectedAction.school}</p>}
                {selectedAction.saveDC && <p className="mb-1 small">Teste de Resistência: {selectedAction.saveDC}</p>}
                {selectedAction.description && <p className="mb-0 small">{selectedAction.description}</p>}
              </>
            )}

            {/* Botões de Edição e Exclusão e Favoritar/Desfavoritar */}
            <div className="d-flex justify-content-end gap-2 mt-3">
                <button
                    className={`btn btn-sm ${selectedAction.isFavorite ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => onToggleFavorite(selectedAction.id, !selectedAction.isFavorite)}
                    title={selectedAction.isFavorite ? 'Desfavoritar' : 'Favoritar'}
                >
                    <i className={`bi ${selectedAction.isFavorite ? 'bi-star-fill' : 'bi-star'}`}></i>
                </button>
                <button
                    className="btn btn-sm btn-outline-warning"
                    onClick={() => onEditAction(selectedAction)}
                >
                    <i className="bi bi-pencil me-1"></i> Editar
                </button>
                <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDeleteAction(selectedAction.id)}
                >
                    <i className="bi bi-trash me-1"></i> Excluir
                </button>
            </div>
          </div>
        )}
        
        {/* Seleção de Alvo por Tokens */}
        {selectedAction && ( /* Só mostra se uma ação estiver selecionada */
            <div className="target-selection-section mb-3 mx-3">
                <label className="form-label small text-muted">Selecionar Alvo:</label>
                {availableTokens.length === 0 ? (
                    <p className="text-muted small">Nenhum token disponível para alvo.</p>
                ) : (
                    <ul className="list-group custom-scroll" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {availableTokens.map(token => (
                            <li
                                key={token.id} // Key é o ID numérico
                                className={`list-group-item d-flex align-items-center bg-dark text-white border-secondary ${selectedTargetTokenId === token.id ? 'active-target-token' : ''}`}
                                onClick={() => handleTargetTokenSelect(token.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                <img src={token.portraitUrl} alt={token.name} className="rounded-circle me-2" style={{ width: '30px', height: '30px', objectFit: 'cover' }}/>
                                <span className="flex-grow-1">{token.name}</span>
                                <small className="text-muted">HP: {token.currentHp}/{token.maxHp}</small>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )}
      </div>

      <div className="card-footer bg-transparent border-0 pt-3">
        {selectedAction && (
          <button className="btn btn-success w-100" onClick={handlePerformAction}>
            Realizar {selectedAction.type === 'attack' ? 'Ataque' : 'Magia'}
            <i className="bi bi-dice-5-fill ms-2"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default CombatActions;