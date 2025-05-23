import React from 'react';
import { Skill } from '../../types'; // Importe a interface Skill

interface SkillsSectionProps {
  skills: Skill[];
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ skills }) => {
  return (
    <div className="mb-4 pericias"> {/* mb-4 para espaçamento inferior, 'pericias' para estilos customizados */}
      <h5 className="text-warning">Perícias</h5> {/* Título com cor de destaque */}
      <div className="card bg-transparent border-0"> {/* Card transparente sem borda externa */}
        <ul className="list-group list-group-flush text-white"> {/* Lista sem bordas laterais */}
          {skills.map((skill) => (
            <li
              className="list-group-item d-flex justify-content-between align-items-center bg-transparent border-secondary text-white py-2" // py-2 para padding vertical
              key={skill.name} // Key é importante para performance do React
            >
              {skill.name}
              <span className="badge rounded-pill bg-info text-dark"> {/* Bootstrap 5 usa rounded-pill e bg-info */}
                {skill.modifier}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SkillsSection;