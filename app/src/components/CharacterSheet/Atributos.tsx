// src/components/AttributesSection/AttributesSection.tsx
import React, { useState, useRef, useCallback } from 'react';
import { BasicAttribute } from '../../types';
import Dice from '../Dice';

// Tornar a função calculateModifier exportável
export const calculateModifier = (value: number): number => { // Adicione 'export' aqui
  return Math.floor((value - 10) / 2);
};

interface AttributesSectionProps {
  attributes: BasicAttribute[];
  onUpdateAttribute: (id: number, newValue: number, newModifier: number) => void;
}

const AttributesSection: React.FC<AttributesSectionProps> = ({ attributes, onUpdateAttribute }) => {
  const electron = (window as any).electron
  const rollDiceFunctionRef = useRef<((diceNotation: string, forcedValue?: number | 'random') => void) | null>(null);

  const [editingAttributeId, setEditingAttributeId] = useState<number | null>(null);
  const [tempEditedValue, setTempEditedValue] = useState<number>(0);

  const handleDiceMessage = useCallback((message: string, senderId?: number, senderName?: string, senderAvatar?: string) => {
    console.log(`Mensagem do dado (via Atributos.tsx): [${senderName || 'Desconhecido'} - ${senderId || 'N/A'}] ${message}`);
  }, []);

  const handleValueClick = (attribute: BasicAttribute, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingAttributeId(attribute.id);
    setTempEditedValue(attribute.value);
  };

  const handleAttributeCardBodyClick = (attribute: BasicAttribute) => {
    if (editingAttributeId !== attribute.id) {
      
      if (rollDiceFunctionRef.current) {
        rollDiceFunctionRef.current(`1d20 + ${calculateModifier(attribute.value)}`, 'random');
        console.log(`Comando de rolagem enviado para o DiceApp para atributo: ${attribute.name}!`);
      } else {
        console.warn("DiceApp ainda não está pronto para rolar ou rollDiceFunctionRef não foi definido.");
      }
    }
  };

  const handleSaveEdit = (attributeId: number) => {
    console.log("Atualizando db!! ")
    const newModifier = calculateModifier(tempEditedValue); 
    console.log("Saving attribute: ID", attributeId, "Value:", tempEditedValue, "Modifier:", newModifier);
    electron.invoke('update-character-attributes', tempEditedValue, attributeId);
    onUpdateAttribute(attributeId, tempEditedValue, newModifier); 
    setEditingAttributeId(null);
  };

  const handleCancelEdit = () => {
    setEditingAttributeId(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, attributeId: number) => {
    if (e.key === 'Enter') {
      handleSaveEdit(attributeId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setTempEditedValue(value);
    }
  };

  return (
    <>
      <Dice
        onRollRequest={(rollFn) => {
          rollDiceFunctionRef.current = rollFn;
          console.log("Função de rolagem do DiceApp recebida pelo AttributesSection!");
        }}
        onSendChatMessage={handleDiceMessage}
      />


      <div className="row d-flex flex-wrap justify-content-center gap-2 row-layout">
        {attributes.map(attribute => (
          <div
            key={attribute.id}
            className="card attribute-value-card"
            onClick={() => handleAttributeCardBodyClick(attribute)}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body">
              <h6 className="card-title attribute-name-label">{attribute.name}</h6>
              {editingAttributeId === attribute.id ? (
                <div className="attribute-input-container">
                  <input
                    type="number"
                    className="form-control-sm attribute-input"
                    value={tempEditedValue}
                    onChange={handleValueChange}
                    onBlur={() => handleSaveEdit(attribute.id)}
                    onKeyDown={(e) => handleKeyPress(e, attribute.id)}
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  className="attribute-main-value"
                  onClick={(e) => handleValueClick(attribute, e)}
                >
                  {attribute.value}
                </div>
              )}
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