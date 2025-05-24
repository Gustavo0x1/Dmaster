import React, { useState, useMemo } from 'react';
import { CharacterAction, Token } from '../../types';
import { rollDice, rollD20, formatRollResult } from '../../utils/diceRoller'; // Importa o utilitário de rolagem

// NOVO: Interface para o estado de edição temporária de dano
interface TemporaryDamageEdit {
  actionId: string;
  originalDamageDice: string;
  currentDamageDice: string; // O que o usuário está editando no input
}

interface CombatActionsProps {
  actions: CharacterAction[];
  onDeleteAction: (actionId: string) => void;
  onEditAction: (action: CharacterAction) => void;
  onToggleFavorite: (actionId: string, isFavorite: boolean) => void;
  availableTokens: Token[];
  onTokenSelected: (token: Token | null) => void;
}

const CombatActions: React.FC<CombatActionsProps> = ({ actions, onDeleteAction, onEditAction, onToggleFavorite, availableTokens, onTokenSelected }) => {
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedTargetTokenId, setSelectedTargetTokenId] = useState<number | null>(null);
  // NOVO: Estado para a edição temporária do dado de dano
  const [tempDamageEdit, setTempDamageEdit] = useState<TemporaryDamageEdit | null>(null);

  const selectedAction = useMemo(() => {
    const action = actions.find(action => action.id === selectedActionId);
    // Se a ação selecionada tiver dano, inicializa o tempDamageEdit
    if (action && action.effectCategory === 'damage' && action.damageDice && !tempDamageEdit) {
      setTempDamageEdit({
        actionId: action.id,
        originalDamageDice: action.damageDice,
        currentDamageDice: action.damageDice
      });
    } else if (action && (action.effectCategory !== 'damage' || !action.damageDice) && tempDamageEdit) {
      // Limpa se a ação não tem dano ou se mudou de ação
      setTempDamageEdit(null);
    }
    return action;
  }, [actions, selectedActionId, tempDamageEdit]);


  const favoriteActions = useMemo(() => {
    return actions.filter(action => action.isFavorite);
  }, [actions]);

  const handleSelectActionInTable = (action: CharacterAction) => {
    setSelectedActionId(action.id);
    setSelectedTargetTokenId(null);
    onTokenSelected(null);
    // Inicializa tempDamageEdit se a nova ação tiver dano
    if (action.effectCategory === 'damage' && action.damageDice) {
        setTempDamageEdit({
            actionId: action.id,
            originalDamageDice: action.damageDice,
            currentDamageDice: action.damageDice
        });
    } else {
        setTempDamageEdit(null);
    }
  };

  const handleTargetTokenSelect = (tokenId: number) => {
    setSelectedTargetTokenId(tokenId);
    const token = availableTokens.find(t => t.id === tokenId) || null;
    onTokenSelected(token);
  };

  // NOVO: Handler para mudar o dado de dano temporariamente
  const handleTempDamageDiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedAction && tempDamageEdit) {
      setTempDamageEdit(prev => prev ? { ...prev, currentDamageDice: e.target.value } : null);
    }
  };

  // NOVO: Função para realizar uma rolagem de ataque/salvamento
  const handleAttackRoll = (rollType: 'normal' | 'advantage' | 'disadvantage') => {
    if (!selectedAction) return;

    const targetToken = availableTokens.find(t => t.id === selectedTargetTokenId);
    const targetName = targetToken ? targetToken.name : "Alvo indefinido";

    let rollMessage = '';
    // Lógica para rolagem de ataque (geralmente d20 + modificador)
    // Para magias, muitas vezes é um teste de resistência do alvo.
    if (selectedAction.mainType === 'attack' || (selectedAction.mainType === 'spell' && !selectedAction.saveDC)) {
      const { roll1, roll2, result } = rollD20(rollType);
      const modifierText = selectedAction.mainType === 'attack' ? ' + ModAtk' : ''; // Exemplo, ajuste para o modificador real do ataque
      const extraInfo = rollType === 'advantage' ? 'com Vantagem' : rollType === 'disadvantage' ? 'com Desvantagem' : '';
      rollMessage = formatRollResult(result, `1d20${modifierText}`, 'Rolagem de Ataque', targetName, extraInfo);
    } else if (selectedAction.mainType === 'spell' && selectedAction.saveDC) {
      // Para magias com teste de resistência, você informaria a CD do teste.
      rollMessage = `Magia "${selectedAction.name}" requer ${selectedAction.saveDC} para ${targetName}.`;
    }

    alert(rollMessage);
    console.log(rollMessage);
  };

  // NOVO: Função para realizar uma rolagem de dano/cura
  const handleDamageRoll = () => {
    if (!selectedAction || selectedAction.effectCategory === 'utility') return;

    const targetToken = availableTokens.find(t => t.id === selectedTargetTokenId);
    const targetName = targetToken ? targetToken.name : "Alvo indefinido";

    let diceToRoll = '';
    let rollType = '';
    if (selectedAction.effectCategory === 'damage' && tempDamageEdit) {
      diceToRoll = tempDamageEdit.currentDamageDice;
      rollType = 'Dano';
    } else if (selectedAction.effectCategory === 'healing' && selectedAction.healingDice) {
      diceToRoll = selectedAction.healingDice;
      rollType = 'Cura';
    } else {
      return; // Nenhuma rolagem de dano/cura aplicável
    }

    try {
        const result = rollDice(diceToRoll);
        const message = formatRollResult(result, diceToRoll, rollType, targetName, selectedAction.damageType || '');
        alert(message);
        console.log(message);
    } catch (error) {
        alert(`Erro ao rolar ${rollType}: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`Erro ao rolar ${rollType} ${diceToRoll}:`, error);
    }
  };

  return (
    <div className="card custom-card-base combat-actions-table-card d-flex flex-column">
      <h5 className="card-title text-highlight-warning mb-3">Minhas Ações</h5>

      <div className="card-body p-0 flex-grow-1 overflow-auto">

        {actions.length === 0 ? (
          <p className="text-secondary-muted text-center py-3">Nenhuma ação salva ainda. Crie uma nova ação!</p>
        ) : (
          <table className="table table-dark table-striped table-hover table-sm action-list-table">
            <thead>
              <tr>
                <th scope="col" className="text-highlight-warning text-center">Nome</th>
                <th scope="col" className="text-highlight-warning text-center">Tipo</th>
                <th scope="col" className="text-highlight-warning text-center">Efeito</th>
                <th scope="col" className="text-highlight-warning text-center">Alcance</th>
                <th scope="col" className="text-highlight-warning text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {/* Favoritas primeiro */}
              {favoriteActions.map(action => (
                <tr
                  key={action.id}
                  className={`align-middle ${selectedActionId === action.id ? 'action-selected-row' : ''}`}
                  onClick={() => handleSelectActionInTable(action)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="text-light-base text-center">
                    {action.name}
                    <i className="bi bi-star-fill text-highlight-warning ms-1" title="Favorita"></i>
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
                  className={`align-middle ${selectedActionId === action.id ? 'action-selected-row' : ''}`}
                  onClick={() => handleSelectActionInTable(action)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="text-light-base text-center">{action.name}</td>
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

        {/* Detalhes da Ação Selecionada */}
        {selectedAction && (
          <div className="card custom-card-base p-3 mt-3 selected-action-detail-card flex-shrink-0">
            <h6 className="card-subtitle mb-2 text-highlight-warning">{selectedAction.name}</h6>
            <p className="mb-1 small">Tipo Principal: <strong>{selectedAction.mainType}</strong></p>
            <p className="mb-1 small">Categoria de Efeito: <strong>{selectedAction.effectCategory}</strong></p>

            {selectedAction.attackRange && <p className="mb-1 small">Alcance: {selectedAction.attackRange}</p>}
            {selectedAction.target && <p className="mb-1 small">Alvo: {selectedAction.target}</p>}

            {selectedAction.effectCategory === 'damage' && selectedAction.damageDice && (
                <p className="mb-1 small">Dano:
                    {tempDamageEdit && tempDamageEdit.actionId === selectedAction.id ? (
                        <input
                            type="text"
                            className="form-control-sm ms-2 inline-editable-input text-highlight-info"
                            value={tempDamageEdit.currentDamageDice}
                            onChange={handleTempDamageDiceChange}
                            onBlur={() => setTempDamageEdit(null)} // Sai do modo de edição ao perder foco
                            // onKeyDown pode ser adicionado aqui para salvar com Enter
                            autoFocus
                            style={{ width: '80px' }} // Ajuste de largura para o input de dano
                        />
                    ) : (
                        <strong
                            className="text-highlight-info ms-2"
                            onClick={() => selectedAction.effectCategory === 'damage' && selectedAction.damageDice && setTempDamageEdit({
                                actionId: selectedAction.id,
                                originalDamageDice: selectedAction.damageDice,
                                currentDamageDice: selectedAction.damageDice
                            })}
                            style={{ cursor: 'pointer' }}
                        >
                            {selectedAction.damageDice} {selectedAction.damageType || ''}
                        </strong>
                    )}
                </p>
            )}
            {selectedAction.effectCategory === 'healing' && selectedAction.healingDice && (
                <p className="mb-1 small">Cura: <strong className="text-highlight-success">{selectedAction.healingDice}</strong></p>
            )}
            {selectedAction.effectCategory === 'utility' && selectedAction.utilityTitle && (
                <p className="mb-1 small">Efeito: <strong className="text-highlight-info">{selectedAction.utilityTitle}</strong> {selectedAction.utilityValue && `(${selectedAction.utilityValue})`}</p>
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
            <div className="target-selection-section mb-3 mx-3 flex-shrink-0">
                <label className="form-label small text-secondary-muted">Selecionar Alvo:</label>
                {availableTokens.length === 0 ? (
                    <p className="text-secondary-muted small">Nenhum token disponível para alvo.</p>
                ) : (
                    <ul className="list-group custom-scroll" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {availableTokens.map(token => (
                            <li
                                key={token.id}
                                className={`list-group-item d-flex align-items-center bg-dark text-light-base border-secondary ${selectedTargetTokenId === token.id ? 'action-selected-row' : ''}`}
                                onClick={() => handleTargetTokenSelect(token.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                <img src={token.portraitUrl} alt={token.name} className="rounded-circle me-2" style={{ width: '30px', height: '30px', objectFit: 'cover' }}/>
                                <span className="flex-grow-1">{token.name}</span>
                                <small className="text-secondary-muted">HP: {token.currentHp}/{token.maxHp}</small>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )}
      </div>

      <div className="card-footer bg-transparent border-0 pt-3 flex-shrink-0 d-flex justify-content-center gap-2"> {/* Adicionado d-flex justify-content-center gap-2 */}
        {selectedAction && selectedAction.mainType !== 'utility' && ( /* Só mostra botões de ataque/dano se não for utilidade */
            <>
                <button className="btn btn-primary btn-sm" onClick={() => handleAttackRoll('normal')}>
                    Ataque Normal <i className="bi bi-dice-5-fill ms-1"></i>
                </button>
                <button className="btn btn-success btn-sm" onClick={() => handleAttackRoll('advantage')}>
                    Vantagem <i className="bi bi-dice-5-fill ms-1"></i>
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleAttackRoll('disadvantage')}>
                    Desvantagem <i className="bi bi-dice-5-fill ms-1"></i>
                </button>
            </>
        )}
        {selectedAction && (selectedAction.effectCategory === 'damage' || selectedAction.effectCategory === 'healing') && (
            <button className="btn btn-info btn-sm" onClick={handleDamageRoll}>
                Rolar Dano <i className="bi bi-dice-6-fill ms-1"></i>
            </button>
        )}
      </div>
    </div>
  );
};

export default CombatActions;