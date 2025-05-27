import React, { useState, useEffect, useRef } from 'react';
import { CharacterAction, RawSpellData } from '../../types'; // Importado CharacterAction
import { v4 as uuidv4 } from 'uuid';
import SimpleAlertModal from '../modals/SimpleAlert';
import ConfirmationModal from '../modals/ConfirmationModal'; // Certifique-se que o caminho está correto
import magicData from './MAGIAS.json'; // Ajuste o caminho se necessário!

// --- Funções Auxiliares (fora do componente para evitar recriação desnecessária) ---
const normalizeString = (str: string): string => {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const processEntries = (entriesArray: Array<string | any> | undefined): string => {
  if (!entriesArray || !Array.isArray(entriesArray)) return '';

  return entriesArray.map(entry => {
    if (typeof entry === 'string') return entry;
    if (typeof entry === 'object' && entry !== null) {
      if (Array.isArray(entry.entries)) {
        return entry.entries.map((subEntry: string | any) => typeof subEntry === 'string' ? subEntry : JSON.stringify(subEntry)).join('\n');
      }
      if (entry.type === 'list' && Array.isArray(entry.items)) {
        return entry.items.map((item: string) => `  • ${item}`).join('\n');
      }
      return entry.name || JSON.stringify(entry);
    }
    return JSON.stringify(entry);
  }).join('\n\n');
};

const SCHOOL_MAP: { [key: string]: string } = {
  "A": "Abjuração", "C": "Conjuração", "D": "Adivinhação", "En": "Encantamento",
  "Ev": "Evocação", "I": "Ilusão", "N": "Nigromancia", "T": "Transmutação"
};
const SAVE_TYPE_MAP: { [key: string]: string } = {
  "str": "Força", "dex": "Destreza", "con": "Constituição",
  "int": "Inteligência", "wis": "Sabedoria", "cha": "Carisma",
  "strength": "Força", "dexterity": "Destreza", "constitution": "Constituição",
  "intelligence": "Inteligência", "wisdom": "Sabedoria", "charisma": "Carisma"
};
const UNIT_MAP: { [key: string]: string } = {
  "action": "Ação", "bonus": "Ação Bônus", "reaction": "Reação",
  "minute": "Minuto", "hour": "Hora", "day": "Dia", "round": "Rodada",
  "feet": "pés", "foot": "pé", "miles": "milhas"
};
const DURATION_TYPE_MAP: { [key: string]: string } = {
    "instant": "Instantâneo",
    "until_dispelled": "Até ser Dissipada",
    "special": "Especial"
};
const OUTCOME_MAP: { [key: string]: string } = {
    "half": "metade do dano",
    "negates": "nega o dano",
    "none": "sem efeito"
};

// --- Props do Componente ---
interface ActionCreatorProps {
  onSaveAction: (action: CharacterAction) => void; // Tipo alterado
  actionToEdit: CharacterAction | null; // Tipo alterado
  onCancelEdit: () => void;
}

const ActionCreator: React.FC<ActionCreatorProps> = ({ onSaveAction, actionToEdit, onCancelEdit }) => {
   
  // --- Estados ---
  const [predefinedSpells, setPredefinedSpells] = useState<RawSpellData[]>([]);
  const [loadingSpells, setLoadingSpells] = useState<boolean>(true);
  const [spellLoadError, setSpellLoadError] = useState<string | null>(null);

  // Estados do formulário, renomeado 'actionType' para 'mainType'
  const [mainType, setMainType] = useState<'attack' | 'spell' | 'utility' | 'ability'>('attack'); // Adicionado 'utility' e 'ability'
  const [effectCategory, setEffectCategory] = useState<'damage' | 'utility' | 'healing'>('damage'); // Adicionado 'healing'
  const [actionName, setActionName] = useState<string>('');
  const [description, setDescription] = useState<string>(''); // Movido para campo comum

  // Campos de Dano
  const [damageDice, setDamageDice] = useState<string>('');
  const [damageModifier, setDamageModifier] = useState<string>('');
  const [damageType, setDamageType] = useState<string>('');

  // Campos de Utilidade
  const [utilityTitle, setUtilityTitle] = useState<string>('');
  const [utilityValue, setUtilityValue] = useState<string>('');

   // Estados para o modal de ALERTA SIMPLES (para sucesso, exibir no chat)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalTitle, setAlertModalTitle] = useState('');
  const [alertModalMessage, setAlertModalMessage] = useState<string | React.ReactNode>('');

  // Estados para o ConfirmationModal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState<string | React.ReactNode>('');
  const [confirmModalOnConfirm, setConfirmModalOnConfirm] = useState<(() => void) | undefined>(undefined);


  // Campos de Cura
  const [healingDice, setHealingDice] = useState<string>(''); // Novo campo para dados de cura

  // Campos comuns de alcance
  const [range, setRange] = useState<string>(''); // Renomeado para 'attackRange' no tipo, mas mantido aqui para compatibilidade
  const [target, setTarget] = useState<string>(''); // Novo campo para alvo

  // Campos específicos para Ataques
  const [properties, setProperties] = useState<string>('');

  // Campos específicos para Magias
  const [spellLevel, setSpellLevel] = useState<string>('0');
  const [castingTime, setCastingTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [saveDC, setSaveDC] = useState<string>('');
  const [spellSchool, setSpellSchool] = useState<string>('');

  // Estado para o input de busca de magia predefinida
  const [selectedPredefinedSpellName, setSelectedPredefinedSpellName] = useState<string>('');

  // Funções para o SimpleAlertModal
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

  // Funções para o ConfirmationModal
  const openConfirmModal = (
    title: string,
    message: string | React.ReactNode,
    onConfirm: (() => void) | undefined
  ) => {
    setConfirmModalTitle(title);
    setConfirmModalMessage(message);
    setConfirmModalOnConfirm(() => onConfirm); // Passa a função diretamente
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setConfirmModalTitle('');
    setConfirmModalMessage('');
    setConfirmModalOnConfirm(undefined);
  };


  // --- Efeitos ---
  useEffect(() => {
    try {
      if (magicData && Array.isArray(magicData.spell)) {
        setPredefinedSpells(magicData.spell);
        setLoadingSpells(false);
      } else {
        setSpellLoadError("O JSON importado não contém um array 'spell' válido.");
        setLoadingSpells(false);
      }
    } catch (e: any) {
      setSpellLoadError(`Erro ao processar JSON importado: ${e.message}`);
      setLoadingSpells(false);
    }
  }, []);

  // Efeito para carregar a ação a ser editada no formulário
  useEffect(() => {
    if (actionToEdit) {
      // Carrega os campos comuns
      setMainType(actionToEdit.mainType);
      setEffectCategory(actionToEdit.effectCategory);
      setActionName(actionToEdit.name);
      setDescription(actionToEdit.description || ''); // Pode ser opcional

      // Carrega campos de dano
      setDamageDice(actionToEdit.damageDice || '');
      setDamageModifier(''); // Precisaria de uma regex mais robusta para splitar dado+modificador
      setDamageType(actionToEdit.damageType || '');

      // Carrega campos de utilidade
      setUtilityTitle(actionToEdit.utilityTitle || '');
      setUtilityValue(actionToEdit.utilityValue || '');

      // Carrega campos de cura
      setHealingDice(actionToEdit.healingDice || '');

      // Carrega campos de alcance e alvo
      setRange(actionToEdit.attackRange || ''); // 'attackRange' na interface, 'range' aqui
      setTarget(actionToEdit.target || '');

      // Carrega campos de ataque
      setProperties(actionToEdit.properties ? actionToEdit.properties.join(', ') : '');

      // Carrega campos de magia
      setSpellLevel(actionToEdit.level?.toString() || '0');
      setCastingTime(actionToEdit.castingTime || '');
      setDuration(actionToEdit.duration || '');
      setSaveDC(actionToEdit.saveDC || '');
      setSpellSchool(actionToEdit.school || '');

      setSelectedPredefinedSpellName(actionToEdit.name);
    } else {
      clearFormFields(true);
    }
  }, [actionToEdit]);

  // --- Funções de Manipulação ---
  const clearFormFields = (resetTypes: boolean = true) => {
    setActionName('');
    setDescription('');
    setDamageDice('');
    setDamageModifier('');
    setDamageType('');
    setUtilityTitle('');
    setUtilityValue('');
    setHealingDice(''); // Limpa o campo de cura
    setRange('');
    setTarget(''); // Limpa o campo de alvo
    setProperties('');
    setSpellLevel('0');
    setCastingTime('');
    setDuration('');
    setSaveDC('');
    setSpellSchool('');
    setSelectedPredefinedSpellName('');
    if (resetTypes) {
        setMainType('attack'); // Reinicia para 'attack'
        setEffectCategory('damage'); // Reinicia para 'damage'
    }
  };

  const handleMainTypeChange = (type: 'attack' | 'spell' | 'utility' | 'ability') => {
    setMainType(type);
    clearFormFields(false); // Não reseta o tipo principal, mas limpa os outros campos
    // Define um effectCategory padrão com base no mainType, se desejar
    if (type === 'attack' || type === 'spell') {
        setEffectCategory('damage');
    } else if (type === 'utility') {
        setEffectCategory('utility');
    } else { // 'ability'
        setEffectCategory('utility'); // Ou outro padrão para 'ability'
    }
  };

  const handleEffectCategoryChange = (type: 'damage' | 'utility' | 'healing') => {
    setEffectCategory(type);
    // Limpar campos irrelevantes com base no novo effectCategory
    if (type === 'damage') {
        setUtilityTitle('');
        setUtilityValue('');
        setHealingDice('');
    } else if (type === 'utility') {
        setDamageDice('');
        setDamageModifier('');
        setDamageType('');
        setHealingDice('');
    } else { // 'healing'
        setDamageDice('');
        setDamageModifier('');
        setDamageType('');
        setUtilityTitle('');
        setUtilityValue('');
    }
  };

  const handlePredefinedSpellSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const spellName = e.target.value;
    setSelectedPredefinedSpellName(spellName);

    if (spellName === "") {
      clearFormFields();
      return;
    }

    const spell = predefinedSpells.find(s => s.name === spellName);
    if (spell) {
      setMainType('spell'); // Define o tipo principal como 'spell'
      setActionName(spell.name);
      setDescription(processEntries(spell.entries)); // Descrição da magia

      // Determinar effectCategory
      if (spell.damage || spell.damageType) {
          setEffectCategory('damage');
          setDamageDice(spell.damage || '');
          setDamageType(spell.damageType || '');
          setHealingDice(''); // Certifica que o campo de cura está vazio
          setUtilityTitle('');
          setUtilityValue('');
      } else if (spell.healingDice) { // Se o JSON de magias tiver um campo de cura
          setEffectCategory('healing');
          setHealingDice(spell.healingDice);
          setDamageDice('');
          setDamageType('');
          setUtilityTitle('');
          setUtilityValue('');
      }
      else {
          setEffectCategory('utility');
          setUtilityTitle(spell.name); // Pode ser o nome da magia como título da utilidade
          setUtilityValue('');
          setDamageDice('');
          setDamageType('');
          setHealingDice('');
      }

      let formattedRange = '';
      if (spell.range && spell.range.type) {
          if (spell.range.type === 'point' && spell.range.distance) {
              formattedRange = `${spell.range.distance.amount} ${UNIT_MAP[spell.range.distance.type] || spell.range.distance.type}`;
          } else if (spell.range.type === 'radius' && spell.range.distance) {
              formattedRange = `${spell.range.distance.amount} ${UNIT_MAP[spell.range.distance.type] || spell.range.distance.type} de raio`;
          } else if (spell.range.type === 'cone' && spell.range.distance) {
              formattedRange = `${spell.range.distance.amount} ${UNIT_MAP[spell.range.distance.type] || spell.range.distance.type} de cone`;
          } else if (spell.range.type === 'hemisphere' && spell.range.distance) {
              formattedRange = `${spell.range.distance.amount} ${UNIT_MAP[spell.range.distance.type] || spell.range.distance.type} de hemisfério`;
          } else if (spell.range.type === 'sphere' && spell.range.distance) {
              formattedRange = `${spell.range.distance.amount} ${UNIT_MAP[spell.range.distance.type] || spell.range.distance.type} de esfera`;
          }
          else {
              formattedRange = spell.range.type === 'touch' ? 'Toque' : spell.range.type === 'self' ? 'Pessoal' : spell.range.type;
          }
      }
      setRange(formattedRange);
      setProperties(''); // Magias geralmente não têm 'properties' de ataque

      let level = '0';
      if (spell.level !== undefined) {
          if (typeof spell.level === 'string' && spell.level.toLowerCase() === 'cantrip') {
              level = '0';
          } else if (typeof spell.level === 'number') {
              level = spell.level.toString();
          } else {
              const match = String(spell.level).match(/\d+/);
              level = match ? match[0] : '0';
          }
      }
      setSpellLevel(level);

      setCastingTime(spell.time && spell.time.length > 0 ? `${spell.time[0].number} ${UNIT_MAP[spell.time[0].unit] || spell.time[0].unit}${spell.time[0].number > 1 && (spell.time[0].unit === 'minute' || spell.time[0].unit === 'hour') ? 's' : ''}` : '');

      let formattedDuration = '';
      if (spell.duration && spell.duration.length > 0) {
          const dur = spell.duration[0];
          if (dur.type === 'timed' && dur.duration) {
              formattedDuration = `${dur.duration.amount} ${UNIT_MAP[dur.duration.type] || dur.duration.type}${dur.duration.amount > 1 && dur.duration.type !== 'instant' ? 's' : ''}`;
          } else {
              formattedDuration = DURATION_TYPE_MAP[dur.type] || dur.type;
          }
          if (dur.concentration) {
              formattedDuration = `Concentração, até ${formattedDuration}`;
          }
      }
      setDuration(formattedDuration);

      setSpellSchool(SCHOOL_MAP[spell.school] || spell.school || '');

      let saveDCString = '';
      if (spell.save && spell.save.length > 0) {
          spell.save.forEach(s => {
              if (s.type) {
                  const translatedType = SAVE_TYPE_MAP[s.type] || s.type.charAt(0).toUpperCase() + s.type.slice(1);
                  saveDCString += `${translatedType}`;
                  if (s.outcome) {
                      saveDCString += ` (${OUTCOME_MAP[s.outcome] || s.outcome})`;
                  }
                  saveDCString += ', ';
              }
          });
          saveDCString = saveDCString.slice(0, -2);
      } else if (spell.opposedCheck && spell.opposedCheck.length > 0) {
          const translatedCheckType = SAVE_TYPE_MAP[spell.opposedCheck[0]] || spell.opposedCheck[0].charAt(0).toUpperCase() + spell.opposedCheck[0].slice(1);
          saveDCString = `${translatedCheckType} (Teste Oposto)`;
      }
      setSaveDC(saveDCString);

      // A descrição já foi preenchida no início
    }
  };
  
  const handleSave = () => {
    // Validação do Nome da Ação
    if (!actionName.trim()) {
        openAlertModal("Nome da Ação Obrigatório", "Por favor, preencha o nome da ação.");
        return; // É crucial retornar aqui para parar a execução da função
    }

    // Validações adicionais baseadas nos tipos de efeito (usando openAlertModal)
    if (effectCategory === 'damage') {
      if (!damageDice.trim() && !damageModifier.trim()) {
        openAlertModal('Dados de Dano Obrigatórios', 'Dados de dano ou modificador são obrigatórios para ações de dano!');
        return;
      }
      if (!damageType.trim()) {
        openAlertModal('Tipo de Dano Obrigatório', 'Tipo de dano é obrigatório para ações de dano!');
        return;
      }
    } else if (effectCategory === 'healing') {
        if (!healingDice.trim()) {
            openAlertModal('Dados de Cura Obrigatórios', 'Dados de cura são obrigatórios para ações de cura!');
            return;
        }
    } else if (effectCategory === 'utility') {
        if (!utilityTitle.trim()) {
            openAlertModal('Título da Utilidade Obrigatório', 'Título da utilidade é obrigatório para ações de utilidade!');
            return;
        }
    }

    if (mainType === 'spell' && !description.trim()) {
        openAlertModal('Descrição da Magia Obrigatória', 'Descrição da magia é obrigatória para magias!');
        return;
    }

    // Se todas as validações passarem, proceda com a criação/atualização da ação
    const newAction: CharacterAction = {
      id: actionToEdit ? actionToEdit.id : uuidv4(),
      name: actionName.trim(),
      description: description.trim() || undefined,
      mainType: mainType,
      effectCategory: effectCategory,
      isFavorite: actionToEdit?.isFavorite || false,

      // Propriedades opcionais, serão undefined se não preenchidas
      damageDice: (effectCategory === 'damage' && damageDice.trim()) ? damageDice.trim() : undefined,
      damageType: (effectCategory === 'damage' && damageType.trim()) ? damageType.trim() : undefined,
      healingDice: (effectCategory === 'healing' && healingDice.trim()) ? healingDice.trim() : undefined,
      utilityTitle: (effectCategory === 'utility' && utilityTitle.trim()) ? utilityTitle.trim() : undefined,
      utilityValue: (effectCategory === 'utility' && utilityValue.trim()) ? utilityValue.trim() : undefined,
      attackRange: range.trim() || undefined,
      target: target.trim() || undefined,
      properties: (mainType === 'attack' && properties.trim()) ? properties.split(',').map(p => p.trim()).filter(p => p) : undefined,

      // Propriedades de Magia (sempre opcional se mainType não for 'spell')
      level: (mainType === 'spell' && spellLevel.trim() !== '' && !isNaN(parseInt(spellLevel, 10))) ? parseInt(spellLevel, 10) : undefined,
      castingTime: (mainType === 'spell' && castingTime.trim()) ? castingTime.trim() : undefined,
      duration: (mainType === 'spell' && duration.trim()) ? duration.trim() : undefined,
      saveDC: (mainType === 'spell' && saveDC.trim()) ? saveDC.trim() : undefined,
      school: (mainType === 'spell' && spellSchool.trim()) ? spellSchool.trim() : undefined,
    };

    // Exemplo de como usar ConfirmationModal antes de salvar (opcional)
    // Se você quiser uma confirmação antes de salvar, descomente este bloco
    // e comente as 3 linhas abaixo (onSaveAction, clearFormFields, onCancelEdit)
    /*
    openConfirmModal(
      "Confirmar Salvamento",
      "Tem certeza que deseja salvar esta ação?",
      () => {
        onSaveAction(newAction);
        clearFormFields();
        onCancelEdit();
      }
    );
    */

    // Se não usar ConfirmationModal para o salvamento final, execute as ações diretamente:
    onSaveAction(newAction);
    clearFormFields();
    onCancelEdit();
  };

  return (
    <div className="card bg-dark border-secondary text-white h-100 p-3 action-creator-card">
      <h5 className="card-title text-warning mb-3">{actionToEdit ? 'Editar Ação' : 'Criar Nova Ação'}</h5>

      <div className="card-body p-0 custom-scroll overflow-auto">
        {/* ... (restante do seu formulário) ... */}
        {/* Área de Pesquisa de Magia Predefinida */}
        <div className="mb-3">
          <label htmlFor="spellSearchInput" className="form-label small text-light">Buscar Magia Predefinida:</label>
          <input
            type="text"
            id="spellSearchInput"
            className="form-control form-control-sm bg-dark text-white border-secondary"
            list="predefinedSpellsDatalist"
            placeholder="Comece a digitar o nome da magia..."
            autoComplete="off"
            disabled={loadingSpells || !!actionToEdit}
            onChange={handlePredefinedSpellSelect}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSelectedPredefinedSpellName(e.target.value);
              const searchTerm = normalizeString(e.target.value);
              const filteredOptions = predefinedSpells.filter(spell =>
                normalizeString(spell.name).includes(searchTerm)
              ).slice(0, 20).map(spell => `<option value="${spell.name}"></option>`).join('');
              const datalist = document.getElementById('predefinedSpellsDatalist');
              if (datalist) datalist.innerHTML = filteredOptions;
            }}
            value={selectedPredefinedSpellName}
          />
          <datalist id="predefinedSpellsDatalist"></datalist>
          {loadingSpells && <small id="spellLoadStatus" className="text-info mt-1 d-block">Carregando magias...</small>}
          {spellLoadError && <small className="text-danger mt-1 d-block">{spellLoadError}</small>}
        </div>

        <hr className="border-secondary my-3"/>

        {/* Tipo Principal de Ação (Ataque, Magia, Utilidade, Habilidade) */}
        <div className="mb-3">
          <label className="form-label small text-light">Ou Crie Manualmente - Tipo Principal:</label>
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${mainType === 'attack' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleMainTypeChange('attack')}
              disabled={!!actionToEdit}
            >
              <i className="bi bi-sword me-2"></i>Ataque
            </button>
            <button
              type="button"
              className={`btn ${mainType === 'spell' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleMainTypeChange('spell')}
              disabled={!!actionToEdit}
            >
              <i className="bi bi-stars me-2"></i>Magia
            </button>
            {/* Adicione botões para 'utility' e 'ability' se desejar um formulário para criá-los diretamente */}
            {/* Exemplo: */}
            <button
                type="button"
                className={`btn ${mainType === 'ability' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => handleMainTypeChange('ability')}
                disabled={!!actionToEdit}
            >
                <i className="bi bi-person-badge me-2"></i>Habilidade
            </button>
          </div>
        </div>

        {/* Nome da Ação */}
        <div className="mb-3">
          <label htmlFor="actionName" className="form-label small text-light">Nome da Ação:</label>
          <input
            type="text"
            id="actionName"
            className="form-control form-control-sm bg-dark text-white border-secondary"
            value={actionName}
            onChange={(e) => setActionName(e.target.value)}
            placeholder="Ex: Espada Longa, Bola de Fogo, Inspiração Bárdica"
          />
        </div>

        {/* Descrição - comum para todos os tipos */}
        <div className="mb-3">
            <label htmlFor="description" className="form-label small text-light">Descrição / Efeito:</label>
            <textarea
                id="description"
                className="form-control form-control-sm bg-dark text-white border-secondary"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Breve descrição da ação e seus efeitos..."
            ></textarea>
        </div>


        {/* Seleção de Categoria de Efeito (Dano, Utilidade, Cura) */}
        <div className="mb-3">
          <label className="form-label small text-light">Categoria de Efeito:</label>
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${effectCategory === 'damage' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleEffectCategoryChange('damage')}
            >
              <i className="bi bi-fire me-2"></i>Dano
            </button>
            <button
              type="button"
              className={`btn ${effectCategory === 'utility' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleEffectCategoryChange('utility')}
            >
              <i className="bi bi-lightbulb me-2"></i>Utilidade
            </button>
            <button
              type="button"
              className={`btn ${effectCategory === 'healing' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleEffectCategoryChange('healing')}
            >
              <i className="bi bi-heart-pulse me-2"></i>Cura
            </button>
          </div>
        </div>

        {/* Campos relacionados a Dano */}
        {effectCategory === 'damage' && (
          <div>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label htmlFor="damageDice" className="form-label small text-light">Dados de Dano (ex: 1d8):</label>
                <input
                  type="text"
                  id="damageDice"
                  className="form-control form-control-sm bg-dark text-white border-secondary"
                  value={damageDice}
                  onChange={(e) => setDamageDice(e.target.value)}
                  placeholder="Ex: 1d8"
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="damageModifier" className="form-label small text-light">Modificador de Dano (ex: +3):</label>
                <input
                  type="text"
                  id="damageModifier"
                  className="form-control form-control-sm bg-dark text-white border-secondary"
                  value={damageModifier}
                  onChange={(e) => setDamageModifier(e.target.value)}
                  placeholder="Ex: +3"
                />
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor="damageType" className="form-label small text-light">Tipo de Dano (ex: Cortante, Fogo):</label>
              <input
                type="text"
                id="damageType"
                className="form-control form-control-sm bg-dark text-white border-secondary"
                value={damageType}
                onChange={(e) => setDamageType(e.target.value)}
                placeholder="Ex: Perfurante, Radiante"
              />
            </div>
          </div>
        )}

        {/* Campos relacionados a Cura */}
        {effectCategory === 'healing' && (
          <div className="mb-3">
            <label htmlFor="healingDice" className="form-label small text-light">Dados de Cura (ex: 1d4+2):</label>
            <input
              type="text"
              id="healingDice"
              className="form-control form-control-sm bg-dark text-white border-secondary"
              value={healingDice}
              onChange={(e) => setHealingDice(e.target.value)}
              placeholder="Ex: 1d4+2"
            />
          </div>
        )}

        {/* Campos relacionados a Utilidade */}
        {effectCategory === 'utility' && (
          <div>
            <div className="mb-3">
              <label htmlFor="utilityTitle" className="form-label small text-light">Título da Utilidade (ex: Cura, Buff):</label>
              <input
                type="text"
                id="utilityTitle"
                className="form-control form-control-sm bg-dark text-white border-secondary"
                value={utilityTitle}
                onChange={(e) => setUtilityTitle(e.target.value)}
                placeholder="Ex: Cura, Buff, Controle"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="utilityValue" className="form-label small text-light">Valor/Detalhes de Utilidade (ex: 1d6, +2 CA):</label>
              <input
                type="text"
                id="utilityValue"
                className="form-control form-control-sm bg-dark text-white border-secondary"
                value={utilityValue}
                onChange={(e) => setUtilityValue(e.target.value)}
                placeholder="Ex: 1d6, +2 CA, Desvantagem"
              />
            </div>
          </div>
        )}

        <div className="mb-3">
          <label htmlFor="range" className="form-label small text-light">Alcance (ex: 1.5m, 18m):</label>
          <input
            type="text"
            id="range"
            className="form-control form-control-sm bg-dark text-white border-secondary"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="Ex: 1.5m, 30/120ft"
          />
        </div>

        <div className="mb-3">
            <label htmlFor="target" className="form-label small text-light">Alvo (ex: Um Criatura, Área, Pessoal):</label>
            <input
                type="text"
                id="target"
                className="form-control form-control-sm bg-dark text-white border-secondary"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Ex: Uma criatura, Área de 15ft, Pessoal"
            />
        </div>


        {/* Campos específicos para Ataques Físicos */}
        {mainType === 'attack' && (
          <div>
            <div className="mb-3">
              <label htmlFor="properties" className="form-label small text-light">Propriedades (separadas por vírgula):</label>
              <input
                type="text"
                id="properties"
                className="form-control form-control-sm bg-dark text-white border-secondary"
                value={properties}
                onChange={(e) => setProperties(e.target.value)}
                placeholder="Ex: Versátil (1d10), Acuidade, Pesado"
              />
            </div>
          </div>
        )}

        {/* Campos específicos para Magias */}
        {mainType === 'spell' && (
          <div>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label htmlFor="spellLevel" className="form-label small text-light">Nível da Magia (0 para Truque):</label>
                <input
                  type="number"
                  id="spellLevel"
                  className="form-control form-control-sm bg-dark text-white border-secondary"
                  value={spellLevel}
                  onChange={(e) => setSpellLevel(e.target.value)}
                  min="0"
                  max="9"
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="castingTime" className="form-label small text-light">Tempo de Conjuração:</label>
                <input
                  type="text"
                  id="castingTime"
                  className="form-control form-control-sm bg-dark text-white border-secondary"
                  value={castingTime}
                  onChange={(e) => setCastingTime(e.target.value)}
                  placeholder="Ex: 1 Ação, 1 Reação"
                />
              </div>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label htmlFor="duration" className="form-label small text-light">Duração:</label>
                <input
                  type="text"
                  id="duration"
                  className="form-control form-control-sm bg-dark text-white border-secondary"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Ex: Concentração (1 minuto), Instantâneo"
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="spellSchool" className="form-label small text-light">Escola da Magia:</label>
                <input
                  type="text"
                  id="spellSchool"
                  className="form-control form-control-sm bg-dark text-white border-secondary"
                  value={spellSchool}
                  onChange={(e) => setSpellSchool(e.target.value)}
                  placeholder="Ex: Evocação, Ilusão"
                />
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="saveDC" className="form-label small text-light">Teste de Resistência / Efeito (ex: Sabedoria, Metade do Dano):</label>
              <input
                type="text"
                id="saveDC"
                className="form-control form-control-sm bg-dark text-white border-secondary"
                value={saveDC}
                onChange={(e) => setSaveDC(e.target.value)}
                placeholder="Ex: Força (sem efeito)"
              />
            </div>
          </div>
        )}
      </div>

      <div className="card-footer bg-transparent border-0 pt-3">
        {actionToEdit && (
            <button
                type="button"
                className="btn btn-secondary w-100 mb-2"
                onClick={onCancelEdit}
            >
                <i className="bi bi-x-circle me-2"></i>Cancelar Edição
            </button>
        )}
        <button
          type="button"
          className="btn btn-success w-100"
          onClick={handleSave}
        >
          <i className="bi bi-save me-2"></i>{actionToEdit ? 'Atualizar Ação' : 'Salvar Ação'}
        </button>
      </div>

      {/* Renderização dos Modais de Alerta e Confirmação no return principal */}
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

export default ActionCreator;