// src/components/CharacterSheet/FullCharSheet.tsx
import React, { useState, useEffect, useRef } from 'react';
import AttributesSection, { calculateModifier } from './Atributos';
import CharacterPortraitAndHealth from './CharPortrait';
import SkillsSection from './Skills';
import { BasicAttribute, EssentialAttributes, Skill, CharacterAction, Token } from '../../types';
import ActionCreator from '../Actions/ActionCreator';
import ConfirmationModal from '../modals/ConfirmationModal';
import SimpleAlertModal from '../modals/SimpleAlert';
import { v4 as uuidv4 } from 'uuid';

interface CharacterActionWithId extends CharacterAction {
    id?: number;
}

interface CharacterSheetProps {
  onSaveActionForCombat?: (action: CharacterAction) => void;
  characterId: number | null;
  currentUserId: number | null;
  onCharacterCreated?: (newCharacterId: number) => void;
}

const FullCharSheet: React.FC<CharacterSheetProps> = ({
  onSaveActionForCombat,
  characterId,
  currentUserId,
  onCharacterCreated
}) => {
    const electron = (window as any).electron;

  const [isCreatingNewCharacter, setIsCreatingNewCharacter] = useState<boolean>(false);
  const [characterName, setCharacterName] = useState<string>("");
  const [characterSavedOnce, setCharacterSavedOnce] = useState<boolean>(false);

  const [activeSide, setActiveSide] = useState<'character' | 'bio' | 'actions'>('character');
  const [actions, setActions] = useState<CharacterAction[]>([]);
  const [actionToEdit, setActionToEdit] = useState<CharacterActionWithId | null>(null);
  const [showActionCreatorModal, setShowActionCreatorModal] = useState<boolean>(false);
  const [expandedActionId, setExpandedActionId] = useState<number | null>(null);

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
  const [essentialAttributes, setEssentialAttributes] = useState<EssentialAttributes>({ armor: 0, initiative: '', proficiency: '', speed: '', });

  const [maxHp, setMaxHp] = useState<number>(10);
  const [currentHp, setCurrentHp] = useState<number>(10);
  const [tempHp, setTempHp] = useState<number>(0);
  const [shield, setShield] = useState<number>(0);
  const [race, setRace] = useState<string>("Raça Padrão");
  const [charClass, setCharClass] = useState<string>("Classe Padrão");
  const [subClass, setSubClass] = useState<string>("Subclasse Padrão");
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);

  const [tokenImage, setTokenImage] = useState<string | null>(null);

  const [tempEssentialValue, setTempEssentialValue] = useState<string | number>('');
  const [editingEssentialAttribute, setEditingEssentialAttribute] = useState<keyof EssentialAttributes | null>(null);
  
  // Tipagem unificada para todos os campos editáveis por clique
  type EditableField = keyof EssentialAttributes | 'maxHp' | 'currentHp' | 'race' | 'charClass' | 'level' | 'xp';
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [tempValue, setTempValue] = useState<string | number>(''); // Usar 'tempValue' para ambos os tipos de campos

  const [editingBioField, setEditingBioField] = useState<keyof typeof bioFields | null>(null);

  // Efeito para Carregar ou Inicializar Dados do Personagem
  useEffect(() => {
    if (characterId === null) {
      setIsCreatingNewCharacter(true);
      setCharacterName("");
      setBioFields({ history: "", appearance: "", personality: "", treasure: "" });
      setMyCharacterAttributes([
        { id: 1, name: 'Força', value: 10, modifier: 0 }, { id: 2, name: 'Destreza', value: 10, modifier: 0 },
        { id: 3, name: 'Constituição', value: 10, modifier: 0 }, { id: 4, name: 'Inteligência', value: 10, modifier: 0 },
        { id: 5, name: 'Sabedoria', value: 10, modifier: 0 }, { id: 6, name: 'Carisma', value: 10, modifier: 0 },
      ]);
      setMySkills([
        { name: 'Acrobacia', modifier: 'dex' }, { name: 'Arcanismo', modifier: 'int' },
        { name: 'Atletismo', modifier: 'str' }, { name: 'Atuação', modifier: 'car' },
        { name: 'Enganação', modifier: 'car' }, { name: 'Furtividade', modifier: 'dex' },
        { name: 'Intimidação', modifier: 'car' }, { name: 'Intuição', modifier: 'sab' },
        { name: 'Investigação', modifier: 'int' }, { name: 'Medicina', modifier: 'sab' },
        { name: 'Natureza', modifier: 'int' }, { name: 'Percepção', modifier: 'sab' },
        { name: 'Persuasão', modifier: 'car' }, { name: 'Prestidigitação', modifier: 'dex' },
        { name: 'Religião', modifier: 'int' }, { name: 'Sobrevivência', modifier: 'sab' },
      ]);
      setEssentialAttributes({ armor: 10, initiative: 'dex', proficiency: '+2', speed: '30ft' });
      setActions([]);
      setCharacterSavedOnce(false);

      setMaxHp(10); setCurrentHp(10); setTempHp(0); setShield(0);
      setRace("Raça Padrão"); setCharClass("Classe Padrão"); setSubClass("Subclasse Padrão");
      setLevel(1); setXp(0);
      setTokenImage(null);

    } else {
      setIsCreatingNewCharacter(false);
      setCharacterSavedOnce(true);
      if (characterId) {
        electron.invoke('request-character-data', characterId)
          .then((response: any) => {
            if (response.success && response.data) {
              const data = response.data;
              let loadedBioFields = { history: "", appearance: "", personality: "", treasure: "" };
              if (data.bioFields && typeof data.bioFields === 'string') {
                try {
                  const parsedBio = JSON.parse(data.bioFields);
                  if (parsedBio && typeof parsedBio === 'object' &&
                    'history' in parsedBio && 'appearance' in parsedBio &&
                    'personality' in parsedBio && 'treasure' in parsedBio) {
                    loadedBioFields = parsedBio;
                  } else {
                    console.warn("Dados de bioFields carregados não estão no formato esperado (JSON válido mas estrutura diferente), usando valores padrão.");
                  }
                } catch (e) {
                  console.error("Erro ao fazer parse da string JSON de bioFields do DB:", e);
                }
              } else if (data.bioFields && typeof data.bioFields === 'object') {
                loadedBioFields = data.bioFields;
              }

              const loadedAttributes: BasicAttribute[] = data.myCharacterAttributes || [];
              const attributesWithCorrectedModifiers = loadedAttributes.map(attr => ({ ...attr, modifier: calculateModifier(attr.value) }));

              setBioFields(loadedBioFields);
              setMyCharacterAttributes(attributesWithCorrectedModifiers);
              setMySkills(data.mySkills || []);
              setEssentialAttributes(data.essentialAttributes || { armor: 0, initiative: '', proficiency: '', speed: '' });
              setActions(data.actions || []);
              setCharacterName(data.CHARNAME || "");

              setMaxHp(data.MaxHp || 10); setCurrentHp(data.CurrentHp || 10); setTempHp(data.TempHp || 0); setShield(data.Shield || 0);
              setRace(data.Race || "Raça Padrão"); setCharClass(data.Class || "Classe Padrão"); setSubClass(data.SubClass || "Subclasse Padrão");
              setLevel(data.Level || 1); setXp(data.XP || 0);
              setTokenImage(data.Token_image || null);

              console.log("Dados do personagem carregados:", data);
            } else {
              console.error("Erro ao carregar dados do personagem:", response.message);
              openAlertModal("Erro de Carregamento", response.message || "Não foi possível carregar os dados do personagem.");
            }
          })
          .catch((error: unknown) => {
            console.error("Erro na comunicação IPC ao carregar dados do personagem:", error);
            openAlertModal("Erro de Comunicação", "Não foi possível comunicar com o processo principal para carregar os dados.");
          });
      }
    }
  }, [characterId]);

  // Funções para Modais (Alerta e Confirmação)
  const openAlertModal = (title: string, message: string | React.ReactNode) => {
    setAlertModalTitle(title); setAlertModalMessage(message); setShowAlertModal(true);
  };
  const closeAlertModal = () => {
    setShowAlertModal(false); setAlertModalTitle(''); setAlertModalMessage('');
  };
  const openConfirmModal = (title: string, message: string | React.ReactNode, onConfirm: (() => void) | undefined) => {
    setConfirmModalTitle(title); setConfirmModalMessage(message); setConfirmModalOnConfirm(() => onConfirm); setShowConfirmModal(true);
  };
  const closeConfirmModal = () => {
    setShowConfirmModal(false); setConfirmModalTitle(''); setConfirmModalMessage(''); setConfirmModalOnConfirm(undefined);
  };

  // Funções de Tratamento de Imagem do Token
  const handleTokenImageChange = (imageDataURL: string | null) => {
    setTokenImage(imageDataURL);
  };

  // Funções para Edição Inline de TODOS os Dados Essenciais e Adicionais
  const handleEditField = (field: EditableField) => {
    if (!characterId) {
      openAlertModal("Aviso", "Você precisa salvar o personagem primeiro para editar atributos.");
      return;
    }
    setEditingField(field);
    // Define o valor temporário com base no campo selecionado
    if (field in essentialAttributes) { // Se for um atributo essencial
      setTempValue(essentialAttributes[field as keyof EssentialAttributes]);
    } else { // Se for um campo adicional
      switch (field) {
        case 'maxHp': setTempValue(maxHp); break;
        case 'currentHp': setTempValue(currentHp); break;
        case 'race': setTempValue(race); break;
        case 'charClass': setTempValue(charClass); break;
        case 'level': setTempValue(level); break;
        case 'xp': setTempValue(xp); break;
        default: setTempValue(''); break;
      }
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>, field: EditableField) => {
    const value = (field === 'armor' || field === 'maxHp' || field === 'currentHp' || field === 'level' || field === 'xp') 
                  ? parseInt(e.target.value, 10) || 0 // Garante que é um número para campos numéricos
                  : e.target.value;
    setTempValue(value);
  };

  const handleSaveField = async (field: EditableField) => {
    if (!characterId) return;

    // Atualiza o estado local primeiro
    if (field in essentialAttributes) {
      setEssentialAttributes(prev => ({ ...prev, [field]: tempValue }));
    } else {
      switch (field) {
        case 'maxHp': setMaxHp(tempValue as number); break;
        case 'currentHp': setCurrentHp(tempValue as number); break;
        case 'race': setRace(tempValue as string); break;
        case 'charClass': setCharClass(tempValue as string); break;
        case 'level': setLevel(tempValue as number); break;
        case 'xp': setXp(tempValue as number); break;
        default: break;
      }
    }
    setEditingField(null);
    setTempValue('');

    // Chama a função de salvar personagem completo para persistir no DB
    await handleSaveCharacter();
  };

  const handleCancelFieldEdit = (field: EditableField) => {
    setEditingField(null);
    setTempValue('');
    // Para reverter o valor original no estado, você precisaria armazená-lo antes de editar.
    // Atualmente, apenas cancelamos a edição do input sem desfazer a mudança no estado se já digitou.
  };

  const handleKeyPressField = (e: React.KeyboardEvent<HTMLInputElement>, field: EditableField) => {
    if (e.key === 'Enter') {
      handleSaveField(field);
    } else if (e.key === 'Escape') {
      // Reverter para o valor original se necessário. Como não armazenamos o original, apenas cancelamos a edição.
      handleCancelFieldEdit(field);
    }
  };


  // Função Principal para Salvar/Criar o Personagem
  const handleSaveCharacter = async () => {
    if (isCreatingNewCharacter && !characterName.trim()) {
      openAlertModal("Erro de Criação", "O nome do personagem é obrigatório para um novo personagem."); return;
    }
    if (currentUserId === null) {
      openAlertModal("Erro de Autenticação", "Não foi possível salvar. ID do jogador não disponível."); return;
    }

    const characterDataToSave = {
      id: characterId,
      CHARNAME: characterName,
      bioFields: bioFields,
      myCharacterAttributes: myCharacterAttributes,
      mySkills: mySkills,
      essentialAttributes: essentialAttributes,
      actions: actions,
      PLayer_ID: currentUserId,
      MaxHp: maxHp, CurrentHp: currentHp, TempHp: tempHp, Shield: shield,
      Race: race, Class: charClass, SubClass: subClass, Level: level, XP: xp,
      Token_image: tokenImage
    };

    try {
      let response;
      if (isCreatingNewCharacter) {
        response = await electron.invoke('create-character', characterDataToSave);
      } else {
        response = await electron.invoke('save-character-data', characterDataToSave);
      }

      if (response.success) {
        openAlertModal("Sucesso!", response.message);
        if (isCreatingNewCharacter && onCharacterCreated) {
          onCharacterCreated(response.newCharacterId);
          setIsCreatingNewCharacter(false);
          setCharacterSavedOnce(true);
        }
      } else {
        openAlertModal("Erro!", response.message || "Não foi possível salvar o personagem.");
      }
    } catch (error) {
      console.error("Erro ao salvar personagem via IPC:", error);
      openAlertModal("Erro de Comunicação", "Não foi possível comunicar com o processo principal para salvar o personagem.");
    }
  };

  // Funções para Gerenciamento de Ações (Magias/Habilidades)
  const handleSaveAction = async (actionToProcess: CharacterActionWithId) => {
        if (!characterId && !characterSavedOnce) {
            openAlertModal("Aviso", "Por favor, salve o personagem primeiro antes de adicionar ações.");
            return;
        }
        const currentCharacterId = characterId || 0; 

        try {
            const response = await electron.invoke('save-action', currentCharacterId, actionToProcess);

            if (response.success) {
                setActions(prevActions => {
                    if (actionToProcess.id !== undefined && prevActions.some(a => a.id === actionToProcess.id)) {
                        return prevActions.map(a =>
                            a.id === actionToProcess.id ? { ...actionToProcess, id: response.newActionId || actionToProcess.id } : a
                        );
                    } else {
                        const newActionId = response.newActionId || Math.floor(Math.random() * 1000000);
                        return [...prevActions, { ...actionToProcess, id: newActionId }];
                    }
                });
                openAlertModal("Sucesso!", "Ação salva com sucesso!");
                setActionToEdit(null);
                setShowActionCreatorModal(false);
            } else {
                console.error("Failed to save action:", response.message);
                openAlertModal("Erro!", response.message || "Não foi possível salvar a ação.");
            }
        } catch (error) {
            console.error("Erro ao salvar/atualizar ação via IPC:", error);
            openAlertModal("Erro de Comunicação", "Não foi possível comunicar com o processo principal para salvar a ação.");
        }

        if (onSaveActionForCombat) {
            onSaveActionForCombat(actionToProcess);
        }
    };
const handleEditAction = (action: CharacterActionWithId) => {
    setActionToEdit(action);
    setShowActionCreatorModal(true);
};

const handleUpdateActionInDb = async (action: CharacterActionWithId) => {
    if (!characterId) {
        openAlertModal("Erro", "ID do personagem não disponível para atualizar ações.");
        return;
    }
    try {
        const response = await electron.invoke('edit-action', characterId, action);
        if (response.success) {
            setActions(prevActions =>
                prevActions.map(a => a.id === action.id ? action : a)
            );
            openAlertModal("Sucesso!", "Ação atualizada com sucesso!");
            setShowActionCreatorModal(false);
            setActionToEdit(null);
        } else {
            console.error("Erro ao editar ação:", response.message);
            openAlertModal("Erro!", response.message || "Não foi possível editar a ação.");
        }
    } catch (error) {
        console.error("Erro ao atualizar db:", error);
        openAlertModal("Erro!", "Ocorreu um erro ao tentar editar a ação.");
    }
};

const handleDeleteAction = (actionId?: number) => {
        if(actionId==undefined || characterId === null) {
          openAlertModal("Erro", "Não foi possível identificar a ação ou o personagem para exclusão.");
          return;
        }
        openConfirmModal(
            'Confirmar Exclusão',
            'Tem certeza que deseja excluir esta ação? Esta ação é irreversível.',
            async () => {
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
                closeConfirmModal();
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
    const finalActionId: number | null = actionIdParam === undefined ? null : actionIdParam;
    setExpandedActionId(prevId => (prevId === finalActionId ? null : finalActionId));
};

  const handleOpenActionCreatorModal = () => {
    if (!characterId && !characterSavedOnce) {
        openAlertModal("Aviso", "Você precisa salvar o personagem primeiro para gerenciar ações.");
        return;
    }
    setActionToEdit(null);
    setShowActionCreatorModal(true);
  };

  const handleCloseActionCreatorModal = () => {
    setActionToEdit(null);
    setShowActionCreatorModal(false);
  };

  // Funções para Gerenciamento de Bio
  const saveBioFieldsToDatabase = async (updatedBio: typeof bioFields) => {
      if (!characterId) return;
      try {
          const bioFieldsAsString = JSON.stringify(updatedBio);
          console.log("Salvando BioFields completo no DB:", bioFieldsAsString);

          const response = await electron.invoke('update-character-bio', bioFieldsAsString, characterId);
          if (response.success) {
              console.log("BioFields salvo no banco de dados com sucesso!");
          } else {
              console.error("Erro ao salvar BioFields no DB:", response.message);
              openAlertModal("Erro!", response.message || "Não foi possível salvar os dados da Bio.");
          }
      } catch (error) {
          console.error("Erro IPC ao salvar BioFields:", error);
          openAlertModal("Erro de Comunicação", "Não foi possível comunicar com o processo principal para salvar a Bio.");
      }
  };

  const handleEditBioField = (field: keyof typeof bioFields) => {
      if (!characterId) {
        openAlertModal("Aviso", "Você precisa salvar o personagem primeiro para editar a bio.");
        return;
      }
      setEditingBioField(field);
  };

  const handleBioFieldChange = (field: keyof typeof bioFields, value: string) => {
      setBioFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBioField = (field: keyof typeof bioFields, value: string) => {
      setBioFields(prev => {
          const updatedBio = { ...prev, [field]: value };
          if (characterId) { 
            saveBioFieldsToDatabase(updatedBio);
          }
          return updatedBio;
      });
      setEditingBioField(null);
      console.log(`Bio field '${field}' editado.`);
  };

  const handleCancelBioFieldEdit = (field: keyof typeof bioFields, originalValue: string) => {
      setBioFields(prev => ({ ...prev, [field]: originalValue }));
      setEditingBioField(null);
  };

  const handleKeyPressBioField = (e: React.KeyboardEvent<HTMLTextAreaElement>, field: keyof typeof bioFields, currentValue: string, originalValue: string) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveBioField(field, currentValue);
      } else if (e.key === 'Escape') {
          handleCancelBioFieldEdit(field, originalValue);
      }
  };

  // Funções para Gerenciamento de Atributos Básicos
  const handleUpdateBasicAttribute = (id: number, newValue: number, newModifier: number) => {
    setMyCharacterAttributes(prevAttributes =>
      prevAttributes.map(attr =>
        attr.id === id ? { ...attr, value: newValue, modifier: newModifier } : attr
      )
    );
  };
  useEffect(() => {
    if (myCharacterAttributes.length > 0 && characterId) { 
      // Lógica de salvamento automático aqui (se desejado)
    }
  }, [myCharacterAttributes, characterId]);

  // Funções para Gerenciamento de Habilidades
  const handleUpdateSkill = (name: string, newModifier: string) => {
    setMySkills(prevSkills =>
      prevSkills.map(skill =>
        skill.name === name ? { ...skill, modifier: newModifier } : skill
      )
    );
  };

  // Funções para Gerenciamento de Atributos Essenciais
  const handleEditEssentialAttribute = (key: keyof EssentialAttributes) => {
      if (!characterId) {
        openAlertModal("Aviso", "Você precisa salvar o personagem primeiro para editar atributos essenciais.");
        return;
      }
      setEditingEssentialAttribute(key);
      setTempEssentialValue(essentialAttributes[key]);
  };

  const handleEssentialValueChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof EssentialAttributes) => {
      const value = key === 'armor' ? parseInt(e.target.value, 10) : e.target.value;
      setTempEssentialValue(value);
  };

  const handleSaveEssentialAttribute = async (key: keyof EssentialAttributes) => {
      if (!characterId) return;

      const updatedEssentialAttributes = { ...essentialAttributes, [key]: tempEssentialValue };
      setEssentialAttributes(updatedEssentialAttributes);
      setEditingEssentialAttribute(null);
      setTempEssentialValue('');

      try {
          const essentialAttributesAsString = JSON.stringify(updatedEssentialAttributes);
          console.log(`Atributo essencial '${key}' salvo com novo valor: '${tempEssentialValue}'. Salvando no DB:`, essentialAttributesAsString);

          const response = await electron.invoke('update-character-essentials', essentialAttributesAsString, characterId);
          if (response.success) {
              console.log("Atributos essenciais salvos no banco de dados com sucesso!");
          } else {
              console.error("Erro ao salvar atributos essenciais no DB:", response.message);
              openAlertModal("Erro!", response.message || "Não foi possível salvar os dados essenciais.");
          }
      } catch (error) {
          console.error("Erro IPC ao salvar atributos essenciais:", error);
          openAlertModal("Erro de Comunicação", "Não foi possível comunicar com o processo principal para salvar os dados essenciais.");
      }
  };

  const handleCancelEssentialAttributeEdit = () => {
      setEditingEssentialAttribute(null);
      setTempEssentialValue('');
  };

  const handleKeyPressEssentialAttribute = (e: React.KeyboardEvent<HTMLInputElement>, key: keyof EssentialAttributes) => {
      if (e.key === 'Enter') {
          handleSaveEssentialAttribute(key);
      } else if (e.key === 'Escape') {
          handleCancelEssentialAttributeEdit();
      }
  };

  // Mock para seleção de Token (pode ser removido se não for usado)
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
                {/* Coluna da esquerda (Atributos) */}
                <div className="col-md-3 d-flex flex-column align-items-center justify-content-start py-3 overflow-y-auto">
                  <AttributesSection
                    attributes={myCharacterAttributes}
                    onUpdateAttribute={handleUpdateBasicAttribute}
                  />
                </div>
                {/* Coluna do meio (Habilidades) */}
                <div className="col-md-5 d-flex flex-column py-3 overflow-y-auto">
                  <SkillsSection
                    CharacterID={characterId || 0}
                    skills={mySkills}
                    onUpdateSkill={handleUpdateSkill}
                    characterAttributes={myCharacterAttributes}
                  />
                </div>
                {/* Coluna da direita (Retrato, Nome, e Dados Essenciais) */}
                <div className="col-md-4 d-flex flex-column align-items-center justify-content-start py-3 overflow-y-auto">
                  
                  {/* Portrait e Health Controller */}
                  <div className="d-flex flex-column align-items-center mb-3">
                      <CharacterPortraitAndHealth
                          currentHealth={currentHp}
                          maxHealth={maxHp}
                          tokenImage={tokenImage}
                          onTokenImageChange={handleTokenImageChange}
                      />
                      {/* Nome do Personagem - MOVIDO PARA AQUI, ABAIXO DA FOTO */}
                      <div className="text-center mt-2">
                        <h3 className="text-highlight-warning mb-0">Nome:</h3>
                        <input
                            type="text"
                            className="form-control bg-dark text-light-base border-secondary text-center"
                            placeholder="Nome do seu personagem"
                            value={characterName}
                            onChange={(e) => setCharacterName(e.target.value)}
                            style={{ maxWidth: '200px' }}
                            required={isCreatingNewCharacter}
                        />
                      </div>
                      {/* Botão de Salvar - MANTIDO AQUI para fácil acesso com o nome */}
                      <button className="btn btn-success mt-3" onClick={handleSaveCharacter}>
                        <i className="bi bi-save me-2"></i>{isCreatingNewCharacter ? "Criar e Salvar" : "Salvar Alterações"}
                      </button>
                  </div>

                  {/* Dados Essenciais com novos campos integrados */}
                  <div className="mt-4 text-center character-essential-attributes">
                    <h5 className="text-highlight-warning section-title">Dados Essenciais</h5>
                    <div className="essential-attributes-grid">
                      {/* Armadura */}
                      <div className="essential-attribute-square" onClick={() => handleEditField('armor')} style={{ cursor: 'pointer' }}>
                          <h6 className="attribute-summary-label">Armadura</h6>
                          {editingField === 'armor' ? (
                              <input
                                  type="number"
                                  className="essential-attribute-input"
                                  value={tempValue as number}
                                  onChange={(e) => handleValueChange(e, 'armor')}
                                  onBlur={() => handleSaveField('armor')}
                                  onKeyDown={(e) => handleKeyPressField(e, 'armor')}
                                  autoFocus
                              />
                          ) : (
                              <div className="attribute-summary-value">{essentialAttributes.armor}</div>
                          )}
                      </div>

                      {/* Iniciativa */}
                      <div className="essential-attribute-square" onClick={() => handleEditField('initiative')} style={{ cursor: 'pointer' }}>
                          <h6 className="attribute-summary-label">Iniciativa</h6>
                          {editingField === 'initiative' ? (
                              <input
                                  type="text"
                                  className="essential-attribute-input"
                                  value={tempValue as string}
                                  onChange={(e) => handleValueChange(e, 'initiative')}
                                  onBlur={() => handleSaveField('initiative')}
                                  onKeyDown={(e) => handleKeyPressField(e, 'initiative')}
                                  autoFocus
                              />
                          ) : (
                              <div className="attribute-summary-value">{essentialAttributes.initiative}</div>
                          )}
                      </div>

                      {/* Proeficiência */}
                      <div className="essential-attribute-square" onClick={() => handleEditField('proficiency')} style={{ cursor: 'pointer' }}>
                          <h6 className="attribute-summary-label">Proeficiência</h6>
                          {editingField === 'proficiency' ? (
                              <input
                                  type="text"
                                  className="essential-attribute-input"
                                  value={tempValue as string}
                                  onChange={(e) => handleValueChange(e, 'proficiency')}
                                  onBlur={() => handleSaveField('proficiency')}
                                  onKeyDown={(e) => handleKeyPressField(e, 'proficiency')}
                                  autoFocus
                              />
                          ) : (
                              <div className="attribute-summary-value">{essentialAttributes.proficiency}</div>
                          )}
                      </div>

                      {/* Velocidade */}
                      <div className="essential-attribute-square" onClick={() => handleEditField('speed')} style={{ cursor: 'pointer' }}>
                          <h6 className="attribute-summary-label">Velocidade</h6>
                          {editingField === 'speed' ? (
                              <input
                                  type="text"
                                  className="essential-attribute-input"
                                  value={tempValue as string}
                                  onChange={(e) => handleValueChange(e, 'speed')}
                                  onBlur={() => handleSaveField('speed')}
                                  onKeyDown={(e) => handleKeyPressField(e, 'speed')}
                                  autoFocus
                              />
                          ) : (
                              <div className="attribute-summary-value">{essentialAttributes.speed}</div>
                          )}
                      </div>

                      {/* NOVO: HP Máximo */}
                      <div className="essential-attribute-square" onClick={() => handleEditField('maxHp')} style={{ cursor: 'pointer' }}>
                          <h6 className="attribute-summary-label">HP Máximo</h6>
                          {editingField === 'maxHp' ? (
                              <input
                                  type="number"
                                  className="essential-attribute-input"
                                  value={tempValue as number}
                                  onChange={(e) => handleValueChange(e, 'maxHp')}
                                  onBlur={() => handleSaveField('maxHp')}
                                  onKeyDown={(e) => handleKeyPressField(e, 'maxHp')}
                                  autoFocus
                              />
                          ) : (
                              <div className="attribute-summary-value">{maxHp}</div>
                          )}
                      </div>

                      {/* NOVO: HP Atual */}
                      <div className="essential-attribute-square" onClick={() => handleEditField('currentHp')} style={{ cursor: 'pointer' }}>
                          <h6 className="attribute-summary-label">HP Atual</h6>
                          {editingField === 'currentHp' ? (
                              <input
                                  type="number"
                                  className="essential-attribute-input"
                                  value={tempValue as number}
                                  onChange={(e) => handleValueChange(e, 'currentHp')}
                                  onBlur={() => handleSaveField('currentHp')}
                                  onKeyDown={(e) => handleKeyPressField(e, 'currentHp')}
                                  autoFocus
                              />
                          ) : (
                              <div className="attribute-summary-value">{currentHp}</div>
                          )}
                      </div>

                      {/* NOVO: Raça */}
                      <div className="essential-attribute-square" onClick={() => handleEditField('race')} style={{ cursor: 'pointer' }}>
                          <h6 className="attribute-summary-label">Raça</h6>
                          {editingField === 'race' ? (
                              <input
                                  type="text"
                                  className="essential-attribute-input"
                                  value={tempValue as string}
                                  onChange={(e) => handleValueChange(e, 'race')}
                                  onBlur={() => handleSaveField('race')}
                                  onKeyDown={(e) => handleKeyPressField(e, 'race')}
                                  autoFocus
                              />
                          ) : (
                              <div className="attribute-summary-value">{race}</div>
                          )}
                      </div>

                      {/* NOVO: Classe */}
                      <div className="essential-attribute-square" onClick={() => handleEditField('charClass')} style={{ cursor: 'pointer' }}>
                          <h6 className="attribute-summary-label">Classe</h6>
                          {editingField === 'charClass' ? (
                              <input
                                  type="text"
                                  className="essential-attribute-input"
                                  value={tempValue as string}
                                  onChange={(e) => handleValueChange(e, 'charClass')}
                                  onBlur={() => handleSaveField('charClass')}
                                  onKeyDown={(e) => handleKeyPressField(e, 'charClass')}
                                  autoFocus
                              />
                          ) : (
                              <div className="attribute-summary-value">{charClass}</div>
                          )}
                      </div>

                      {/* NOVO: Nível */}
                      <div className="essential-attribute-square" onClick={() => handleEditField('level')} style={{ cursor: 'pointer' }}>
                          <h6 className="attribute-summary-label">Nível</h6>
                          {editingField === 'level' ? (
                              <input
                                  type="number"
                                  className="essential-attribute-input"
                                  value={tempValue as number}
                                  onChange={(e) => handleValueChange(e, 'level')}
                                  onBlur={() => handleSaveField('level')}
                                  onKeyDown={(e) => handleKeyPressField(e, 'level')}
                                  autoFocus
                              />
                          ) : (
                              <div className="attribute-summary-value">{level}</div>
                          )}
                      </div>

                      {/* NOVO: XP */}
                      <div className="essential-attribute-square" onClick={() => handleEditField('xp')} style={{ cursor: 'pointer' }}>
                          <h6 className="attribute-summary-label">XP</h6>
                          {editingField === 'xp' ? (
                              <input
                                  type="number"
                                  className="essential-attribute-input"
                                  value={tempValue as number}
                                  onChange={(e) => handleValueChange(e, 'xp')}
                                  onBlur={() => handleSaveField('xp')}
                                  onKeyDown={(e) => handleKeyPressField(e, 'xp')}
                                  autoFocus
                              />
                          ) : (
                              <div className="attribute-summary-value">{xp}</div>
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
              <div className="h-100 justify-content-center py-3">
                <div className="col-lg-10 col-md-11 col-sm-12">
                  <h3 className="text-highlight-warning mb-4 text-center">Bio: Detalhes do Personagem</h3>
                  <div className="row g-3">
                    <div className="col-md-6 d-flex flex-column gap-3">
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioHistory" className="form-label field-label text-highlight-warning small">História</label>
                        {editingBioField === 'history' ? (
                            <textarea
                                id="bioHistory"
                                className="form-control bg-dark text-light-base border-secondary"
                                rows={6}
                                value={bioFields.history}
                                onChange={(e) => handleBioFieldChange('history', e.target.value)}
                                onBlur={(e) => handleSaveBioField('history', e.target.value)}
                                onKeyDown={(e) => handleKeyPressBioField(e, 'history', e.currentTarget.value, bioFields.history)}
                                autoFocus
                            ></textarea>
                        ) : (
                            <textarea
                                id="bioHistory"
                                className="form-control bg-dark text-light-base border-secondary"
                                rows={6}
                                value={bioFields.history}
                                readOnly
                                onClick={() => handleEditBioField('history')}
                                placeholder="A história do seu personagem..."
                            ></textarea>
                        )}
                      </div>
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioPersonality" className="form-label field-label text-highlight-warning small">Personalidade</label>
                        {editingBioField === 'personality' ? (
                            <textarea
                                id="bioPersonality"
                                className="form-control bg-dark text-light-base border-secondary"
                                rows={6}
                                value={bioFields.personality}
                                onChange={(e) => handleBioFieldChange('personality', e.target.value)}
                                onBlur={(e) => handleSaveBioField('personality', e.target.value)}
                                onKeyDown={(e) => handleKeyPressBioField(e, 'personality', e.currentTarget.value, bioFields.personality)}
                                autoFocus
                            ></textarea>
                        ) : (
                            <textarea
                                id="bioPersonality"
                                className="form-control bg-dark text-light-base border-secondary"
                                rows={6}
                                value={bioFields.personality}
                                readOnly
                                onClick={() => handleEditBioField('personality')}
                                placeholder="Traços de personalidade, ideais, laços, falhas..."
                            ></textarea>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6 d-flex flex-column gap-3">
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioAppearance" className="form-label field-label text-highlight-warning small">Aparência</label>
                        {editingBioField === 'appearance' ? (
                            <textarea
                                id="bioAppearance"
                                className="form-control bg-dark text-light-base border-secondary"
                                rows={6}
                                value={bioFields.appearance}
                                onChange={(e) => handleBioFieldChange('appearance', e.target.value)}
                                onBlur={(e) => handleSaveBioField('appearance', e.target.value)}
                                onKeyDown={(e) => handleKeyPressBioField(e, 'appearance', e.currentTarget.value, bioFields.appearance)}
                                autoFocus
                            ></textarea>
                        ) : (
                            <textarea
                                id="bioAppearance"
                                className="form-control bg-dark text-light-base border-secondary"
                                rows={6}
                                value={bioFields.appearance}
                                readOnly
                                onClick={() => handleEditBioField('appearance')}
                                placeholder="Descrição física do seu personagem..."
                            ></textarea>
                        )}
                      </div>
                      <div className="card custom-card-base p-3 text-light-base content-card">
                        <label htmlFor="bioTreasure" className="form-label field-label text-highlight-warning small">Tesouro & Equipamento</label>
                        {editingBioField === 'treasure' ? (
                            <textarea
                                id="bioTreasure"
                                className="form-control bg-dark text-light-base border-secondary"
                                rows={6}
                                value={bioFields.treasure}
                                onChange={(e) => handleBioFieldChange('treasure', e.target.value)}
                                onBlur={(e) => handleSaveBioField('treasure', e.target.value)}
                                onKeyDown={(e) => handleKeyPressBioField(e, 'treasure', e.currentTarget.value, bioFields.treasure)}
                                autoFocus
                            ></textarea>
                        ) : (
                            <textarea
                                id="bioTreasure"
                                className="form-control bg-dark text-light-base border-secondary"
                                rows={6}
                                value={bioFields.treasure}
                                readOnly
                                onClick={() => handleEditBioField('treasure')}
                                placeholder="Itens importantes, ouro, equipamento..."
                            ></textarea>
                        )}
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
            characterId={characterId || 0}
            onSaveAction={handleSaveAction}
            onEditAction={handleUpdateActionInDb}
            actionToEdit={actionToEdit}
            onCancelEdit={handleCloseActionCreatorModal}
        />
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        show={showConfirmModal}
        title={confirmModalTitle}
        message={confirmModalMessage}
        onConfirm={confirmModalOnConfirm}
        onClose={closeConfirmModal}
        showCancelButton={true}
        confirmButtonText="Confirmar"
      />

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