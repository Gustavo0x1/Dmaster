// src/components/CombatInterface/CombatTokensDisplay.tsx
import React from 'react';
import { Token } from '../types'; // Certifique-se de que seu types.ts está atualizado com a interface Token

interface CombatTokensDisplayProps {
  enemies: Token[];
  allies: Token[];
  selectedTokens: Token[]; // Tokens que estão atualmente selecionados
  onTokenSelectionChange: (selected: Token[]) => void; // Callback para notificar a mudança de seleção
}

const CombatTokensDisplay: React.FC<CombatTokensDisplayProps> = ({
  enemies,
  allies,
  selectedTokens,
  onTokenSelectionChange,
}) => {

  const handleToggleToken = (tokenToToggle: Token) => {
    // Verifica se o token já está selecionado
    const isSelected = selectedTokens.some(t => t.id === tokenToToggle.id);

    if (isSelected) {
      // Se estiver selecionado, remove-o
      onTokenSelectionChange(selectedTokens.filter(t => t.id !== tokenToToggle.id));
    } else {
      // Se não estiver selecionado, adiciona-o
      onTokenSelectionChange([...selectedTokens, tokenToToggle]);
    }
  };

  const renderTokenList = (tokens: Token[], type: 'Inimigos' | 'Aliados') => (
    <div className="mb-4">
      <h5 className={`text-uppercase text-center mb-2 ${type === 'Inimigos' ? 'text-danger' : 'text-success'}`}>
        {type}
      </h5>
      <ul className="list-group custom-scroll" style={{ maxHeight: 'calc(50vh - 80px)', overflowY: 'auto' }}>
        {tokens.length === 0 ? (
          <li className="list-group-item bg-dark text-secondary border-secondary">Nenhum {type.toLowerCase()} encontrado.</li>
        ) : (
          tokens.map(token => (
            <li
              key={token.id}
              className={`list-group-item d-flex align-items-center bg-dark text-white border-secondary mb-1
                          ${selectedTokens.some(t => t.id === token.id) ? 'border-primary border-2' : ''}`}
              onClick={() => handleToggleToken(token)}
              style={{ cursor: 'pointer' }}
            >
              <img src={token.portraitUrl} alt={token.name} className="rounded-circle me-3" style={{ width: '30px', height: '30px' }} />
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold">{token.name}</span>
                  <span className="badge bg-info text-dark">CA: {token.ac}</span>
                </div>
                <small className="text-muted">HP: {token.currentHp}/{token.maxHp}</small>
              </div>
              {/* Checkbox para seleção múltipla */}
              <input
                type="checkbox"
                className="form-check-input ms-auto"
                checked={selectedTokens.some(t => t.id === token.id)}
                onChange={() => handleToggleToken(token)} // Garante que o clique no checkbox também funcione
              />
            </li>
          ))
        )}
      </ul>
    </div>
  );

  return (
    <div className="combat-tokens-display p-3 bg-dark h-100 overflow-auto">
      <h4 className="text-white text-center mb-3">Participantes do Combate</h4>
      <hr className="border-secondary" />

      {renderTokenList(enemies, 'Inimigos')}
      {renderTokenList(allies, 'Aliados')}
    </div>
  );
};

export default CombatTokensDisplay;