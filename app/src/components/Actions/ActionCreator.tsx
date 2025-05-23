// src/components/ActionCreator/ActionCreator.tsx
import React, { useState, useEffect } from 'react';
import { CombatAction, AttackAction, SpellAction, RawSpellData } from '../../types';

// ** IMPORTAÇÃO DIRETA DO JSON **
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
  onSaveAction: (action: CombatAction) => void;
  actionToEdit: CombatAction | null; // Ação a ser editada
  onCancelEdit: () => void; // Função para cancelar o modo de edição
}

const ActionCreator: React.FC<ActionCreatorProps> = ({ onSaveAction, actionToEdit, onCancelEdit }) => {
  // --- Estados ---
  const [predefinedSpells, setPredefinedSpells] = useState<RawSpellData[]>([]);
  const [loadingSpells, setLoadingSpells] = useState<boolean>(true);
  const [spellLoadError, setSpellLoadError] = useState<string | null>(null);

  // Estados do formulário
  const [actionType, setActionType] = useState<'attack' | 'spell'>('attack');
  const [effectType, setEffectType] = useState<'damage' | 'utility'>('damage');
  const [actionName, setActionName] = useState<string>('');

  // Campos de Dano
  const [damageDice, setDamageDice] = useState<string>('');
  const [damageModifier, setDamageModifier] = useState<string>('');
  const [damageType, setDamageType] = useState<string>('');

  // Campos de Utilidade
  const [utilityTitle, setUtilityTitle] = useState<string>('');
  const [utilityValue, setUtilityValue] = useState<string>('');

  const [range, setRange] = useState<string>('');
  const [properties, setProperties] = useState<string>('');

  // Campos específicos para Magias
  const [spellLevel, setSpellLevel] = useState<string>('0');
  const [castingTime, setCastingTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [saveDC, setSaveDC] = useState<string>('');
  const [spellSchool, setSpellSchool] = useState<string>('');

  // Estado para o input de busca de magia predefinida
  const [selectedPredefinedSpellName, setSelectedPredefinedSpellName] = useState<string>('');

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
      setActionType(actionToEdit.type);
      setEffectType(actionToEdit.effectType);
      setActionName(actionToEdit.name);
      setRange(actionToEdit.range);

      if (actionToEdit.effectType === 'damage') {
        const damageParts = (actionToEdit.damage || '').match(/(\d+d\d+)\s*([+-]?\d+)?\s*(.*)/);
        setDamageDice(damageParts?.[1] || '');
        setDamageModifier(damageParts?.[2] || '');
        setDamageType(damageParts?.[3] || '');
        setUtilityTitle('');
        setUtilityValue('');
      } else { // utility
        setDamageDice('');
        setDamageModifier('');
        setDamageType('');
        setUtilityTitle(actionToEdit.utilityTitle || '');
        setUtilityValue(actionToEdit.utilityValue || '');
      }

      if (actionToEdit.type === 'attack') {
        setProperties(actionToEdit.properties ? actionToEdit.properties.join(', ') : '');
      } else { // spell
        setSpellLevel(actionToEdit.level.toString());
        setCastingTime(actionToEdit.castingTime);
        setDuration(actionToEdit.duration);
        setDescription(actionToEdit.description);
        setSaveDC(actionToEdit.saveDC || '');
        setSpellSchool(actionToEdit.school || '');
      }
      setSelectedPredefinedSpellName(actionToEdit.name);
    } else {
      clearFormFields(true);
    }
  }, [actionToEdit]);

  // --- Funções de Manipulação ---
  const clearFormFields = (resetTypes: boolean = true) => {
    setActionName('');
    setDamageDice('');
    setDamageModifier('');
    setDamageType('');
    setUtilityTitle('');
    setUtilityValue('');
    setRange('');
    setProperties('');
    setSpellLevel('0');
    setCastingTime('');
    setDuration('');
    setDescription('');
    setSaveDC('');
    setSpellSchool('');
    setSelectedPredefinedSpellName('');
    if (resetTypes) {
        setActionType('attack');
        setEffectType('damage');
    }
  };

  const handleActionTypeChange = (type: 'attack' | 'spell') => {
    setActionType(type);
    clearFormFields(false);
    setEffectType('damage');
  };

  const handleEffectTypeChange = (type: 'damage' | 'utility') => {
    setEffectType(type);
    if (type === 'damage') {
        setUtilityTitle('');
        setUtilityValue('');
    } else { // type === 'utility'
        setDamageDice('');
        setDamageModifier('');
        setDamageType('');
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
      setActionType('spell');
      setActionName(spell.name);
      
      if (spell.damage || spell.damageType) {
          setEffectType('damage');
          setDamageDice(spell.damage || '');
          setDamageModifier('');
          setDamageType(spell.damageType || '');
          setUtilityTitle('');
          setUtilityValue('');
      } else {
          setEffectType('utility');
          setUtilityTitle(spell.name);
          setUtilityValue('');
          setDamageDice('');
          setDamageModifier('');
          setDamageType('');
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
      setProperties('');

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

      let descriptionText = processEntries(spell.entries);
      if (spell.entriesHigherLevel && spell.entriesHigherLevel.length > 0) {
          descriptionText += `\n\nEm Níveis Maiores: ${processEntries(spell.entriesHigherLevel)}`;
      }
      setDescription(descriptionText);
    }
  };

  const handleSave = () => {
    if (!actionName.trim()) {
      alert('O nome da ação é obrigatório!');
      return;
    }

    let newAction: CombatAction;
    const commonFields = {
      id: actionToEdit ? actionToEdit.id : Date.now().toString(),
      name: actionName.trim(),
      range: range.trim(),
      effectType: effectType,
      utilityTitle: effectType === 'utility' ? utilityTitle.trim() : undefined,
      utilityValue: effectType === 'utility' ? utilityValue.trim() : undefined,
    };

    if (actionType === 'attack') {
      const attackFields: Omit<AttackAction, 'id' | 'name' | 'range' | 'type' | 'effectType' | 'utilityTitle' | 'utilityValue'> = {
        damage: effectType === 'damage' ? `${damageDice.trim()}${damageModifier.trim()} ${damageType.trim()}`.trim() : '',
        properties: properties.split(',').map(p => p.trim()).filter(p => p),
      };

      if (effectType === 'damage') {
        if (!damageDice.trim() && !damageModifier.trim()) {
          alert('Dados de dano ou modificador são obrigatórios para ataques de dano!');
          return;
        }
        if (!damageType.trim()) {
          alert('Tipo de dano é obrigatório para ataques de dano!');
          return;
        }
      }

      newAction = { ...commonFields, ...attackFields, type: 'attack' } as AttackAction;

    } else { // spell
      const spellFields: Omit<SpellAction, 'id' | 'name' | 'range' | 'type' | 'effectType' | 'utilityTitle' | 'utilityValue'> = {
        level: parseInt(spellLevel, 10),
        castingTime: castingTime.trim(),
        duration: duration.trim(),
        description: description.trim(),
        school: spellSchool.trim(),
        damage: effectType === 'damage' ? `${damageDice.trim()}${damageModifier.trim()} ${damageType.trim()}`.trim() : undefined,
        saveDC: saveDC.trim(),
      };

      if (!description.trim()) {
        alert('Descrição da magia é obrigatória!');
        return;
      }

      newAction = { ...commonFields, ...spellFields, type: 'spell' } as SpellAction;
    }

    onSaveAction(newAction);
    clearFormFields();
    onCancelEdit();
  };

  return (
    <div className="card bg-dark border-secondary text-white h-100 p-3 action-creator-card">
      <h5 className="card-title text-warning mb-3">{actionToEdit ? 'Editar Ação' : 'Criar Nova Ação'}</h5>

      <div className="card-body p-0 custom-scroll overflow-auto">
        {/* Área de Pesquisa de Magia Predefinida */}
        <div className="mb-3">
          <label htmlFor="spellSearchInput" className="form-label small text-light">Buscar Magia Predefinida:</label> {/* text-light */}
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

        {/* Tipo de Ação (Ataque ou Magia) - para criação manual */}
        <div className="mb-3">
          <label className="form-label small text-light">Ou Crie Manualmente:</label> {/* text-light */}
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${actionType === 'attack' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleActionTypeChange('attack')}
              disabled={!!actionToEdit}
            >
              <i className="bi bi-sword me-2"></i>Ataque Físico
            </button>
            <button
              type="button"
              className={`btn ${actionType === 'spell' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleActionTypeChange('spell')}
              disabled={!!actionToEdit}
            >
              <i className="bi bi-stars me-2"></i>Magia
            </button>
          </div>
        </div>

        {/* Nome da Ação */}
        <div className="mb-3">
          <label htmlFor="actionName" className="form-label small text-light">Nome da Ação:</label> {/* text-light */}
          <input
            type="text"
            id="actionName"
            className="form-control form-control-sm bg-dark text-white border-secondary"
            value={actionName}
            onChange={(e) => setActionName(e.target.value)}
            placeholder="Ex: Espada Longa, Bola de Fogo"
          />
        </div>

        {/* Seleção de Dano/Utilidade (para Magias e Ataques) */}
        <div className="mb-3">
          <label className="form-label small text-light">Tipo de Efeito:</label> {/* text-light */}
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${effectType === 'damage' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleEffectTypeChange('damage')}
            >
              <i className="bi bi-fire me-2"></i>Dano
            </button>
            <button
              type="button"
              className={`btn ${effectType === 'utility' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleEffectTypeChange('utility')}
            >
              <i className="bi bi-lightbulb me-2"></i>Utilidade
            </button>
          </div>
        </div>

        {/* Campos relacionados a Dano */}
        {effectType === 'damage' && (
          <div>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label htmlFor="damageDice" className="form-label small text-light">Dados de Dano (ex: 1d8):</label> {/* text-light */}
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
                <label htmlFor="damageModifier" className="form-label small text-light">Modificador de Dano (ex: +3):</label> {/* text-light */}
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
              <label htmlFor="damageType" className="form-label small text-light">Tipo de Dano (ex: Cortante, Fogo):</label> {/* text-light */}
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

        {/* Campos relacionados a Utilidade */}
        {effectType === 'utility' && (
          <div>
            <div className="mb-3">
              <label htmlFor="utilityTitle" className="form-label small text-light">Título da Utilidade (ex: Cura):</label> {/* text-light */}
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
              <label htmlFor="utilityValue" className="form-label small text-light">Valor/Dados de Utilidade (ex: 1d6):</label> {/* text-light */}
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
          <label htmlFor="range" className="form-label small text-light">Alcance (ex: 1.5m, 18m):</label> {/* text-light */}
          <input
            type="text"
            id="range"
            className="form-control form-control-sm bg-dark text-white border-secondary"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="Ex: 1.5m, 30/120ft"
          />
        </div>

        {/* Campos específicos para Ataques Físicos */}
        {actionType === 'attack' && (
          <div>
            <div className="mb-3">
              <label htmlFor="properties" className="form-label small text-light">Propriedades (separadas por vírgula):</label> {/* text-light */}
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
        {actionType === 'spell' && (
          <div>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label htmlFor="spellLevel" className="form-label small text-light">Nível da Magia (0 para Truque):</label> {/* text-light */}
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
                <label htmlFor="castingTime" className="form-label small text-light">Tempo de Conjuração:</label> {/* text-light */}
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
                <label htmlFor="duration" className="form-label small text-light">Duração:</label> {/* text-light */}
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
                <label htmlFor="spellSchool" className="form-label small text-light">Escola da Magia:</label> {/* text-light */}
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
              <label htmlFor="saveDC" className="form-label small text-light">Teste de Resistência / Efeito (ex: Sabedoria, Metade do Dano):</label> {/* text-light */}
              <input
                type="text"
                id="saveDC"
                className="form-control form-control-sm bg-dark text-white border-secondary"
                value={saveDC}
                onChange={(e) => setSaveDC(e.target.value)}
                placeholder="Ex: Força (sem efeito)"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="description" className="form-label small text-light">Descrição / Efeito:</label> {/* text-light */}
              <textarea
                id="description"
                className="form-control form-control-sm bg-dark text-white border-secondary"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Breve descrição da magia e seus efeitos..."
              ></textarea>
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
    </div>
  );
};

export default ActionCreator;