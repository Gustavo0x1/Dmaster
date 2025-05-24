import React, { useState, useMemo } from 'react';
import { CharacterAction, Token } from '../../types';

interface CombatActionsProps {
  actions: CharacterAction[];
  onDeleteAction: (actionId: string) => void;
  onEditAction: (action: CharacterAction) => void;
  onToggleFavorite: (actionId: string, isFavorite: boolean) => void;
  availableTokens: Token[];
  onTokenSelected: (token: Token | null) => void;
}

const CombatActions: React.FC<CombatActionsProps> = ({ actions, onDeleteAction, onEditAction, onToggleFavorite, availableTokens, onTokenSelected }) => {
  // Não precisamos mais de selectedActionId para a exibição principal,
  // mas vamos mantê-lo para a lógica de "realizar ação" e detalhes no footer
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedTargetTokenId, setSelectedTargetTokenId] = useState<number | null>(null);

  const selectedAction = useMemo(() => {
    return actions.find(action => action.id === selectedActionId);
  }, [actions, selectedActionId]);

  const favoriteActions = useMemo(() => {
    return actions.filter(action => action.isFavorite);
  }, [actions]);

  // Todas as ações serão exibidas na tabela, favoritas ou não
  // As 'normalActions' não são mais necessárias como um filtro separado para a exibição principal.
  // const normalActions = useMemo(() => {
  //   return actions.filter(action => !action.isFavorite);
  // }, [actions]);

  // Ação para selecionar uma linha da tabela (que será a ação selecionada)
  const handleSelectActionInTable = (action: CharacterAction) => {
    setSelectedActionId(action.id);
    setSelectedTargetTokenId(null); // Limpa alvo ao mudar a ação
    onTokenSelected(null); // Limpa o token exibido na direita
  };

  const handleTargetTokenSelect = (tokenId: number) => {
    setSelectedTargetTokenId(tokenId);
    const token = availableTokens.find(t => t.id === tokenId) || null;
    onTokenSelected(token);
  };

  const handlePerformAction = () => {
    if (selectedAction) {
      const targetToken = availableTokens.find(t => t.id === selectedTargetTokenId);
      const targetName = targetToken ? targetToken.name : "Nenhum Alvo Selecionado";
      alert(`Executando "${selectedAction.name}" em "${targetName}"!`);
      console.log("Ação a ser executada:", selectedAction, "Alvo:", targetToken);
      // Lógica para aplicar dano/efeito
    }
  };

  return (
    <div className="card bg-dark border-secondary text-white h-100 p-3 combat-actions-card d-flex flex-column">
      <h5 className="card-title text-warning mb-3">Minhas Ações</h5>

      <div className="card-body p-0 flex-grow-1 overflow-auto"> {/* Este é o corpo principal que terá scroll */}

        {actions.length === 0 ? (
          <p className="text-muted text-center py-3">Nenhuma ação salva ainda. Crie uma nova ação!</p>
        ) : (
          <table className="table table-dark table-striped table-hover table-sm">
            <thead>
              <tr>
                <th scope="col" className="text-warning text-center">Nome</th>
                <th scope="col" className="text-warning text-center">Tipo</th>
                <th scope="col" className="text-warning text-center">Efeito</th>
                <th scope="col" className="text-warning text-center">Alcance</th>
                <th scope="col" className="text-warning text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {/* Favoritas primeiro */}
              {favoriteActions.map(action => (
                <tr
                  key={action.id}
                  className={`align-middle ${selectedActionId === action.id ? 'table-primary text-dark' : ''}`}
                  onClick={() => handleSelectActionInTable(action)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="text-white text-center">
                    {action.name}
                    <i className="bi bi-star-fill text-warning ms-1" title="Favorita"></i>
                  </td>
                  <td className="text-center">{action.mainType}</td>
                  <td className="text-center">{action.effectCategory}</td>
                  <td className="text-center">{action.attackRange || '-'}</td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-outline-info me-1" onClick={(e) => { e.stopPropagation(); onEditAction(action); }}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={(e) => { e.stopPropagation(); onDeleteAction(action.id); }}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}

              {/* Demais ações */}
              {actions.filter(action => !action.isFavorite).map(action => (
                <tr
                  key={action.id}
                  className={`align-middle ${selectedActionId === action.id ? 'table-primary text-dark' : ''}`}
                  onClick={() => handleSelectActionInTable(action)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="text-white text-center">{action.name}</td>
                  <td className="text-center">{action.mainType}</td>
                  <td className="text-center">{action.effectCategory}</td>
                  <td className="text-center">{action.attackRange || '-'}</td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-outline-warning me-1" onClick={(e) => { e.stopPropagation(); onToggleFavorite(action.id, true); }} title="Favoritar">
                        <i className="bi bi-star"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-info me-1" onClick={(e) => { e.stopPropagation(); onEditAction(action); }}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={(e) => { e.stopPropagation(); onDeleteAction(action.id); }}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Detalhes da Ação Selecionada (abaixo da tabela, se houver espaço) */}
        {selectedAction && (
          <div className="card bg-secondary text-white p-3 mt-3 selected-action-detail-card flex-shrink-0">
            <h6 className="card-subtitle mb-2 text-warning">{selectedAction.name}</h6>
            <p className="mb-1 small">Tipo Principal: <strong>{selectedAction.mainType}</strong></p>
            <p className="mb-1 small">Categoria de Efeito: <strong>{selectedAction.effectCategory}</strong></p>

            {selectedAction.attackRange && <p className="mb-1 small">Alcance: {selectedAction.attackRange}</p>}
            {selectedAction.target && <p className="mb-1 small">Alvo: {selectedAction.target}</p>}

            {selectedAction.effectCategory === 'damage' && selectedAction.damageDice && (
                <p className="mb-1 small">Dano: <strong className="text-info">{selectedAction.damageDice} {selectedAction.damageType || ''}</strong></p>
            )}
            {selectedAction.effectCategory === 'healing' && selectedAction.healingDice && (
                <p className="mb-1 small">Cura: <strong className="text-success">{selectedAction.healingDice}</strong></p>
            )}
            {selectedAction.effectCategory === 'utility' && selectedAction.utilityTitle && (
                <p className="mb-1 small">Efeito: <strong className="text-info">{selectedAction.utilityTitle}</strong> {selectedAction.utilityValue && `(${selectedAction.utilityValue})`}</p>
            )}

            {selectedAction.mainType === 'attack' && selectedAction.properties && selectedAction.properties.length > 0 && (
                <p className="mb-1 small">Propriedades: {selectedAction.properties.join(', ')}</p>
            )}

            {selectedAction.mainType === 'spell' && (
              <>
                {selectedAction.level !== undefined && <p className="mb-1 small">Nível: {selectedAction.level}</p>}
                {selectedAction.castingTime && <p className="mb-1 small">Tempo de Conjuração: {selectedAction.castingTime}</p>}
                {selectedAction.duration && <p className="mb-1 small">Duração: {selectedAction.duration}</p>}
                {selectedAction.school && <p className="mb-1 small">Escola: {selectedAction.school}</p>}
                {selectedAction.saveDC && <p className="mb-1 small">Teste de Resistência: {selectedAction.saveDC}</p>}
              </>
            )}
            {selectedAction.description && <p className="mb-0 small">{selectedAction.description}</p>}
          </div>
        )}

        {/* Seleção de Alvo por Tokens */}
        {selectedAction && (
            <div className="target-selection-section mb-3 mx-3 flex-shrink-0"> {/* flex-shrink-0 para não encolher */}
                <label className="form-label small text-muted">Selecionar Alvo:</label>
                {availableTokens.length === 0 ? (
                    <p className="text-muted small">Nenhum token disponível para alvo.</p>
                ) : (
                    <ul className="list-group custom-scroll" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {availableTokens.map(token => (
                            <li
                                key={token.id}
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

      <div className="card-footer bg-transparent border-0 pt-3 flex-shrink-0"> {/* flex-shrink-0 para o footer fixo */}
        {selectedAction && (
          <button className="btn btn-success w-100" onClick={handlePerformAction}>
            Realizar {selectedAction.mainType === 'attack' ? 'Ataque' : selectedAction.mainType === 'spell' ? 'Magia' : selectedAction.mainType === 'utility' ? 'Utilidade' : 'Habilidade'}
            <i className="bi bi-dice-5-fill ms-2"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default CombatActions;