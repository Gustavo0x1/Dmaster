// src/components/HealthController/HealthController.tsx
import React, { useState, useEffect } from 'react';
import { HealthAction } from '../../types';

interface HealthControllerProps {
  initialCurrentHealth?: number;
  initialMaxHealth?: number;
}

const HealthController: React.FC<HealthControllerProps> = ({
  initialCurrentHealth = 35,
  initialMaxHealth = 50,
}) => {
  const [currentHealth, setCurrentHealth] = useState<number>(initialCurrentHealth);
  const [maxHealth, setMaxHealth] = useState<number>(initialMaxHealth);

  const percentage = maxHealth > 0 ? (currentHealth / maxHealth) * 100 : 0;
  const [adjustValue, setAdjustValue] = useState<string>('');
  const [isEditingMaxHealth, setIsEditingMaxHealth] = useState<boolean>(false);
  const [displayCurrentHealthInput, setDisplayCurrentHealthInput] = useState<string>(String(currentHealth));
  const [tempMaxHealthEdit, setTempMaxHealthEdit] = useState<string>(String(maxHealth));
  const [healthError, setHealthError] = useState<string | null>(null); // NOVO: Estado para mensagens de erro

  // Sincroniza o input direto de vida atual com o estado real de vida
  useEffect(() => {
    setDisplayCurrentHealthInput(String(currentHealth));
  }, [currentHealth]);

  // Sincroniza os estados temporários de edição de max health
  useEffect(() => {
    if (isEditingMaxHealth) {
      setTempMaxHealthEdit(String(maxHealth));
      setHealthError(null); // Limpa erro ao abrir edição
    }
  }, [isEditingMaxHealth, maxHealth]);


  const handleAdjustClick = (action: 'add' | 'subtract') => {
    setHealthError(null); // Limpa erro anterior
    const value = parseInt(adjustValue, 10);
    if (!isNaN(value) && value > 0) {
      let newHealth = currentHealth;
      if (action === 'add') {
        newHealth = Math.min(currentHealth + value, maxHealth);
      } else if (action === 'subtract') {
        newHealth = Math.max(currentHealth - value, 0);
      }
      setCurrentHealth(newHealth);
      setAdjustValue('');
    } else {
      setHealthError('Por favor, insira um valor numérico positivo.'); // Feedback na UI
    }
  };

  const handleDisplayCurrentHealthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayCurrentHealthInput(e.target.value);
    setHealthError(null); // Limpa erro ao digitar
  };

  const handleDisplayCurrentHealthInputBlur = () => {
    setHealthError(null); // Limpa erro anterior
    const value = parseInt(displayCurrentHealthInput, 10);
    if (!isNaN(value) && value >= 0) {
      setCurrentHealth(Math.min(value, maxHealth));
    } else {
      setDisplayCurrentHealthInput(String(currentHealth)); // Reverte para valor anterior
      setHealthError('PV atual inválido (deve ser número >= 0).'); // Feedback na UI
    }
  };

  const handleDisplayCurrentHealthInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleDisplayCurrentHealthInputBlur();
    }
  };

  const handleToggleEditMaxHealth = () => {
    setIsEditingMaxHealth(!isEditingMaxHealth);
  };

  const handleSaveEditHealth = () => {
    setHealthError(null); // Limpa erro anterior
    const newCurrent = parseInt(displayCurrentHealthInput, 10);
    const newMax = parseInt(tempMaxHealthEdit, 10);

    if (
      !isNaN(newCurrent) &&
      !isNaN(newMax) &&
      newCurrent >= 0 &&
      newMax > 0 &&
      newMax >= newCurrent
    ) {
      setMaxHealth(newMax);
      setCurrentHealth(Math.min(newCurrent, newMax));
      setIsEditingMaxHealth(false);
    } else {
      setHealthError('Valores PV inválidos: Atual >= 0, Máx > 0 e Máx >= Atual.'); // Feedback na UI
    }
  };

  return (
    <div className="card bg-transparent border-secondary text-white text-center p-3 health-controller-card">
      <h6 className="card-subtitle mb-2 text-white small">Pontos de Vida</h6>

      {/* Barra de Progresso da Vida */}
      <div className="progress bg-secondary rounded-pill flex-grow-1 mx-auto" style={{ height: '1.2rem', width: '90%', position: 'relative' }}>
        <div
          className="progress-bar bg-danger rounded-pill"
          role="progressbar"
          style={{ width: `${percentage}%` }}
          aria-valuenow={currentHealth}
          aria-valuemin={0}
          aria-valuemax={maxHealth}
        ></div>
        <div className="d-flex justify-content-center align-items-center position-absolute w-100 h-100" style={{ top: 0, left: 0 }}>

               <small className="font-weight-bold text-white text-start p-0" style={{ flexGrow: 0, lineHeight: '1.2rem' }}>
             {displayCurrentHealthInput}
          </small>
          <small className="font-weight-bold text-white text-start p-0" style={{ flexGrow: 0, lineHeight: '1.2rem' }}>
            &nbsp;/ {maxHealth}
          </small>
        </div>
      </div>

      {healthError && ( // NOVO: Exibe a mensagem de erro
          <small className="text-danger mt-2">{healthError}</small>
      )}

      {/* Controles de Ajuste de Vida */}
      <div className="d-flex align-items-center justify-content-center mt-3 health-controls">
        <button
          className="btn btn-sm btn-danger p-1 me-1"
          onClick={() => handleAdjustClick('subtract')}
          title="Diminuir Vida"
        >
          <i className="bi bi-dash"></i>
        </button>
        <input
          type="number"
          className="form-control form-control-sm text-center flex-grow-1 mx-1"
          placeholder="Valor"
          value={adjustValue}
          onChange={(e) => setAdjustValue(e.target.value)}
          style={{ maxWidth: '80px' }}
        />
        <button
          className="btn btn-sm btn-success p-1 ms-1"
          onClick={() => handleAdjustClick('add')}
          title="Adicionar Vida"
        >
          <i className="bi bi-plus"></i>
        </button>
      </div>

      {/* Botão de Edição de Vida Máxima */}
      <button
        className="btn btn-sm btn-warning mt-3"
        onClick={handleToggleEditMaxHealth}
        title="Editar Pontos de Vida Máximos"
      >
        <i className="bi bi-pencil me-1"></i> Editar Max PV
      </button>

      {/* Seção de Edição de Vida Máxima (expansível) */}
      {isEditingMaxHealth && (
        <div className="edit-health-panel mt-3 p-3 bg-dark border border-secondary rounded">
          <h6 className="text-white mb-2">Editar PV Total</h6>
          <div className="mb-2">
            <label htmlFor="editCurrentHealth" className="form-label small">PV Atual:</label>
            <input
              type="number"
              id="editCurrentHealth"
              className="form-control form-control-sm"
              value={displayCurrentHealthInput}
              onChange={handleDisplayCurrentHealthInputChange}
              onBlur={handleDisplayCurrentHealthInputBlur}
              onKeyPress={handleDisplayCurrentHealthInputKeyPress}
              min="0"
            />
          </div>
          <div className="mb-2">
            <label htmlFor="editMaxHealth" className="form-label small">PV Máximo:</label>
            <input
              type="number"
              id="editMaxHealth"
              className="form-control form-control-sm"
              value={tempMaxHealthEdit}
              onChange={(e) => setTempMaxHealthEdit(e.target.value)}
              min="1"
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-sm btn-secondary" onClick={handleToggleEditMaxHealth}>Cancelar</button>
            <button className="btn btn-sm btn-primary" onClick={handleSaveEditHealth}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthController;