// src/components/CharacterSheet/Atributos.tsx
import React,{useRef,useState} from 'react';
import { BasicAttribute } from '../../types'; // Certifique-se de que o caminho está correto
import Dice from '../Dice';
// *** ESTA INTERFACE É CRUCIAL ***
interface AttributesSectionProps {
  attributes: BasicAttribute[];
  onUpdateAttribute: (name: string, newValue: number, newModifier: number) => void;
}

const AttributesSection: React.FC<AttributesSectionProps> = ({ attributes, onUpdateAttribute }) => {
  
  const [editingAttributeName, setEditingAttributeName] = useState<string | null>(null);
  const [currentValue, setCurrentValue] = useState<number>(0);
   const rollDiceFunctionRef = useRef<((diceNotation: string, forcedValue?: number | 'random') => void) | null>(null);
  const handleAttributeChange = (name: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    const newModifier = Math.floor((newValue - 10) / 2);
    onUpdateAttribute(name, newValue, newModifier);
  };
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setCurrentValue(value);
    }
  };

const calculateModifier = (value: number): number => {
  return Math.floor((value - 10) / 2);
};
  const handleSaveEdit = (attributeName: string) => {
    const newModifier = calculateModifier(currentValue);
    onUpdateAttribute(attributeName, currentValue, newModifier);
    setEditingAttributeName(null);
  };
  const handleAttributeCardBodyClick = (attribute: BasicAttribute) => {
    // Só dispara se não estiver no modo de edição do atributo
    if (editingAttributeName !== attribute.name) {
    
      // AQUI: Chama a função de rolagem, se ela estiver disponível
      if (rollDiceFunctionRef.current) {
        rollDiceFunctionRef.current(`1d20+${calculateModifier(attribute.value)}`, 'random'); // Rola 1d20 + modificador do atributo
        
      } else {
        console.warn("DiceApp ainda não está pronto para rolar ou rollDiceFunctionRef não foi definido.");
      }
    }
  };
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, attributeName: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(attributeName);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };
    const handleCancelEdit = () => {
    setEditingAttributeName(null);
  };
    const handleValueClick = (attribute: BasicAttribute, event: React.MouseEvent) => {
    event.stopPropagation(); // Impede que o clique no valor propague para o card pai
    setEditingAttributeName(attribute.name);
    setCurrentValue(attribute.value);
  };
 return (
    <>
      {/* 1. O COMPONENTE DICE DEVE SER RENDERIZADO NO JSX AQUI */}
      {/* Ele criará e gerenciará sua própria div #dice-container e sua visibilidade */}
      <Dice
        // onRollRequest: Esta prop é uma função que o Dice chamará quando estiver pronto
        // para fornecer a função de rolagem (triggerRoll) para o componente pai.
        onRollRequest={(rollFn) => {
          rollDiceFunctionRef.current = rollFn; // Armazena a função de rolagem no ref
          console.log("Função de rolagem do DiceApp recebida pelo AttributesSection!");
        }}
   
      />

      {/* Exemplo de botão para testar a rolagem sem clicar no card, se quiser */}


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
                <div className="attribute-input-container">
                  <input
                    type="number"
                    className="form-control-sm attribute-input"
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
                  onClick={(e) => handleValueClick(attribute, e)} // Clique no VALOR para editar
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