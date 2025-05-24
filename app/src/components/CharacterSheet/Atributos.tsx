// src/components/AttributesSection/AttributesSection.tsx
import React, { useState } from 'react';
import { BasicAttribute } from '../../types';

interface AttributesSectionProps {
  attributes: BasicAttribute[];
  onUpdateAttribute: (name: string, newValue: number, newModifier: number) => void;
  // onClickAttributeItem?: (attribute: BasicAttribute) => void; // Removido para simplificar o foco
}

const calculateModifier = (value: number): number => {
  return Math.floor((value - 10) / 2);
};

const AttributesSection: React.FC<AttributesSectionProps> = ({ attributes, onUpdateAttribute }) => {
  const [editingAttributeName, setEditingAttributeName] = useState<string | null>(null);
  const [currentValue, setCurrentValue] = useState<number>(0);

  // NOVO: Função para lidar com o clique no VALOR principal (para editar)
  const handleValueClick = (attribute: BasicAttribute, event: React.MouseEvent) => {
    event.stopPropagation(); // Impede que o clique no valor propague para o card
    setEditingAttributeName(attribute.name);
    setCurrentValue(attribute.value);
  };

  // NOVO: Função para lidar com o clique no CORPO do card (para "outra coisa")
  const handleAttributeCardBodyClick = (attribute: BasicAttribute) => {
    if (editingAttributeName !== attribute.name) { // Só dispara se não estiver no modo de edição
      alert(`Clicou no corpo do atributo: ${attribute.name} (Lógica para outra coisa)`);
      // if (onClickAttributeItem) {
      //   onClickAttributeItem(attribute);
      // }
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setCurrentValue(value);
    }
  };

  const handleSaveEdit = (attributeName: string) => {
    const newModifier = calculateModifier(currentValue);
    onUpdateAttribute(attributeName, currentValue, newModifier);
    setEditingAttributeName(null);
  };

  const handleCancelEdit = () => {
    setEditingAttributeName(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, attributeName: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(attributeName);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <>

        <div className="row d-flex flex-wrap justify-content-center gap-2 row-layout">
          {attributes.map(attribute => (
            <div
              key={attribute.name}
              className="card attribute-value-card"
              onClick={() => handleAttributeCardBodyClick(attribute)} // Clique no card para "outra coisa"
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body">
                <h6 className="card-title attribute-name-label">{attribute.name}</h6>
                {editingAttributeName === attribute.name ? (
                  <div className="attribute-input-container"> {/* NOVO: Contêiner para input */}
                    <input
                      type="number"
                      className="form-control-sm attribute-input" /* Classe para o input transparente */
                      value={currentValue}
                      onChange={handleValueChange}
                      onBlur={() => handleSaveEdit(attribute.name)}
                      onKeyDown={(e) => handleKeyPress(e, attribute.name)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div
                    className="attribute-main-value"
                    onClick={(e) => handleValueClick(attribute, e)} /* Clique no VALOR para editar */
                  >
                    {attribute.value}
                  </div>
                )}
                {/* Modificador sempre visível e com nova cor */}
                <small className="attribute-modifier-display">
                  {calculateModifier(attribute.value) > 0 ? `+${calculateModifier(attribute.value)}` : calculateModifier(attribute.value)}
                </small>
              </div>
            </div>
          ))}
        </div>
</>
  );
};

export default AttributesSection;