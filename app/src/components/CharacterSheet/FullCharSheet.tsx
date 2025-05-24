import React, { useState } from 'react';
import AttributesSection from './Atributos';
import CharacterPortraitAndHealth from './CharPortrait';
import SkillsSection from './Skills';
import token from '../../img/0.png';
import { BasicAttribute, EssentialAttributes, Skill, CharacterAction, Token } from '../../types';
import ActionCreator from '../Actions/ActionCreator';
import CombatActions from '../Actions/CombatActions';
import { v4 as uuidv4 } from 'uuid';

const FullCharSheet: React.FC = () => {
  const [activeSide, setActiveSide] = useState<'character' | 'bio' | 'spells'>('character');

  const [actions, setActions] = useState<CharacterAction[]>([]);
  const [actionToEdit, setActionToEdit] = useState<CharacterAction | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  const [bioFields, setBioFields] = useState({
    history: "A história de Aella é marcada por batalhas em florestas sombrias e uma busca implacável por vingança contra os goblins que destruíram sua vila.",
    appearance: "Cabelos cor de ébano, olhos penetrantes que brilham no escuro. Uma cicatriz no braço esquerdo, lembrança de um encontro com um lobo atroz.",
    personality: "Reservada e cautelosa, mas fiercely leal aos seus companheiros. Tem um humor seco e um senso de justiça inabalável.",
    treasure: "Um punhal élfico de prata, um saco de moedas de ouro (150 gp) e um mapa rasgado de uma masmorra perdida.",
    notes: "Procura artefatos antigos. Tem aversão a dragões. Forte conexão com a natureza. (Notas do Mestre)"
  });

  const [myCharacterAttributes, setMyCharacterAttributes] = useState<BasicAttribute[]>([
    { name: 'Força', value: 18, modifier: 4 },
    { name: 'Destreza', value: 16, modifier: 3 },
    { name: 'Constituição', value: 14, modifier: 2 },
    { name: 'Inteligência', value: 10, modifier: 0 },
    { name: 'Sabedoria', value: 12, modifier: 1 },
    { name: 'Carisma', value: 8, modifier: -1 },
  ]);

  // PERÍCIAS COMPLETAS DE D&D 5e
  const [mySkills, setMySkills] = useState<Skill[]>([
    // Força
    { name: 'Atletismo', modifier: '+5' },
    // Destreza
    { name: 'Acrobacia', modifier: '+3' },
    { name: 'Furtividade', modifier: '+2' },
    { name: 'Prestidigitação', modifier: '+2' },
    // Inteligência
    { name: 'Arcanismo', modifier: '+1' },
    { name: 'História', modifier: '+0' },
    { name: 'Investigação', modifier: '+1' },
    { name: 'Natureza', modifier: '+1' },
    { name: 'Religião', modifier: '+0' },
    // Sabedoria
    { name: 'Adestrar Animais', modifier: '+0' },
    { name: 'Intuição', modifier: '+1' },
    { name: 'Medicina', modifier: '+0' },
    { name: 'Percepção', modifier: '+2' },
    { name: 'Sobrevivência', modifier: '+0' },
    // Carisma
    { name: 'Atuação', modifier: '+4' },
    { name: 'Enganação', modifier: '+4' },
    { name: 'Intimidação', modifier: '+4' },
    { name: 'Persuasão', modifier: '+4' },
  ]);

  const [essentialAttributes, setEssentialAttributes] = useState<EssentialAttributes>({
    armor: 16,
    initiative: '+2',
    proficiency: '+2',
    speed: '9 m',
  });

  const [editingEssentialAttribute, setEditingEssentialAttribute] = useState<keyof EssentialAttributes | null>(null);

  const handleSaveAction = (newAction: CharacterAction) => {
    if (newAction.id && actions.some(a => a.id === newAction.id)) {
      setActions(prevActions =>
        prevActions.map(action =>
          action.id === newAction.id ? newAction : action
        )
      );
    } else {
      setActions(prevActions => [...prevActions, { ...newAction, id: uuidv4() }]);
    }
    setActionToEdit(null);
    setShowModal(false);
  };

  const handleEditAction = (action: CharacterAction) => {
    setActionToEdit(action);
    setShowModal(true);
  };

  const handleDeleteAction = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta ação?")) {
        setActions(prevActions => prevActions.filter(action => action.id !== id));
        if (actionToEdit && actionToEdit.id === id) {
            setActionToEdit(null);
            setShowModal(false);
        }
        alert("Ação excluída!");
    }
  };

  const handleOpenCreatorModal = () => {
    setActionToEdit(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setActionToEdit(null);
    setShowModal(false);
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
    setEssentialAttributes(prevAttrs => ({
      ...prevAttrs,
      [key]: newValue
    }));
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


  const availableTokensMock: Token[] = [
    { id: 1, name: 'Inimigo A', portraitUrl: 'https://via.placeholder.com/30/FF0000/FFFFFF?text=A', currentHp: 10, maxHp: 10, ac: 10, x: 0, y: 0, image: '', width: 1, height: 1 },
    { id: 2, name: 'Inimigo B', portraitUrl: 'https://via.placeholder.com/30/0000FF/FFFFFF?text=B', currentHp: 15, maxHp: 20, ac: 12, x: 0, y: 0, image: '', width: 1, height: 1 },
  ];
  const handleTokenSelectedMock = (token: Token | null) => { /* console.log('Token selecionado:', token); */ };


  return (
    <div style={{ paddingTop: 5 }} className="container-fluid character-sheet-container h-100">
      <div className=" h-100 d-flex flex-column">

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
                className={`nav-link ${activeSide === 'spells' ? 'active' : ''} text-light-base`}
                onClick={() => {
                  setActiveSide('spells');
                  setShowModal(false);
                  setActionToEdit(null);
                }}
                type="button"
                role="tab"
                aria-controls="spells-tab-page"
                aria-selected={activeSide === 'spells'}
              >
                Magias e Habilidades
              </button>
            </li>
          </ul>
        </div>

        {/* Conteúdo das Abas */}
        <div className="tab-content-display flex-grow-1">
          {activeSide === 'character' && (
            <div className="tab-page-active fade show active flex-grow-1" id="character-tab-page" role="tabpanel" aria-labelledby="character-tab">
              <div className="row flex-grow-1">
                {/* COLUNA ESQUERDA: Atributos Básicos */}
                <div className="col-md-3 d-flex flex-column align-items-center justify-content-start py-3 overflow-y-auto">
                  <AttributesSection
                    attributes={myCharacterAttributes}
                    onUpdateAttribute={handleUpdateBasicAttribute}
                  />
                </div>

                {/* COLUNA DO MEIO: Perícias */}
                <div className="col-md-5 d-flex flex-column py-3 overflow-y-auto">
                  <SkillsSection
                    skills={mySkills}
                    onUpdateSkill={handleUpdateSkill}
                  />
                </div>

                {/* COLUNA DA DIREITA: Imagem do Personagem e Vida */}
                <div className="col-md-4 d-flex flex-column align-items-center justify-content-start py-3 overflow-y-auto">
                  <CharacterPortraitAndHealth
                    imageUrl={token}
                    currentHealth={20}
                    maxHealth={100}
                  />
                  {/* Dados Essenciais */}
                  <div className="mt-4 text-center character-essential-attributes">
                    <h5 className="text-highlight-warning section-title">Dados Essenciais</h5>
                    {/* NOVO: Grid para os atributos essenciais */}
                    <div className="essential-attributes-grid">
                      {/* Armadura */}
                      <div className="essential-attribute-square"
                           onClick={() => handleEditEssentialAttribute('armor')}
                           onBlur={() => setEditingEssentialAttribute(null)} // Novo: Adiciona onBlur para fechar edição
                           style={{ cursor: 'pointer' }}
                      >
                        <h6 className="attribute-summary-label">Armadura</h6>
                        {editingEssentialAttribute === 'armor' ? (
                          <input
                            type="number"
                            className="essential-attribute-input"
                            value={essentialAttributes.armor}
                            onChange={(e) => handleSaveEssentialAttribute('armor', parseInt(e.target.value))}
                            onBlur={() => handleSaveEssentialAttribute('armor', essentialAttributes.armor)} // Salva ao perder o foco
                            onKeyDown={(e) => handleKeyPressEssentialAttribute(e, 'armor', essentialAttributes.armor)}
                            autoFocus
                          />
                        ) : (
                          <div className="attribute-summary-value">{essentialAttributes.armor}</div>
                        )}
                      </div>
                      {/* Iniciativa */}
                      <div className="essential-attribute-square"
                           onClick={() => handleEditEssentialAttribute('initiative')}
                           onBlur={() => setEditingEssentialAttribute(null)} // Novo: Adiciona onBlur para fechar edição
                           style={{ cursor: 'pointer' }}
                      >
                        <h6 className="attribute-summary-label">Iniciativa</h6>
                        {editingEssentialAttribute === 'initiative' ? (
                          <input
                            type="text"
                            className="essential-attribute-input"
                            value={essentialAttributes.initiative}
                            onChange={(e) => handleSaveEssentialAttribute('initiative', e.target.value)}
                            onBlur={() => handleSaveEssentialAttribute('initiative', essentialAttributes.initiative)}
                            onKeyDown={(e) => handleKeyPressEssentialAttribute(e, 'initiative', essentialAttributes.initiative)}
                            autoFocus
                          />
                        ) : (
                          <div className="attribute-summary-value">{essentialAttributes.initiative}</div>
                        )}
                      </div>
                      {/* Proficiência */}
                      <div className="essential-attribute-square"
                           onClick={() => handleEditEssentialAttribute('proficiency')}
                           onBlur={() => setEditingEssentialAttribute(null)} // Novo: Adiciona onBlur para fechar edição
                           style={{ cursor: 'pointer' }}
                      >
                        <h6 className="attribute-summary-label">Proeficiência</h6>
                        {editingEssentialAttribute === 'proficiency' ? (
                          <input
                            type="text"
                            className="essential-attribute-input"
                            value={essentialAttributes.proficiency}
                            onChange={(e) => handleSaveEssentialAttribute('proficiency', e.target.value)}
                            onBlur={() => handleSaveEssentialAttribute('proficiency', essentialAttributes.proficiency)}
                            onKeyDown={(e) => handleKeyPressEssentialAttribute(e, 'proficiency', essentialAttributes.proficiency)}
                            autoFocus
                          />
                        ) : (
                          <div className="attribute-summary-value">{essentialAttributes.proficiency}</div>
                        )}
                      </div>
                      {/* Velocidade */}
                      <div className="essential-attribute-square"
                           onClick={() => handleEditEssentialAttribute('speed')}
                           onBlur={() => setEditingEssentialAttribute(null)} // Novo: Adiciona onBlur para fechar edição
                           style={{ cursor: 'pointer' }}
                      >
                        <h6 className="attribute-summary-label">Velocidade</h6>
                        {editingEssentialAttribute === 'speed' ? (
                          <input
                            type="text"
                            className="essential-attribute-input"
                            value={essentialAttributes.speed}
                            onChange={(e) => handleSaveEssentialAttribute('speed', e.target.value)}
                            onBlur={() => handleSaveEssentialAttribute('speed', essentialAttributes.speed)}
                            onKeyDown={(e) => handleKeyPressEssentialAttribute(e, 'speed', essentialAttributes.speed)}
                            autoFocus
                          />
                        ) : (
                          <div className="attribute-summary-value">{essentialAttributes.speed}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSide === 'bio' && (
            <div className="tab-page-active fade show active flex-grow-1 character-bio-tab" id="bio-tab-page" role="tabpanel" aria-labelledby="bio-tab">
              <div className="row h-100 justify-content-center py-3">
                <div className="col-lg-10 col-md-11 col-sm-12">
                  <h3 className="text-highlight-warning mb-4 text-center">Bio: Detalhes do Personagem</h3>
                  <div className="row g-3">
                    {/* Coluna Esquerda */}
                    <div className="col-md-6 d-flex flex-column gap-3">
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioHistory" className="form-label field-label text-highlight-warning small">História</label>
                        <textarea
                          id="bioHistory"
                          className="form-control bg-dark text-light-base border-secondary"
                          rows={6}
                          value={bioFields.history}
                          onChange={(e) => handleBioFieldChange('history', e.target.value)}
                          placeholder="A história do seu personagem..."
                        ></textarea>
                      </div>
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioPersonality" className="form-label field-label text-highlight-warning small">Personalidade</label>
                        <textarea
                          id="bioPersonality"
                          className="form-control bg-dark text-light-base border-secondary"
                          rows={6}
                          value={bioFields.personality}
                          onChange={(e) => handleBioFieldChange('personality', e.target.value)}
                          placeholder="Traços de personalidade, ideais, laços, falhas..."
                        ></textarea>
                      </div>
                    </div>
                    {/* Coluna Direita */}
                    <div className="col-md-6 d-flex flex-column gap-3">
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioAppearance" className="form-label field-label text-highlight-warning small">Aparência</label>
                        <textarea
                          id="bioAppearance"
                          className="form-control bg-dark text-light-base border-secondary"
                          rows={6}
                          value={bioFields.appearance}
                          onChange={(e) => handleBioFieldChange('appearance', e.target.value)}
                          placeholder="Descrição física do seu personagem..."
                        ></textarea>
                      </div>
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioTreasure" className="form-label field-label text-highlight-warning small">Tesouro & Equipamento</label>
                        <textarea
                          id="bioTreasure"
                          className="form-control bg-dark text-light-base border-secondary"
                          rows={6}
                          value={bioFields.treasure}
                          onChange={(e) => handleBioFieldChange('treasure', e.target.value)}
                          placeholder="Itens importantes, ouro, equipamento..."
                        ></textarea>
                      </div>
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioNotes" className="form-label field-label text-highlight-warning small">Notas do Mestre</label>
                        <textarea
                          id="bioNotes"
                          className="form-control bg-dark text-light-base border-secondary"
                          rows={4}
                          value={bioFields.notes}
                          onChange={(e) => handleBioFieldChange('notes', e.target.value)}
                          placeholder="Informações adicionais ou segredos (somente para o Mestre)..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSide === 'spells' && (
            <div className="tab-page-active fade show active flex-grow-1" id="spells-tab-page" role="tabpanel" aria-labelledby="spells-tab">
              {/* Botão para abrir o modal de criação de ação */}
              <div className="text-center mb-3 flex-shrink-0">
                <button
                  className="btn btn-primary"
                  onClick={handleOpenCreatorModal}
                >
                  <i className="bi bi-plus-circle me-2"></i>Criar Nova Magia/Habilidade
                </button>
              </div>

              {/* Lista de Magias e Habilidades Salvas */}
              <div className="row flex-grow-1 justify-content-center">
                <div className="col-lg-8 col-md-10 col-sm-12 py-3 d-flex flex-column">
                  <h3 className="text-highlight-warning mb-4 text-center">Minhas Magias/Habilidades</h3>
                  <CombatActions
                    actions={actions}
                    onDeleteAction={handleDeleteAction}
                    onEditAction={handleEditAction}
                    onToggleFavorite={(id, isFav) => {
                      setActions(prev => prev.map(a => a.id === id ? { ...a, isFavorite: isFav } : a));
                    }}
                    availableTokens={availableTokensMock}
                    onTokenSelected={handleTokenSelectedMock}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para ActionCreator */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content custom-card-base action-creator-modal-dialog">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-highlight-warning">{actionToEdit ? 'Editar Magia/Habilidade' : 'Criar Nova Magia/Habilidade'}</h5>
                <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body custom-card-scrollable-body" style={{ maxHeight: '70vh' }}>
                <ActionCreator
                  onSaveAction={handleSaveAction}
                  actionToEdit={actionToEdit}
                  onCancelEdit={handleCloseModal}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullCharSheet;