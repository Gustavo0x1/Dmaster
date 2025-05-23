import React from 'react';
import { BasicAttribute } from '../../types'; // Importe o tipo

interface AttributesSectionProps {
  attributes: BasicAttribute[];
}

const AttributesSection: React.FC<AttributesSectionProps> = ({ attributes }) => {
  return (
    <div className="d-flex flex-wrap justify-content-center gap-2"> {/* Usando flexbox para organizar os cards */}
      {attributes.map((attr) => (
        <div
          key={attr.name}
          className="card mb-3 bg-transparent border-secondary text-white" // Adicionei border-secondary para visibilidade
          style={{ maxWidth: '140px', minWidth: '120px' }} // Ajuste o minWidth para melhor responsividade
        >
          <div className="card-body text-center p-2 d-flex flex-column align-items-center">
            <h6 className="card-title mb-0 text-white">{attr.name}</h6>
            <div className="font-weight-bold">
              {attr.value} | <small className="text-warning">{attr.modifier >= 0 ? `+${attr.modifier}` : attr.modifier}</small>
            </div>
            {/* Opcional: Um botão de Roll para simular rolagem de dado */}
            <button className="btn btn-sm btn-outline-secondary mt-2">Roll</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AttributesSection;