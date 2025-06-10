// src/components/CombatInterface/CombatActions.tsx
import React, { useState, useEffect, useRef } from 'react';
import { CharacterAction, Token } from '../../types';
import SimpleAlertModal from '../modals/SimpleAlert';
import ConfirmationModal from '../modals/ConfirmationModal';
import '../../css/Actions/CombatActions.css'
interface CombatActionsProps {
  actions: CharacterAction[];
  onDeleteAction: (actionId: number) => void;
  onEditAction: (action: CharacterAction) => void;
  onToggleFavorite: (isFavorite: boolean, actionId?: number) => void;
  selectedTokens?: Token[];
  availableTokens?: Token[];
  onTokenSelected?: (token: Token | null) => void;
  onRenderDamageFormula: (formulaJSX: React.ReactNode) => void;
  onRenderHitFormula: (formulaJSX: React.ReactNode) => void;
}

// Interface para um bloco de dano ou acerto
interface FormulaBlock {
  id: number;
  type: 'dice' | 'modifier';
  value: string;
}

const CombatActions: React.FC<CombatActionsProps> = ({
  actions,
  onDeleteAction,
  onEditAction,
  onToggleFavorite,
  selectedTokens,
  availableTokens,
  onTokenSelected,
  onRenderDamageFormula,
  onRenderHitFormula,
}) => {
  const electron = (window as any).electron
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalTitle, setAlertModalTitle] = useState('');
  const [alertModalMessage, setAlertModalMessage] = useState<string | React.ReactNode>('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState<string | React.ReactNode>('');
  const [confirmModalOnConfirm, setConfirmModalOnConfirm] = useState<(() => void) | undefined>(undefined);

  const [expandedActionId, setExpandedActionId] = useState<number | null>(null);

  // Estados para o gerenciador de fórmula de dano por blocos
  const [damageBlocks, setDamageBlocks] = useState<FormulaBlock[]>([
    { id: 1, type: 'dice', value: '1d20' }
  ]);
  const [nextDamageBlockId, setNextDamageBlockId] = useState<number>(2);

  // Estados para o gerenciador de fórmula de acerto por blocos
  const [hitBlocks, setHitBlocks] = useState<FormulaBlock[]>([
    { id: 1, type: 'dice', value: '1d20' }
  ]);
  const [nextHitBlockId, setNextHitBlockId] = useState<number>(2);
  const [fixedHitValue, setFixedHitValue] = useState<string>('');
  const [useFixedHitValue, setUseFixedHitValue] = useState<boolean>(false);

  // Estados para vantagem e desvantagem (aplicáveis ao acerto)
  const [useAdvantage, setUseAdvantage] = useState<boolean>(false);
  const [useDisadvantage, setUseDisadvantage] = useState<boolean>(false);

  // Removido: minimumHitToRollDamage agora vem da CA do token

  // --- Funções de controle de Modal ---
  const openAlertModal = (title: string, message: string | React.ReactNode) => {
    setAlertModalTitle(title);
    setAlertModalMessage(message);
    setShowAlertModal(true);
  };

  const closeAlertModal = () => {
    setShowAlertModal(false);
    setAlertModalTitle('');
    setAlertModalMessage('');
  };

  const openConfirmModal = (
    title: string,
    message: string | React.ReactNode,
    onConfirm: (() => void) | undefined
  ) => {
    setConfirmModalTitle(title);
    setConfirmModalMessage(message);
    setConfirmModalOnConfirm(() => onConfirm);
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setConfirmModalTitle('');
    setConfirmModalMessage('');
    setConfirmModalOnConfirm(undefined);
  };

  // --- Funções para Gerenciamento de Blocos ---
  const addBlock = (setBlocks: React.Dispatch<React.SetStateAction<FormulaBlock[]>>, setNextId: React.Dispatch<React.SetStateAction<number>>, type: 'dice' | 'modifier', initialValue: string = '') => {
    // Get the current nextId value, then immediately update it for the next call
    setNextId(prevId => {
      const newId = prevId; // Use the current value as the ID for the new block
      setBlocks(prevBlocks => [
        ...prevBlocks,
        { id: newId, type, value: initialValue }
      ]);
      return prevId + 1; // Increment for the next block
    });
  };


  const updateBlock = (setBlocks: React.Dispatch<React.SetStateAction<FormulaBlock[]>>, id: number, newValue: string) => {
    setBlocks(prevBlocks =>
      prevBlocks.map(block =>
        block.id === id ? { ...block, value: newValue } : block
      )
    );
  };

  const removeBlock = (setBlocks: React.Dispatch<React.SetStateAction<FormulaBlock[]>>, id: number) => {
    setBlocks(prevBlocks => prevBlocks.filter(block => block.id !== id));
  };


  // --- Função Auxiliar para Rolagem de Dados e Cálculos ---
  const rollFormula = (blocks: FormulaBlock[], advantage: boolean, disadvantage: boolean): { total: number, rollsDetail: string, formulaString: string } => {
    let total = 0;
    let rollsDetail: string[] = [];
    let formulaParts: string[] = [];

    blocks.forEach(block => {
      formulaParts.push(block.value);

      if (block.type === 'dice') {
        const diceMatch = block.value.trim().match(/^(\d*)d(\d+)$/i);

        if (diceMatch) {
          const numDice = parseInt(diceMatch[1] || '1');
          const dieSize = parseInt(diceMatch[2]);

          if (isNaN(numDice) || isNaN(dieSize) || dieSize <= 0) {
            rollsDetail.push(`[Dado Inválido: ${block.value}]`);
            return;
          }

          let sumOfBlockRolls = 0;
          let detailForThisBlock: string[] = [];

          if (advantage || disadvantage) {
            for (let i = 0; i < numDice; i++) {
              const roll1 = Math.floor(Math.random() * dieSize) + 1;
              const roll2 = Math.floor(Math.random() * dieSize) + 1;
              let chosenRoll = 0;

              if (advantage) {
                chosenRoll = Math.max(roll1, roll2);
                detailForThisBlock.push(`${chosenRoll} (${roll1},${roll2} V)`);
              } else {
                chosenRoll = Math.min(roll1, roll2);
                detailForThisBlock.push(`${chosenRoll} (${roll1},${roll2} D)`);
              }
              sumOfBlockRolls += chosenRoll;
            }
            total += sumOfBlockRolls;
            rollsDetail.push(`[${block.value}: ${detailForThisBlock.join(' + ')}]`);

          } else {
            for (let i = 0; i < numDice; i++) {
              const roll = Math.floor(Math.random() * dieSize) + 1;
              sumOfBlockRolls += roll;
              detailForThisBlock.push(`${roll}`);
            }
            total += sumOfBlockRolls;
            rollsDetail.push(`[${block.value}: ${detailForThisBlock.join('+')}]`);
          }
        } else {
          rollsDetail.push(`[Formato de Dado Inválido: ${block.value}]`);
        }
      } else if (block.type === 'modifier') {
        const modifier = parseInt(block.value.trim());
        if (!isNaN(modifier)) {
          total += modifier;
          rollsDetail.push(`[Modificador: ${modifier}]`);
        } else {
          rollsDetail.push(`[Modificador Inválido: ${block.value}]`);
        }
      }
    });

    return { total: total, rollsDetail: rollsDetail.join(' '), formulaString: formulaParts.join(' + ') };
  };

  // --- Manipulador para Usar Ação ---
  const handleUseAction = (action: CharacterAction) => {
    if (!selectedTokens || selectedTokens.length === 0) {
      openAlertModal("Nenhum Alvo Selecionado", "Por favor, selecione um ou mais alvos.");
      return;
    }

    let overallMessage = `Ação "${action.name}" aplicada a: `;

    selectedTokens.forEach(token => {
      let hitRollResult: { total: number, rollsDetail: string, formulaString: string };
      let finalHitValue: number;

      if (useFixedHitValue && fixedHitValue !== '') {
        const parsedFixedValue = parseInt(fixedHitValue);
        if (!isNaN(parsedFixedValue)) {
          finalHitValue = parsedFixedValue;
          hitRollResult = { total: parsedFixedValue, rollsDetail: `[Valor Fixo: ${parsedFixedValue}]`, formulaString: `${parsedFixedValue}` };
        } else {
          overallMessage += `\n- ${token.name}: Valor Fixo de Acerto Inválido.`;
          return;
        }
      } else {
        hitRollResult = rollFormula(hitBlocks, useAdvantage, useDisadvantage);
        finalHitValue = hitRollResult.total;
      }

      // NOVO: O mínimo para acerto é a CA do token
      const minimumHitToRollDamage = token.ac || 0; // Se a AC não estiver definida, usa 0 como fallback

      overallMessage += `\n- ${token.name} (AC: ${token.ac || 'N/A'}): Rolagem de Acerto: ${finalHitValue}` +
        ` (Fórmula: ${hitRollResult.formulaString}, Detalhes: ${hitRollResult.rollsDetail}).`;

      if (finalHitValue >= minimumHitToRollDamage) {
        if (action.effectCategory === 'damage') {
          const { total: damage, rollsDetail: damageRollsDetail, formulaString: damageFormulaString } = rollFormula(damageBlocks, false, false);
          overallMessage += `\n  ACERTO! Causa ${damage} de ${action.damageType || 'dano'}.` +
            ` (Fórmula: ${damageFormulaString}, Detalhes: ${damageRollsDetail})`;
        } else if (action.effectCategory === 'healing' && action.healingDice) {
          const healingRollSize = parseInt(action.healingDice.replace('d', ''));
          const healing = Math.floor(Math.random() * healingRollSize) + 1;
          overallMessage += `\n  ACERTO! ${token.name} cura ${healing} HP (baseado em ${action.healingDice})`;
        } else if (action.effectCategory === 'utility' && action.utilityTitle) {
          overallMessage += `\n  ACERTO! ${token.name} recebe o efeito: "${action.utilityTitle}"`;
        } else {
          overallMessage += `\n  ACERTO! ${token.name} (Efeito desconhecido)`;
        }
      } else {
        overallMessage += `\n  ERROU! (Acerto ${finalHitValue} < AC ${minimumHitToRollDamage})`;
      }
    });
    openAlertModal("Ação Aplicada!", overallMessage);
  };

  // --- Manipuladores de Exclusão e Expansão ---
  const handleConfirmDelete = (actionId?: number) => {
    if (actionId === undefined) {
      return;
    }
    openConfirmModal(
      "Confirmar Exclusão",
      "Tem certeza que deseja excluir esta ação? Esta ação não pode ser desfeita.",
      () => onDeleteAction(actionId)
    );
  };

  const handleToggleExpandAction = (actionIdParam?: number) => {
    const finalActionId: number | null = actionIdParam === undefined ? null : actionIdParam;
    setExpandedActionId(prevId => (prevId === finalActionId ? null : finalActionId));
  };

  // NEW: Effect to send the Hit Formula JSX to the parent
  useEffect(() => {
    const hitFormulaJSX = (
      <div className="compact-formula-card mb-3 p-2 border border-secondary rounded bg-dark-subtle">
        <h6 className="text-highlight-warning mb-2 text-center">Fórmula de ACERTO</h6>

        {/* Controles de Vantagem/Desvantagem/Valor Fixo */}
        <div className="d-flex justify-content-around mb-2 flex-wrap">
          <button
            className={`btn btn-sm ${useAdvantage ? 'btn-success' : 'btn-outline-success'} flex-grow-1 me-1 mb-1`}
            onClick={() => {
              setUseAdvantage((prev: boolean) => !prev);
              if (!useAdvantage) {
                setUseDisadvantage(false);
                setUseFixedHitValue(false);
              }
            }}
          >
            <i className="bi bi-arrow-up-circle-fill me-1"></i>
            {useAdvantage ? 'Vantagem Ativa' : 'Vantagem'}
          </button>
          <button
            className={`btn btn-sm ${useDisadvantage ? 'btn-danger' : 'btn-outline-danger'} flex-grow-1 ms-1 mb-1`}
            onClick={() => {
              setUseDisadvantage((prev: boolean) => !prev);
              if (!useDisadvantage) {
                setUseAdvantage(false);
                setUseFixedHitValue(false);
              }
            }}
          >
            <i className="bi bi-arrow-down-circle-fill me-1"></i>
            {useDisadvantage ? 'Desvantagem Ativa' : 'Desvantagem'}
          </button>
        </div>
        <div className="mb-2">
          <div className="form-check form-switch d-flex align-items-center justify-content-center">
            <input
              className="form-check-input me-2"
              type="checkbox"
              id="useFixedHitValueSwitch"
              checked={useFixedHitValue}
              onChange={() => {
                setUseFixedHitValue(prev => !prev);
                if (!useFixedHitValue) {
                  setUseAdvantage(false);
                  setUseDisadvantage(false);
                }
              }}
            />
            <label className="form-check-label text-light-base small" htmlFor="useFixedHitValueSwitch">
              Usar Valor Fixo
            </label>
          </div>
          {useFixedHitValue && (
            <input
              type="number"
              className="form-control form-control-sm bg-dark text-white border-secondary mt-1 text-center"
              placeholder="Valor Fixo"
              value={fixedHitValue}
              onChange={(e) => setFixedHitValue(e.target.value)}
            />
          )}
        </div>

        {/* Exibição e Edição dos Blocos da Fórmula de Acerto (visível apenas se não usar valor fixo) */}
        {!useFixedHitValue && (
          <>
            <div className="d-flex flex-nowrap overflow-auto hide-scrollbar mb-2 p-1 border-top border-bottom border-secondary">
              {hitBlocks.length === 0 ? (
                <p className="text-muted small w-100 text-center my-auto">Adicione blocos de acerto.</p>
              ) : (
                hitBlocks.map((block, index) => (
                  <div key={block.id} className="d-flex align-items-center me-1 p-1 border border-info rounded bg-dark-subtle flex-shrink-0">
                    <span className="me-1 text-light-base small">{block.type === 'dice' ? 'D:' : 'M:'}</span>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-dark text-white border-secondary formula-input"
                      value={block.value}
                      onChange={(e) => updateBlock(setHitBlocks, block.id, e.target.value)}
                      placeholder={block.type === 'dice' ? '1d20' : '5'}
                    />
                    <button
                      className="btn btn-sm btn-outline-danger ms-1 formula-btn"
                      onClick={() => removeBlock(setHitBlocks, block.id)}
                      title="Remover Bloco"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Botões para Adicionar Novos Blocos de Acerto */}
            <div className="d-flex justify-content-around">
              <button
                className="btn btn-sm btn-outline-info me-1 flex-grow-1"
                onClick={() => addBlock(setHitBlocks, setNextHitBlockId, 'dice', '1d20')}
              >
                <i className="bi bi-dice-5 me-1"></i> Dado
              </button>
              <button
                className="btn btn-sm btn-outline-info ms-1 flex-grow-1"
                onClick={() => addBlock(setHitBlocks, setNextHitBlockId, 'modifier', '1')}
              >
                <i className="bi bi-plus-circle me-1"></i> Mod
              </button>
            </div>
          </>
        )}
      </div>
    );
    onRenderHitFormula(hitFormulaJSX);
  }, [hitBlocks, nextHitBlockId, useAdvantage, useDisadvantage, useFixedHitValue, fixedHitValue, onRenderHitFormula]);

  // Effect to send the damage formula JSX to the parent
  useEffect(() => {
    const damageFormulaJSX = (
      <div className="compact-formula-card mb-3 p-2 border border-secondary rounded bg-dark-subtle">
        <h6 className="text-highlight-warning mb-2 text-center">Fórmula de DANO</h6>

        {/* Exibição e Edição dos Blocos da Fórmula */}
        <div className="d-flex flex-nowrap overflow-auto hide-scrollbar mb-2 p-1 border-top border-bottom border-secondary">
          {damageBlocks.length === 0 ? (
            <p className="text-muted small w-100 text-center my-auto">Adicione blocos de dano.</p>
          ) : (
            damageBlocks.map((block, index) => (
              <div key={block.id} className="d-flex align-items-center me-1 p-1 border border-info rounded bg-dark-subtle flex-shrink-0">
                <span className="me-1 text-light-base small">{block.type === 'dice' ? 'D:' : 'M:'}</span>
                <input
                  type="text"
                  className="form-control form-control-sm bg-dark text-white border-secondary formula-input"
                  value={block.value}
                  onChange={(e) => updateBlock(setDamageBlocks, block.id, e.target.value)}
                  placeholder={block.type === 'dice' ? '1d6' : '3'}
                />
                <button
                  className="btn btn-sm btn-outline-danger ms-1 formula-btn"
                  onClick={() => removeBlock(setDamageBlocks, block.id)}
                  title="Remover Bloco"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Botões para Adicionar Novos Blocos */}
        <div className="d-flex justify-content-around">
          <button
            className="btn btn-sm btn-outline-info me-1 flex-grow-1"
            onClick={() => addBlock(setDamageBlocks, setNextDamageBlockId, 'dice', '1d6')}
          >
            <i className="bi bi-dice-5 me-1"></i> Dado
          </button>
          <button
            className="btn btn-sm btn-outline-info ms-1 flex-grow-1"
            onClick={() => addBlock(setDamageBlocks, setNextDamageBlockId, 'modifier', '1')}
          >
            <i className="bi bi-plus-circle me-1"></i> Mod
          </button>
        </div>
      </div>
    );
    onRenderDamageFormula(damageFormulaJSX);
  }, [damageBlocks, nextDamageBlockId, onRenderDamageFormula]);

  return (
    <div className="combat-actions-container h-100 p-3">
      <h4 className="text-white text-center mb-3">Ações de Combate</h4>
      <hr className="border-secondary mb-4" />

      {actions.length === 0 ? (
        <p className="text-muted text-center">Nenhuma ação disponível. Crie uma nova ação na Ficha de Personagem.</p>
      ) : (
        <div className="table-responsive custom-scroll" style={{ maxHeight: 'calc(100vh - 500px)', overflowY: 'auto' }}>
          <table className="table table-dark table-striped table-hover table-sm action-list-table">
            <thead>
              <tr>
                <th scope="col" className="text-highlight-warning text-center">Nome</th>
                <th scope="col" className="text-highlight-warning text-center">Ações</th>
                <th scope="col" className="text-highlight-warning text-center"></th>
              </tr>
            </thead>
            <tbody>
              {actions.map(action => (
                <React.Fragment key={action.id}>
                  <tr
                    className="align-middle"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggleExpandAction(action.id)}
                  >
                    <td className="text-light-base text-start">
                      {action.name}
                      {action.isFavorite ? (
                        <i
                          className="bi bi-star-fill text-highlight-warning ms-2"
                          title="Desfavoritar"
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(false, action.id); }}
                          style={{ cursor: 'pointer' }}
                        ></i>
                      ) : (
                        <i
                          className="bi bi-star text-secondary-muted ms-2"
                          title="Favoritar"
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(true, action.id); }}
                          style={{ cursor: 'pointer' }}
                        ></i>
                      )}
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-danger me-1" onClick={(e) => { e.stopPropagation(); handleConfirmDelete(action.id); }}>
                        <i className="bi bi-trash"></i> Del
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleUseAction(action); }}
                      >
                        Usar
                      </button>
                        <button
    className="btn btn-secondary btn-sm"
    onClick={(e) => {
      e.stopPropagation();
      const messageToDisplay = `__actioncard: name:${action.name}, type:${action.mainType}, effectCategory:${action.effectCategory}, description:${action.description || ''}`;
      // Chama a função de envio de mensagem do chat via Electron
      // Assumindo que `electron` está disponível e `send-message` aceita a string e um ID de remetente.
      if (electron && electron.invoke) {
          electron.invoke("send-message", messageToDisplay, -1); // -1 para sistema
      } else {
          console.warn("Electron API não disponível para enviar mensagem de habilidade.");
          // Opcional: openAlertModal para notificar o usuário sobre o erro
      }
    }}
    title="Mostrar no Chat"
  >
    <i className="bi bi-chat-dots"></i> {/* Ícone de comentário */}
  </button>
                    </td>
                    <td className="text-center">
                      <i className={`bi ${expandedActionId === action.id ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                    </td>
                  </tr>
                  {expandedActionId === action.id && (
                    <tr>
                      <td colSpan={3} className="expanded-action-details p-3">
                        <div className="card custom-card-base p-3 text-light-base">
                          <p className="mb-1 small">Tipo Principal: <strong>{action.mainType}</strong></p>
                          <p className="mb-1 small">Categoria de Efeito: <strong>{action.effectCategory}</strong></p>
                          {action.attackRange && <p className="mb-1 small">Alcance: {action.attackRange}</p>}
                          {action.range && action.mainType === 'spell' && <p className="mb-1 small">Alcance: {action.range}</p>}
                          {action.target && <p className="mb-1 small">Alvo: {action.target}</p>}
                          {action.effectCategory === 'damage' && action.damageDice && <p className="mb-1 small">Dano (Padrão da Ação): <strong className="text-highlight-warning">{action.damageDice} {action.damageType || ''}</strong></p>}
                          {action.effectCategory === 'healing' && action.healingDice && <p className="mb-1 small">Cura: <strong className="text-highlight-success">{action.healingDice}</strong></p>}
                          {action.effectCategory === 'utility' && action.utilityTitle && <p className="mb-1 small">Efeito: <strong className="text-highlight-info">{action.utilityTitle}</strong> {action.utilityValue && `(${action.utilityValue})`}</p>}
                          {action.mainType === 'attack' && action.properties && action.properties.length > 0 && (
                            <p className="mb-1 small">Propriedades: {action.properties.join(', ')}</p>
                          )}
                          {action.mainType === 'spell' && (
                            <>
                              {action.level !== undefined && <p className="mb-1 small">Nível: {action.level}</p>}
                              {action.castingTime && <p className="mb-1 small">Tempo de Conjuração: {action.castingTime}</p>}
                              {action.duration && <p className="mb-1 small">Duração: {action.duration}</p>}
                              {action.school && <p className="mb-1 small">Escola: {action.school}</p>}
                              {action.saveDC && <p className="mb-1 small">Teste de Resistência: {action.saveDC}</p>}
                            </>
                          )}
                          {action.description && <p className="mb-0 small">Descrição: {action.description}</p>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SimpleAlertModal
        show={showAlertModal}
        title={alertModalTitle}
        message={alertModalMessage}
        onClose={closeAlertModal}
      />
      <ConfirmationModal
        show={showConfirmModal}
        title={confirmModalTitle}
        message={confirmModalMessage}
        onConfirm={confirmModalOnConfirm}
        onClose={closeConfirmModal}
        showCancelButton={true}
        confirmButtonText="Confirmar"
      />
    </div>
  );
};

export default CombatActions;