// src/components/SkillsSection/SkillsSection.tsx
import React, { useState } from 'react';
import { Skill, BasicAttribute } from '../../types';
import { evaluate } from 'mathjs'; 

interface SkillsSectionProps {
  skills: Skill[];
  onUpdateSkill: (name: string, newModifier: string) => void;
  characterAttributes: BasicAttribute[];
  CharacterID: number;
  // onClickSkillItemBody?: (skill: Skill) => void;
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ skills, onUpdateSkill, characterAttributes,CharacterID /*, onClickSkillItemBody */ }) => {
  const [editingSkillName, setEditingSkillName] = useState<string | null>(null);
  const [currentModifier, setCurrentModifier] = useState<string>('');
  const electron = (window as any).electron
  const attributeAbbreviationMap: { [key: string]: string } = {
    'str': 'Força',
    'dex': 'Destreza',
    'con': 'Constituição',
    'int': 'Inteligência',
    'sab': 'Sabedoria',
    'car': 'Carisma',
  };

  // Function to evaluate the skill modifier string using mathjs
  const evaluateSkillModifier = (modifierString: string): number | string => {
    const trimmedModifier = modifierString.trim();

    // Prepare a scope for mathjs with attribute modifiers
    const scope: { [key: string]: number } = {};
    characterAttributes.forEach(attr => {
      // Adiciona tanto a abreviação (ex: str) quanto o nome completo (ex: Força) no scope
      const abbr = Object.keys(attributeAbbreviationMap).find(key => attributeAbbreviationMap[key] === attr.name);
      if (abbr) {
        scope[abbr] = attr.modifier;
      }
      scope[attr.name.toLowerCase()] = attr.modifier; // Ex: 'força'
    });

    try {
      // Tenta avaliar a expressão usando mathjs
      // Substitui os nomes dos atributos (ex: str, for, dex) pelos seus modificadores no escopo
      const result = evaluate(trimmedModifier, scope);

      if (typeof result === 'number' && !isNaN(result)) {
        return result;
      } else {
        // Se o resultado não for um número válido, retorna a string original
        return modifierString;
      }
    } catch (e) {
      // Se houver um erro de parsing ou avaliação, retorna a string original
      console.warn(`Erro ao avaliar modificador "${modifierString}":`, e);
      return modifierString;
    }
  };

  const displayModifier = (modifier: string) => {
    const evaluated = evaluateSkillModifier(modifier);
    if (typeof evaluated === 'number') {
      return evaluated >= 0 ? `+${evaluated}` : evaluated.toString();
    }
    return modifier;
  };

  const handleEditClick = (skill: Skill, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingSkillName(skill.name);
    setCurrentModifier(skill.modifier);
  };

  const handleModifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentModifier(e.target.value);
  };

  const handleSaveEdit = (skillName: string) => {
    onUpdateSkill(skillName, currentModifier);
    console.log("UPDATING!!")
    electron.invoke('update-character-skills',currentModifier,CharacterID)
    setEditingSkillName(null);
  };

  const handleCancelEdit = () => {
    setEditingSkillName(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, skillName: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(skillName);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleSkillItemBodyClick = (skill: Skill) => {
    if (editingSkillName !== skill.name) {
      const evaluated = evaluateSkillModifier(skill.modifier);

    }
  };

  return (
    <div className="card custom-card-base character-skills-section">
      <div className="card-body custom-card-scrollable-body">
        <ul className="list-group list-group-flush">
          {skills.map(skill => (
            <li
              key={skill.name}
              className="list-group-item skill-item-list"
              onClick={() => handleSkillItemBodyClick(skill)}
              style={{ cursor: 'pointer' }}
            >
              <span className="text-light-base skill-name-label">{skill.name}</span>
              {editingSkillName === skill.name ? (
                <div className="d-flex align-items-center">
                  <input
                    type="text"
                    className="form-control-sm skill-modifier-input"
                    value={currentModifier}
                    onChange={handleModifierChange}
                    onBlur={() => handleSaveEdit(skill.name)}
                    onKeyDown={(e) => handleKeyPress(e, skill.name)}
                    autoFocus
                  />
                </div>
              ) : (
                <span
                  className="badge skill-modifier-badge"
                  onClick={(e) => handleEditClick(skill, e)}
                  style={{ cursor: 'pointer' }}
                >
                  {displayModifier(skill.modifier)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SkillsSection;