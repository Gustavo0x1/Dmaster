// src/components/CharacterSheet/CharacterSheet.tsx
import React, { useState, useEffect, useRef } from 'react';
import AttributesSection from './Atributos';
import CharacterPortraitAndHealth from './CharPortrait';
import SkillsSection from './Skills';
import token from '../../img/0.png';
import { BasicAttribute, EssentialAttributes, Skill, CharacterAction, Token } from '../../types';
import ActionCreator from '../Actions/ActionCreator';
import ConfirmationModal from '../modals/ConfirmationModal';
import SimpleAlertModal from '../modals/SimpleAlert';
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4

// Extend Window interface to include electronAPI
interface CharacterActionWithId extends CharacterAction {
    id?: number; // The ID is now number | undefined in ActionCreator.tsx
}

interface CharacterSheetProps {
  onSaveActionForCombat?: (action: CharacterAction) => void;
  characterId: number; // Add characterId as a prop
}

const FullCharSheet: React.FC<CharacterSheetProps> = ({ onSaveActionForCombat, characterId }) => {
    const electron = (window as any).electron;

  const [activeSide, setActiveSide] = useState<'character' | 'bio' | 'actions'>('character');
  const [actions, setActions] = useState<CharacterAction[]>([]);
   const [actionToEdit, setActionToEdit] = useState<CharacterActionWithId | null>(null); // Corrected type
  const [showActionCreatorModal, setShowActionCreatorModal] = useState<boolean>(false);
  const [expandedActionId, setExpandedActionId] = useState<number | null>(null);

  // States for SIMPLE ALERT modal (for success, display in chat)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalTitle, setAlertModalTitle] = useState('');
  const [alertModalMessage, setAlertModalMessage] = useState<string | React.ReactNode>('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState<string | React.ReactNode>('');
  const [confirmModalOnConfirm, setConfirmModalOnConfirm] = useState<(() => void) | undefined>(undefined);

  const [bioFields, setBioFields] = useState({
    history: "",
    appearance: "",
    personality: "",
    treasure: ""
  });

  const [myCharacterAttributes, setMyCharacterAttributes] = useState<BasicAttribute[]>([]);

  const [mySkills, setMySkills] = useState<Skill[]>([]);

  const [essentialAttributes, setEssentialAttributes] = useState<EssentialAttributes>({
    armor: 0, initiative: '', proficiency: '', speed: '',
  });

  const [editingEssentialAttribute, setEditingEssentialAttribute] = useState<keyof EssentialAttributes | null>(null);

  // Effect to load character data when characterId changes
  useEffect(() => {
        if (characterId) {
                electron.invoke('request-character-data', characterId)
                .then((response: any ) => { // <--- Tipagem adicionada aqui
                    if (response.success && response.data) {
                        const data = response.data;
                        setBioFields(data.bioFields || { history: "", appearance: "", personality: "", treasure: "" });
                        setMyCharacterAttributes(data.myCharacterAttributes || []);
                        setMySkills(data.mySkills || []);
                        setEssentialAttributes(data.essentialAttributes || { armor: 0, initiative: '', proficiency: '', speed: '' });
                        setActions(data.actions || []);
                        console.log("Dados do personagem carregados:", data);
                    } else {
                        console.error("Erro ao carregar dados do personagem:", response.message);
                        openAlertModal("Erro de Carregamento", response.message || "Não foi possível carregar os dados do personagem.");
                    }
                })
                .catch((error: unknown) => { // Tipagem do erro, como discutido anteriormente
                    console.error("Erro na comunicação IPC ao carregar dados do personagem:", error);
                    openAlertModal("Erro de Comunicação", "Não foi possível comunicar com o processo principal para carregar os dados.");
                });
        }
    }, [characterId]);
 // Re-run when characterId changes

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

   const handleSaveAction = async (actionToProcess: CharacterActionWithId) => {
        try {
            const response = await electron.invoke('save-action', characterId, actionToProcess);

            if (response.success) {
                setActions(prevActions => {
                    if (actionToProcess.id !== undefined && prevActions.some(a => a.id === actionToProcess.id)) {
                        return prevActions.map(a =>
                            a.id === actionToProcess.id ? { ...actionToProcess, id: response.data.id || actionToProcess.id } : a
                        );
                    } else {
                        const newActionId = response.data?.id || Math.floor(Math.random() * 1000000); // Garante que o ID é um número
                        return [...prevActions, { ...actionToProcess, id: newActionId }];
                    }
                });
                openAlertModal("Sucesso!", "Ação salva com sucesso!");
                setActionToEdit(null); // Limpa o estado de edição
                setShowActionCreatorModal(false); // Fecha o modal após salvar ou atualizar
            } else {
                console.error("Failed to save action:", response.message);
                openAlertModal("Erro!", response.message || "Não foi possível salvar a ação.");
            }
        } catch (error) {
            console.error("Erro ao salvar/atualizar ação via IPC:", error);
            openAlertModal("Erro de Comunicação", "Não foi possível comunicar com o processo principal para salvar a ação.");
        }

        // Esta parte foi movida para dentro do if (response.success) acima,
        // para garantir que o modal só feche após o sucesso.
        // setActionToEdit(null);
        // setShowActionCreatorModal(false);

        if (onSaveActionForCombat) {
            onSaveActionForCombat(actionToProcess);
        }
    };
const handleEditAction = (action: CharacterActionWithId) => { // Removed 'async' and 'await'
    // This function is now solely responsible for setting the action to be edited
    // and opening the modal. The actual database update will happen when
    // the user clicks "Atualizar Ação" inside the ActionCreator modal.
    setActionToEdit(action);
    setShowActionCreatorModal(true); // Open the modal
};

// This function will be passed to ActionCreator as onEditAction prop
const handleUpdateActionInDb = async (action: CharacterActionWithId) => {
    try {
        const response = await electron.invoke('edit-action', characterId, action);
        if (response.success) {
            setActions(prevActions =>
                prevActions.map(a => a.id === action.id ? action : a)
            );
            openAlertModal("Sucesso!", "Ação atualizada com sucesso!");
            setShowActionCreatorModal(false); // Close the modal after successful update
            setActionToEdit(null); // Clear the editing state
        } else {
            console.error("Erro ao editar ação:", response.message);
            openAlertModal("Erro!", response.message || "Não foi possível editar a ação.");
        }
    } catch (error) {
        console.error("Erro ao atualizar db:", error);
        openAlertModal("Erro!", "Ocorreu um erro ao tentar editar a ação.");
    }
};


    const handleDeleteAction = (actionId?: number) => { // Certifique-se que actionId é sempre um número
        if(actionId==undefined)
        {
          return;
        }
        openConfirmModal(
            'Confirmar Exclusão',
            'Tem certeza que deseja excluir esta ação? Esta ação é irreversível.',
            async () => { // Usar async aqui para aguardar a operação IPC
                try {
                    const response = await electron.invoke('delete-action', characterId, actionId);

                    if (response.success) {
                        setActions(prevActions => prevActions.filter(action => action.id !== actionId));
                        openAlertModal("Sucesso!", "Ação excluída com sucesso!");
                    } else {
                        console.error("Erro ao excluir ação:", response.message);
                        openAlertModal("Erro na Exclusão", response.message || "Não foi possível excluir a ação.");
                    }
                } catch (error) {
                    console.error("Erro na comunicação IPC ao excluir ação:", error);
                    openAlertModal("Erro de Comunicação", "Não foi possível comunicar com o processo principal para excluir a ação.");
                }
                closeConfirmModal(); // Fechar o modal de confirmação em qualquer caso
            }
        );
    };

  const handleToggleFavorite = (isFavorite: boolean,actionId?: number) => {
       if(actionId == undefined){
      actionId =1;
    }
    setActions(prevActions =>
      prevActions.map(action =>
        action.id === actionId ? { ...action, isFavorite: isFavorite } : action
      )
    );
  };

  const handleShowInChat = (action: CharacterAction) => {

    console.log("Ação para exibir no chat:", action);
  };

const handleToggleExpandAction = (actionIdParam?: number) => {
    // Determine the final actionId that is guaranteed to be number or null
    const finalActionId: number | null = actionIdParam === undefined ? 1 : actionIdParam;

    setExpandedActionId(prevId => (prevId === finalActionId ? null : finalActionId));
};

  const handleOpenActionCreatorModal = () => {
    setActionToEdit(null);
    setShowActionCreatorModal(true);
  };

  const handleCloseActionCreatorModal = () => {
    setActionToEdit(null);
    setShowActionCreatorModal(false);
  };

  const handleBioFieldChange = (field: keyof typeof bioFields, value: string) => {
    setBioFields(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateBasicAttribute = (name: string, newValue: number, newModifier: number) => {
    setMyCharacterAttributes(prevAttributes =>
      prevAttributes.map(attr =>
        attr.name === name ? { ...attr, value: newValue, modifier: newModifier } : attr
      )
    );
  };

  const handleUpdateSkill = (name: string, newModifier: string) => {
    setMySkills(prevSkills =>
      prevSkills.map(skill =>
        skill.name === name ? { ...skill, modifier: newModifier } : skill
      )
    );
  };

  const handleEditEssentialAttribute = (key: keyof EssentialAttributes) => {
    setEditingEssentialAttribute(key);
  };

  const handleSaveEssentialAttribute = (key: keyof EssentialAttributes, newValue: string | number) => {
    setEssentialAttributes(prevAttrs => ({ ...prevAttrs, [key]: newValue }));
    setEditingEssentialAttribute(null);
  };

  const handleCancelEssentialAttributeEdit = () => {
    setEditingEssentialAttribute(null);
  };

  const handleKeyPressEssentialAttribute = (e: React.KeyboardEvent<HTMLInputElement>, key: keyof EssentialAttributes, newValue: string | number) => {
    if (e.key === 'Enter') {
      handleSaveEssentialAttribute(key, newValue);
    } else if (e.key === 'Escape') {
      handleCancelEssentialAttributeEdit();
    }
  };

  const availableTokensMock: Token[] = [];
  const handleTokenSelectedMock = (token: Token | null) => { /* console.log('Token selecionado:', token); */ };

  return (
    <div style={{ paddingTop: 5 }} className="container-fluid character-sheet-container h-100">
      <div className="h-100 d-flex flex-column">

        {/* Abas de Navegação */}
        <div className="col-12 mb-3 flex-shrink-0">
          <ul className="nav nav-tabs nav-justified" role="tablist">
            <li className="nav-item">
              <button
                className={`nav-link ${activeSide === 'character' ? 'active' : ''} text-light-base`}
                onClick={() => setActiveSide('character')}
                type="button"
                role="tab"
                aria-controls="character-tab-page"
                aria-selected={activeSide === 'character'}
              >
                Personagem
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeSide === 'bio' ? 'active' : ''} text-light-base`}
                onClick={() => setActiveSide('bio')}
                type="button"
                role="tab"
                aria-controls="bio-tab-page"
                aria-selected={activeSide === 'bio'}
              >
                Bio
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeSide === 'actions' ? 'active' : ''} text-light-base`}
                onClick={() => {
                  setActiveSide('actions');
                  setShowActionCreatorModal(false);
                  setActionToEdit(null);
                  setExpandedActionId(null);
                }}
                type="button"
                role="tab"
                aria-controls="actions-tab-page"
                aria-selected={activeSide === 'actions'}
              >
                Gerenciar Ações (Magias/Habilidades)
              </button>
            </li>
          </ul>
        </div>

        {/* Conteúdo das Abas */}
        <div className="tab-content-display flex-grow-1">
          {activeSide === 'character' && (
            <div className="tab-page-active fade show active flex-grow-1" id="character-tab-page" role="tabpanel" aria-labelledby="character-tab">
              <div className="row flex-grow-1">
                <div className="col-md-3 d-flex flex-column align-items-center justify-content-start py-3 overflow-y-auto">
                  <AttributesSection
                    attributes={myCharacterAttributes}
                    onUpdateAttribute={handleUpdateBasicAttribute}
                  />
                </div>
                <div className="col-md-5 d-flex flex-column py-3 overflow-y-auto">
                  <SkillsSection
                    skills={mySkills}
                    onUpdateSkill={handleUpdateSkill}
                  />
                </div>
                <div className="col-md-4 d-flex flex-column align-items-center justify-content-start py-3 overflow-y-auto">
                  <CharacterPortraitAndHealth
                    imageUrl={token}
                    currentHealth={20} // This should also be loaded from character data
                    maxHealth={100}   // This should also be loaded from character data
                  />
                  <div className="mt-4 text-center character-essential-attributes">
                    <h5 className="text-highlight-warning section-title">Dados Essenciais</h5>
                    <div className="essential-attributes-grid">
                      <div className="essential-attribute-square" onClick={() => handleEditEssentialAttribute('armor')} onBlur={() => setEditingEssentialAttribute(null)} style={{ cursor: 'pointer' }}>
                        <h6 className="attribute-summary-label">Armadura</h6>
                        {editingEssentialAttribute === 'armor' ? (
                          <input type="number" className="essential-attribute-input" value={essentialAttributes.armor} onChange={(e) => handleSaveEssentialAttribute('armor', parseInt(e.target.value))} onBlur={() => handleSaveEssentialAttribute('armor', essentialAttributes.armor)} onKeyDown={(e) => handleKeyPressEssentialAttribute(e, 'armor', essentialAttributes.armor)} autoFocus />
                        ) : (<div className="attribute-summary-value">{essentialAttributes.armor}</div>)}
                      </div>
                      <div className="essential-attribute-square" onClick={() => handleEditEssentialAttribute('initiative')} onBlur={() => setEditingEssentialAttribute(null)} style={{ cursor: 'pointer' }}>
                        <h6 className="attribute-summary-label">Iniciativa</h6>
                        {editingEssentialAttribute === 'initiative' ? (
                          <input type="text" className="essential-attribute-input" value={essentialAttributes.initiative} onChange={(e) => handleSaveEssentialAttribute('initiative', e.target.value)} onBlur={() => handleSaveEssentialAttribute('initiative', essentialAttributes.initiative)} onKeyDown={(e) => handleKeyPressEssentialAttribute(e, 'initiative', essentialAttributes.initiative)} autoFocus />
                        ) : (<div className="attribute-summary-value">{essentialAttributes.initiative}</div>)}
                      </div>
                      <div className="essential-attribute-square" onClick={() => handleEditEssentialAttribute('proficiency')} onBlur={() => setEditingEssentialAttribute(null)} style={{ cursor: 'pointer' }}>
                        <h6 className="attribute-summary-label">Proeficiência</h6>
                        {editingEssentialAttribute === 'proficiency' ? (
                          <input type="text" className="essential-attribute-input" value={essentialAttributes.proficiency} onChange={(e) => handleSaveEssentialAttribute('proficiency', e.target.value)} onBlur={() => handleSaveEssentialAttribute('proficiency', essentialAttributes.proficiency)} onKeyDown={(e) => handleKeyPressEssentialAttribute(e, 'proficiency', essentialAttributes.proficiency)} autoFocus />
                        ) : (<div className="attribute-summary-value">{essentialAttributes.proficiency}</div>)}
                      </div>
                      <div className="essential-attribute-square" onClick={() => handleEditEssentialAttribute('speed')} onBlur={() => setEditingEssentialAttribute(null)} style={{ cursor: 'pointer' }}>
                        <h6 className="attribute-summary-label">Velocidade</h6>
                        {editingEssentialAttribute === 'speed' ? (
                          <input type="text" className="essential-attribute-input" value={essentialAttributes.speed} onChange={(e) => handleSaveEssentialAttribute('speed', e.target.value)} onBlur={() => handleSaveEssentialAttribute('speed', essentialAttributes.speed)} onKeyDown={(e) => handleKeyPressEssentialAttribute(e, 'speed', essentialAttributes.speed)} autoFocus />
                        ) : (<div className="attribute-summary-value">{essentialAttributes.speed}</div>)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSide === 'bio' && (
            <div className="tab-page-active fade show active flex-grow-1 character-bio-tab" id="bio-tab-page" role="tabpanel" aria-labelledby="bio-tab">
              <div className="h-100 justify-content-center py-3">
                <div className="col-lg-10 col-md-11 col-sm-12">
                  <h3 className="text-highlight-warning mb-4 text-center">Bio: Detalhes do Personagem</h3>
                  <div className="row g-3">
                    <div className="col-md-6 d-flex flex-column gap-3">
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioHistory" className="form-label field-label text-highlight-warning small">História</label>
                        <textarea id="bioHistory" className="form-control bg-dark text-light-base border-secondary" rows={6} value={bioFields.history} onChange={(e) => handleBioFieldChange('history', e.target.value)} placeholder="A história do seu personagem..."></textarea>
                      </div>
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioPersonality" className="form-label field-label text-highlight-warning small">Personalidade</label>
                        <textarea id="bioPersonality" className="form-control bg-dark text-light-base border-secondary" rows={6} value={bioFields.personality} onChange={(e) => handleBioFieldChange('personality', e.target.value)} placeholder="Traços de personalidade, ideais, laços, falhas..."></textarea>
                      </div>
                    </div>
                    <div className="col-md-6 d-flex flex-column gap-3">
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioAppearance" className="form-label field-label text-highlight-warning small">Aparência</label>
                        <textarea id="bioAppearance" className="form-control bg-dark text-light-base border-secondary" rows={6} value={bioFields.appearance} onChange={(e) => handleBioFieldChange('appearance', e.target.value)} placeholder="Descrição física do seu personagem..."></textarea>
                      </div>
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioTreasure" className="form-label field-label text-highlight-warning small">Tesouro & Equipamento</label>
                        <textarea id="bioTreasure" className="form-control bg-dark text-light-base border-secondary" rows={6} value={bioFields.treasure} onChange={(e) => handleBioFieldChange('treasure', e.target.value)} placeholder="Itens importantes, ouro, equipamento..."></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSide === 'actions' && (
            <div className="tab-page-active fade show active flex-grow-1" id="actions-tab-page" role="tabpanel" aria-labelledby="actions-tab">
              <div className="text-center mb-3 flex-shrink-0">
                <button className="btn btn-primary" onClick={handleOpenActionCreatorModal}>
                  <i className="bi bi-plus-circle me-2"></i>Criar Nova Magia/Habilidade
                </button>
              </div>

              <div className="row flex-grow-1 justify-content-center">
                <div className="col-lg-8 col-md-10 col-sm-12 py-3 d-flex flex-column">
                  <h3 className="text-highlight-warning mb-4 text-center">Minhas Magias/Habilidades Salvas</h3>
                  <div className="card custom-card-base p-0 flex-grow-1 overflow-y-auto">
                    {actions.length === 0 ? (
                      <p className="text-secondary-muted text-center py-3">Nenhuma magia ou habilidade cadastrada ainda.</p>
                    ) : (
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
                                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite( false,action.id,); }}
                                        style={{ cursor: 'pointer' }}
                                      ></i>
                                  ) : (
                                      <i
                                        className="bi bi-star text-secondary-muted ms-2"
                                        title="Favoritar"
                                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(true,action.id); }}
                                        style={{ cursor: 'pointer' }}
                                      ></i>
                                  )}
                                </td>
                                <td className="text-center">
                                    <button className="btn btn-sm btn-outline-info me-1" onClick={(e) => { e.stopPropagation(); handleEditAction(action); }}>
                                        <i className="bi bi-pencil"></i>
                                    </button>
                                    <button className="btn btn-sm btn-outline-secondary me-1" onClick={(e) => { e.stopPropagation(); handleShowInChat(action); }}>
                                        <i className="bi bi-chat-text"></i>
                                    </button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={(e) => { e.stopPropagation(); handleDeleteAction(action.id); }}>
                                        <i className="bi bi-trash"></i>
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
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para ActionCreator */}
      {showActionCreatorModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content custom-card-base action-creator-modal-dialog">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-highlight-warning">{actionToEdit ? 'Editar Magia/Habilidade' : 'Criar Nova Magia/Habilidade'}</h5>
                <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={handleCloseActionCreatorModal}></button>
              </div>
              <div className="modal-body custom-card-scrollable-body" style={{ maxHeight: '70vh' }}>
           <ActionCreator
            characterId={characterId}
            onSaveAction={handleSaveAction}
            onEditAction={handleUpdateActionInDb} // This is the corrected function
            actionToEdit={actionToEdit}
            onCancelEdit={handleCloseActionCreatorModal} // This function should clear the state
        />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Genérico (para exclusão) */}
      <ConfirmationModal
        show={showConfirmModal}
        title={confirmModalTitle}
        message={confirmModalMessage}
        onConfirm={confirmModalOnConfirm}
        onClose={closeConfirmModal}
        showCancelButton={true}
        confirmButtonText="Confirmar"
      />

      {/* Modal de Alerta Simples */}
      <SimpleAlertModal
        show={showAlertModal}
        title={alertModalTitle}
        message={alertModalMessage}
        onClose={closeAlertModal}
      />

    </div>
  );
};

export default FullCharSheet;