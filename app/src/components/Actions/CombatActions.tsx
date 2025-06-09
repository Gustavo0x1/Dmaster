// src/components/CombatInterface/CombatActions.tsx
import React, { useState } from 'react';
import { CharacterAction, Token } from '../../types';
import SimpleAlertModal from '../modals/SimpleAlert';
import ConfirmationModal from '../modals/ConfirmationModal';

interface CombatActionsProps {
  actions: CharacterAction[];
  onDeleteAction: (actionId: number) => void;
  onEditAction: (action: CharacterAction) => void;
  onToggleFavorite: (isFavorite: boolean, actionId?: number) => void;
  selectedTokens?: Token[];
  availableTokens?: Token[];
  onTokenSelected?: (token: Token | null) => void;
}

// Interface para um bloco de dano
interface DamageBlock {
  id: number;
  type: 'dice' | 'modifier'; // 'dice' para rolagem de dados, 'modifier' para valor fixo
  value: string; // O valor do dado (ex: "1d20", "2d6") ou do modificador (ex: "5", "-2")
}

const CombatActions: React.FC<CombatActionsProps> = ({
  actions,
  onDeleteAction,
  onEditAction,
  onToggleFavorite,
  selectedTokens,
  availableTokens,
  onTokenSelected,
}) => {
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalTitle, setAlertModalTitle] = useState('');
  const [alertModalMessage, setAlertModalMessage] = useState<string | React.ReactNode>('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState<string | React.ReactNode>('');
  const [confirmModalOnConfirm, setConfirmModalOnConfirm] = useState<(() => void) | undefined>(undefined);

  const [expandedActionId, setExpandedActionId] = useState<number | null>(null);

  // Estados para o gerenciador de fórmula de dano por blocos
  const [damageBlocks, setDamageBlocks] = useState<DamageBlock[]>([
    { id: 1, type: 'dice', value: '1d20' } // Bloco inicial padrão de 1d20
  ]);
  const [nextBlockId, setNextBlockId] = useState<number>(2); // Próximo ID disponível para novos blocos

  // Estados para vantagem e desvantagem
  const [useAdvantage, setUseAdvantage] = useState<boolean>(false);
  const [useDisadvantage, setUseDisadvantage] = useState<boolean>(false);

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

  // --- Funções para Gerenciamento de Blocos de Dano ---
  const addDamageBlock = (type: 'dice' | 'modifier', initialValue: string = '') => {
    setDamageBlocks(prevBlocks => [
      ...prevBlocks,
      { id: nextBlockId, type, value: initialValue }
    ]);
    setNextBlockId(prevId => prevId + 1);
  };

  const updateDamageBlock = (id: number, newValue: string) => {
    setDamageBlocks(prevBlocks =>
      prevBlocks.map(block =>
        block.id === id ? { ...block, value: newValue } : block
      )
    );
  };

  const removeDamageBlock = (id: number) => {
    setDamageBlocks(prevBlocks => prevBlocks.filter(block => block.id !== id));
  };

  // --- Função Auxiliar para Rolagem de Dados e Cálculos ---
  const rollDice = (blocks: DamageBlock[], advantage: boolean, disadvantage: boolean): { total: number, rollsDetail: string, formulaString: string } => {
    let totalDamage = 0;
    let rollsDetail: string[] = [];
    let formulaParts: string[] = [];

    blocks.forEach(block => {
      formulaParts.push(block.value); // Para a string da fórmula final

      if (block.type === 'dice') {
        const diceMatch = block.value.trim().match(/^(\d*)d(\d+)$/i); // Captura "1d6", "d20", "2d4"

        if (diceMatch) {
          const numDice = parseInt(diceMatch[1] || '1'); // Padrão para 1 se não especificado (e.g., 'd20')
          const dieSize = parseInt(diceMatch[2]);

          if (isNaN(numDice) || isNaN(dieSize) || dieSize <= 0) {
            rollsDetail.push(`[Dado Inválido: ${block.value}]`);
            return;
          }

          let currentBlockRolls: number[] = [];
          if (advantage || disadvantage) {
            // Para vantagem/desvantagem, rola o primeiro dado 'numDice' vezes, e depois escolhe o melhor/pior para o *total* do bloco
            // Nota: Uma rolagem mais robusta para 2d6 com vantagem, por exemplo, faria 2d6 duas vezes e pegaria o total maior.
            // Esta implementação simplifica para rolar 'numDice' vezes e aplicar vantagem/desvantagem *individualmente* a cada dado
            // ou ao primeiro dado para uma abordagem mais simples de rolagem de ataque.
            // Para o objetivo atual, vamos aplicar vantagem/desvantagem à rolagem principal (o primeiro dado, se 'numDice' > 1)
            // ou a cada dado individualmente se quisermos a complexidade extra.
            // Aqui, simplificamos: se tiver vantagem/desvantagem, rola 2 vezes e escolhe para CADA dado no bloco.
            let sumOfBlockRolls = 0;
            let detailForThisBlock: string[] = [];

            for (let i = 0; i < numDice; i++) {
                const roll1 = Math.floor(Math.random() * dieSize) + 1;
                const roll2 = Math.floor(Math.random() * dieSize) + 1;
                let chosenRoll = 0;

                if (advantage) {
                    chosenRoll = Math.max(roll1, roll2);
                    detailForThisBlock.push(`${chosenRoll} (${roll1},${roll2} V)`);
                } else { // disadvantage
                    chosenRoll = Math.min(roll1, roll2);
                    detailForThisBlock.push(`${chosenRoll} (${roll1},${roll2} D)`);
                }
                sumOfBlockRolls += chosenRoll;
            }
            totalDamage += sumOfBlockRolls;
            rollsDetail.push(`[${block.value}: ${detailForThisBlock.join(' + ')}]`);

          } else {
            let sumOfBlockRolls = 0;
            let detailForThisBlock: string[] = [];
            for (let i = 0; i < numDice; i++) {
              const roll = Math.floor(Math.random() * dieSize) + 1;
              currentBlockRolls.push(roll);
              sumOfBlockRolls += roll;
              detailForThisBlock.push(`${roll}`);
            }
            totalDamage += sumOfBlockRolls;
            rollsDetail.push(`[${block.value}: ${detailForThisBlock.join('+')}]`);
          }
        } else {
          rollsDetail.push(`[Formato de Dado Inválido: ${block.value}]`);
        }
      } else if (block.type === 'modifier') {
        const modifier = parseInt(block.value.trim());
        if (!isNaN(modifier)) {
          totalDamage += modifier;
          rollsDetail.push(`[Modificador: ${modifier}]`);
        } else {
          rollsDetail.push(`[Modificador Inválido: ${block.value}]`);
        }
      }
    });

    return { total: totalDamage, rollsDetail: rollsDetail.join(' '), formulaString: formulaParts.join(' + ') };
  };

  // --- Manipulador para Usar Ação ---
  const handleUseAction = (action: CharacterAction) => {
    if (!selectedTokens || selectedTokens.length === 0) {
      openAlertModal("Nenhum Alvo Selecionado", "Por favor, selecione um ou mais alvos.");
      return;
    }

    let effectMessage = `Ação "${action.name}" aplicada a: `;
    selectedTokens.forEach(token => {
      if (action.effectCategory === 'damage') {
        const { total: damage, rollsDetail, formulaString } = rollDice(damageBlocks, useAdvantage, useDisadvantage);
        effectMessage += `\n- ${token.name} sofre ${damage} de ${action.damageType || 'dano'}.` +
                         ` (Fórmula: ${formulaString}, Detalhes: ${rollsDetail})`;
      } else if (action.effectCategory === 'healing' && action.healingDice) {
        // Para cura, usa o healingDice da ação, não o gerenciador de fórmula de dano
        const healingRollSize = parseInt(action.healingDice.replace('d', ''));
        const healing = Math.floor(Math.random() * healingRollSize) + 1;
        effectMessage += `\n- ${token.name} cura ${healing} HP (baseado em ${action.healingDice})`;
      } else if (action.effectCategory === 'utility' && action.utilityTitle) {
        effectMessage += `\n- ${token.name} recebe o efeito: "${action.utilityTitle}"`;
      } else {
        effectMessage += `\n- ${token.name} (Efeito desconhecido)`;
      }
    });
    openAlertModal("Ação Aplicada!", effectMessage);
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

  return (
    <div className="combat-actions-container h-100 p-3">
      <h4 className="text-white text-center mb-3">Ações de Combate</h4>
      <hr className="border-secondary mb-4" />

      {/* Seção do Gerenciador de Fórmula de Dano por Blocos */}
      <div className="mb-4 p-3 border border-secondary rounded bg-dark-subtle">
        <h5 className="text-highlight-warning mb-3 text-center">Construir Fórmula de Dano</h5>

        {/* Exibição e Edição dos Blocos da Fórmula */}
        <div className="d-flex flex-wrap align-items-center mb-3">
          {damageBlocks.length === 0 ? (
            <p className="text-muted small w-100 text-center">Adicione blocos para construir sua fórmula de dano.</p>
          ) : (
            damageBlocks.map((block, index) => (
              <React.Fragment key={block.id}>
                {index > 0 && <span className="text-white mx-1">+</span>} {/* Adiciona '+' entre os blocos */}
                <div className="d-flex align-items-center me-2 mb-2 p-2 border border-info rounded bg-dark-subtle">
                  {block.type === 'dice' ? (
                    <span className="me-1 text-light-base small">Dado:</span>
                  ) : (
                    <span className="me-1 text-light-base small">Mod:</span>
                  )}
                  <input
                    type="text"
                    className="form-control form-control-sm bg-dark text-white border-secondary"
                    style={{ width: '80px' }}
                    value={block.value}
                    onChange={(e) => updateDamageBlock(block.id, e.target.value)}
                    placeholder={block.type === 'dice' ? '1d6' : '3'}
                  />
                  <button
                    className="btn btn-sm btn-outline-danger ms-2"
                    onClick={() => removeDamageBlock(block.id)}
                    title="Remover Bloco"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              </React.Fragment>
            ))
          )}
        </div>

        {/* Botões para Adicionar Novos Blocos */}
        <div className="d-flex justify-content-around mb-3">
          <button
            className="btn btn-sm btn-outline-info me-2 flex-grow-1"
            onClick={() => addDamageBlock('dice', '1d6')}
          >
            <i className="bi bi-dice-5 me-2"></i> Adicionar Dado
          </button>
          <button
            className="btn btn-sm btn-outline-info flex-grow-1"
            onClick={() => addDamageBlock('modifier', '1')}
          >
            <i className="bi bi-plus-circle me-2"></i> Adicionar Modificador
          </button>
        </div>

        {/* Controles de Vantagem/Desvantagem */}
        <div className="d-flex justify-content-around mb-3">
          <button
            className={`btn ${useAdvantage ? 'btn-success' : 'btn-outline-success'} flex-grow-1 me-2`}
            onClick={() => {
              setUseAdvantage(prev => !prev);
              if (!useAdvantage) setUseDisadvantage(false); // Desativa desvantagem se vantagem for ativada
            }}
          >
            <i className="bi bi-arrow-up-circle-fill me-2"></i>
            {useAdvantage ? 'Vantagem Ativa' : 'Vantagem'}
          </button>
          <button
            className={`btn ${useDisadvantage ? 'btn-danger' : 'btn-outline-danger'} flex-grow-1 ms-2`}
            onClick={() => {
              setUseDisadvantage(prev => !prev);
              if (!useDisadvantage) setUseAdvantage(false); // Desativa vantagem se desvantagem for ativada
            }}
          >
            <i className="bi bi-arrow-down-circle-fill me-2"></i>
            {useDisadvantage ? 'Desvantagem Ativa' : 'Desvantagem'}
          </button>
        </div>
      </div>
      {/* Fim da Seção do Gerenciador de Blocos */}

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