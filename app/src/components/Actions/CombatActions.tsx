// src/components/CombatInterface/CombatActions.tsx
import React, { useState } from 'react';
import { CharacterAction, Token } from '../../types';
import SimpleAlertModal from '../modals/SimpleAlert';
import ConfirmationModal from '../modals/ConfirmationModal';

interface CombatActionsProps {
  actions: CharacterAction[];
  onDeleteAction: (actionId: number) => void;
  onEditAction: (action: CharacterAction) => void;
  onToggleFavorite: (isFavorite: boolean,actionId?: number) => void;
  selectedTokens?: Token[];
  availableTokens?: Token[];
  onTokenSelected?: (token: Token | null) => void;
}
interface CharacterActionWithId extends CharacterAction {
    id?: number; // The ID is now number | undefined in ActionCreator.tsx
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
   const [actionToEdit, setActionToEdit] = useState<CharacterActionWithId | null>(null); // Corrected type
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState<string | React.ReactNode>('');
  const [confirmModalOnConfirm, setConfirmModalOnConfirm] = useState<(() => void) | undefined>(undefined);

  const [expandedActionId, setExpandedActionId] = useState<number | null>(null); // State for expanded action

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

  const handleUseAction = (action: CharacterAction) => {
    if (!selectedTokens || selectedTokens.length === 0) {
      openAlertModal("Nenhum Alvo Selecionado", "Por favor, selecione um ou mais alvos.");
      return;
    }

    let effectMessage = `Ação "${action.name}" aplicada a: `;
    selectedTokens.forEach(token => {
      if (action.effectCategory === 'damage' && action.damageDice) {
        const damage = Math.floor(Math.random() * 6) + 1;
        effectMessage += `\n- ${token.name} sofre ${action.damageDice} (${damage} de ${action.damageType || 'dano'})`;
      } else if (action.effectCategory === 'healing' && action.healingDice) {
        const healing = Math.floor(Math.random() * 4) + 1;
        effectMessage += `\n- ${token.name} cura ${healing} HP (baseado em ${action.healingDice})`;
      } else if (action.effectCategory === 'utility' && action.utilityTitle) {
        effectMessage += `\n- ${token.name} recebe o efeito: "${action.utilityTitle}"`;
      } else {
        effectMessage += `\n- ${token.name}`;
      }
    });
    openAlertModal("Ação Aplicada!", effectMessage);
  };

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
    // Determine the final actionId that is guaranteed to be number or null
    const finalActionId: number | null = actionIdParam === undefined ? 1 : actionIdParam;

    setExpandedActionId(prevId => (prevId === finalActionId ? null : finalActionId));
};

  return (
    <div className="combat-actions-container h-100 p-3">
      <h4 className="text-white text-center mb-3">Ações de Combate</h4>
      <hr className="border-secondary mb-4" />

      {actions.length === 0 ? (
        <p className="text-muted text-center">Nenhuma ação disponível. Crie uma nova ação na Ficha de Personagem.</p>
      ) : (
        <div className="table-responsive custom-scroll" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
          <table className="table table-dark table-striped table-hover table-sm action-list-table">
            <thead>
              {/* Corrected: No whitespace between <th> tags */}
              <tr><th scope="col" className="text-highlight-warning text-center">Nome</th><th scope="col" className="text-highlight-warning text-center">Ações</th><th scope="col" className="text-highlight-warning text-center"></th></tr>
            </thead>
            <tbody>
              {actions.map(action => (
                // Corrected: No whitespace between React.Fragment and <tr>, and between <td> tags
                <React.Fragment key={action.id}><tr
                    className="align-middle"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggleExpandAction(action.id)}
                  ><td className="text-light-base text-start">
                      {action.name}
                      {action.isFavorite ? (
                        <i
                          className="bi bi-star-fill text-highlight-warning ms-2"
                          title="Desfavoritar"
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(false,action.id); }}
                          style={{ cursor: 'pointer' }}
                        ></i>
                      ) : (
                        <i
                          className="bi bi-star text-secondary-muted ms-2"
                          title="Favoritar"
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(true,action.id); }}
                          style={{ cursor: 'pointer' }}
                        ></i>
                      )}
                    </td><td className="text-center">
                      <button className="btn btn-sm btn-outline-info me-1" onClick={(e) => { e.stopPropagation(); onEditAction(action); }}>
                        <i className="bi bi-pencil"></i> Edit
                      </button>
                      <button className="btn btn-sm btn-outline-danger me-1" onClick={(e) => { e.stopPropagation(); handleConfirmDelete(action.id); }}>
                        <i className="bi bi-trash"></i> Del
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleUseAction(action); }}
                      >
                        Usar
                      </button>
                    </td><td className="text-center">
                      <i className={`bi ${expandedActionId === action.id ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                    </td></tr>
                  {expandedActionId === action.id && (
                    // Corrected: No whitespace between <tr> and <td>
                    <tr><td colSpan={3} className="expanded-action-details p-3">
                        <div className="card custom-card-base p-3 text-light-base">
                          <p className="mb-1 small">Tipo Principal: <strong>{action.mainType}</strong></p>
                          <p className="mb-1 small">Categoria de Efeito: <strong>{action.effectCategory}</strong></p>
                          {action.attackRange && <p className="mb-1 small">Alcance: {action.attackRange}</p>}
                          {action.range && action.mainType === 'spell' && <p className="mb-1 small">Alcance: {action.range}</p>}
                          {action.target && <p className="mb-1 small">Alvo: {action.target}</p>}
                          {action.effectCategory === 'damage' && action.damageDice && <p className="mb-1 small">Dano: <strong className="text-highlight-warning">{action.damageDice} {action.damageType || ''}</strong></p>}
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
                              {action.school && <p className="mb-1 small">Escola: {action.id}</p>}
                              {action.saveDC && <p className="mb-1 small">Teste de Resistência: {action.saveDC}</p>}
                            </>
                          )}
                          {action.description && <p className="mb-0 small">Descrição: {action.description}</p>}
                        </div>
                      </td></tr>
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