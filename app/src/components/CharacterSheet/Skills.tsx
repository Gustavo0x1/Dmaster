// src/components/CharacterSheet/Skills.tsx
import React,{useState} from 'react';
import { Skill } from '../../types'; // Ajuste o caminho conforme necessário

interface SkillsSectionProps {
  skills: Skill[];
  onUpdateSkill: (name: string, newModifier: string) => void;
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ skills, onUpdateSkill }) => {
    const [editingSkillName, setEditingSkillName] = useState<string | null>(null);
  const [currentModifier, setCurrentModifier] = useState<string>('');
  const handleSkillChange = (name: string, e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSkill(name, e.target.value);
  };

  const handleEditClick = (skill: Skill, event: React.MouseEvent) => {
    event.stopPropagation(); // Impede que o clique no badge/input propague para o item da lista
    setEditingSkillName(skill.name);
    setCurrentModifier(skill.modifier);
  };

  const handleModifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentModifier(e.target.value);
  };

  const handleSaveEdit = (skillName: string) => {
    onUpdateSkill(skillName, currentModifier);
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
    if (editingSkillName !== skill.name) { // Só dispara se não estiver no modo de edição
      alert(`Clicou no corpo da perícia: ${skill.name} (Lógica para outra coisa)`);
      // if (onClickSkillItemBody) {
      //   onClickSkillItemBody(skill);
      // }
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
              onClick={() => handleSkillItemBodyClick(skill)} // Clique no corpo para "outra coisa"
              style={{ cursor: 'pointer' }}
            >
              <span className="text-light-base skill-name-label">{skill.name}</span>
              {editingSkillName === skill.name ? (
                <div className="d-flex align-items-center">
                  <input
                    type="text"
                    className="form-control-sm skill-modifier-input" /* Classe para o input transparente */
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
                  onClick={(e) => handleEditClick(skill, e)} // Clique no badge para editar
                  style={{ cursor: 'pointer' }}
                >
                  {skill.modifier}
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