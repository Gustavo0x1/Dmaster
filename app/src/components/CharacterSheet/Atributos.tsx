// src/components/AttributesSection/AttributesSection.tsx
import React, { useState, useRef, useCallback } from 'react';
import { BasicAttribute } from '../../types';
import Dice from '../Dice'; // Importe o componente Dice

interface AttributesSectionProps {
  attributes: BasicAttribute[];
  onUpdateAttribute: (name: string, newValue: number, newModifier: number) => void;
}

const calculateModifier = (value: number): number => {
  return Math.floor((value - 10) / 2);
};

const AttributesSection: React.FC<AttributesSectionProps> = ({ attributes, onUpdateAttribute }) => {
  // Ref para armazenar a função de rolagem que será exposta pelo componente Dice
  const rollDiceFunctionRef = useRef<((diceNotation: string, forcedValue?: number | 'random') => void) | null>(null);

  const [editingAttributeName, setEditingAttributeName] = useState<string | null>(null);
  const [currentValue, setCurrentValue] = useState<number>(0);

  // Função para lidar com a mensagem de retorno do dado (para exibir no console ou integrar com outro sistema)
  const handleDiceMessage = useCallback((message: string, senderId?: string, senderName?: string, senderAvatar?: string) => {
    console.log(`Mensagem do dado (via Atributos.tsx): [${senderName || 'Desconhecido'} - ${senderId || 'N/A'}] ${message}`);
    // Você pode, por exemplo, enviar essa mensagem para um sistema de chat
    // (se AttributesSection tivesse acesso a uma função de envio de chat como prop, similar ao ChatBox)
  }, []);

  // Handler para o clique no VALOR principal (para editar)
  const handleValueClick = (attribute: BasicAttribute, event: React.MouseEvent) => {
    event.stopPropagation(); // Impede que o clique no valor propague para o card pai
    setEditingAttributeName(attribute.name);
    setCurrentValue(attribute.value);
  };

  // Handler para o clique no CORPO do card do atributo
  const handleAttributeCardBodyClick = (attribute: BasicAttribute) => {
    // Só dispara se não estiver no modo de edição do atributo
    if (editingAttributeName !== attribute.name) {
      alert(`Clicou no corpo do atributo: ${attribute.name}. Rolando um dado para você!`);
      // AQUI: Chama a função de rolagem, se ela estiver disponível
      if (rollDiceFunctionRef.current) {
        rollDiceFunctionRef.current(`1d20 + ${calculateModifier(attribute.value)}`, 'random'); // Rola 1d20 + modificador do atributo
        console.log(`Comando de rolagem enviado para o DiceApp para atributo: ${attribute.name}!`);
      } else {
        console.warn("DiceApp ainda não está pronto para rolar ou rollDiceFunctionRef não foi definido.");
      }
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
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setCurrentValue(value);
    }
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
        // onSendChatMessage: Esta prop é a função que o Dice usará para enviar mensagens
        // sobre os resultados da rolagem de volta para este componente.
        onSendChatMessage={handleDiceMessage}
      />

      {/* Exemplo de botão para testar a rolagem sem clicar no card, se quiser */}
      <button
        onClick={() => {
          if (rollDiceFunctionRef.current) {
            rollDiceFunctionRef.current("1d6", 'random');
            console.log("Rolagem 1d6 de teste disparada!");
          }
        }}
        disabled={!rollDiceFunctionRef.current} // Desabilita se a função ainda não está disponível
        style={{ marginBottom: '20px', padding: '10px 20px', fontSize: '1em' }}
      >
        Rolar Teste 1d6
      </button>


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