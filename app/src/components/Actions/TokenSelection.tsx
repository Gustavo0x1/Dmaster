// src/components/SelectedTokenDisplay/SelectedTokenDisplay.tsx
import React from 'react';
import { Token } from '../../types'; // Importe o tipo Token padronizado
import '../../css/Actions/SelectedToken.css'; // O CSS virá depois

interface SelectedTokenDisplayProps {
  token: Token | null; // O token selecionado, pode ser nulo se nenhum estiver selecionado
}

const SelectedTokenDisplay: React.FC<SelectedTokenDisplayProps> = ({ token }) => {
  if (!token) {
    return (
      <div className="token-selection-card text-center p-3">
        <p className="text-muted small mb-0">Nenhum token alvo selecionado.</p> {/* Mensagem ajustada */}
        <p className="text-muted small">Selecione um token na aba "Ações Salvas" ou no grid para vê-lo aqui.</p>
      </div>
    );
  }

  const hpPercentage = token.maxHp > 0 ? (token.currentHp / token.maxHp) * 100 : 0;

  return (
    <div className="token-selection-card card bg-dark border-secondary text-white p-3">
      <div className="d-flex align-items-center mb-3">
        <img src={token.portraitUrl} alt={token.name} className="token-portrait rounded-circle border border-warning me-3" />
        <div className="token-info flex-grow-1">
          <h6 className="token-name text-warning mb-0">{token.name}</h6>
          <div className="token-stats small text-muted">
            <p className="mb-0">CA: <strong className="text-info">{token.ac}</strong></p>
            {token.damageDealt && <p className="mb-0">Dano Causado: <strong className="text-info">{token.damageDealt}</strong></p>}
          </div>
        </div>
      </div>

      {/* Barra de Vida do Token Selecionado */}
      <div className="progress bg-secondary rounded-pill mx-auto" style={{ height: '1rem', width: '90%', position: 'relative' }}>
          <div
            className="progress-bar bg-danger rounded-pill"
            role="progressbar"
            style={{ width: `${hpPercentage}%` }}
            aria-valuenow={token.currentHp}
            aria-valuemin={0}
            aria-valuemax={token.maxHp}
          ></div>
          <small className="font-weight-bold position-absolute w-100 text-center text-white" style={{ top: 0, lineHeight: '1rem' }}>
            {token.currentHp} / {token.maxHp}
          </small>
      </div>
      <small className="text-muted mt-1 d-block text-center">Pontos de Vida</small>
    </div>
  );
};

export default SelectedTokenDisplay;