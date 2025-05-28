// src/components/HealthController/HealthController.tsx
import React, { useState, useEffect } from 'react';
import { CharacterHealth } from '../../types';

interface HealthControllerProps {
  initialCurrentHealth?: number;
  initialMaxHealth?: number;
  onHealthChange?: (healthData: CharacterHealth) => void;
}

const HealthController: React.FC<HealthControllerProps> = ({
  initialCurrentHealth = 35,
  initialMaxHealth = 50,
  onHealthChange,
}) => {
  // Use prop for initial state of currentHealth
  const [currentHealth, setCurrentHealth] = useState<number>(initialCurrentHealth);
  // Use prop for initial state of maxHealth
  const [maxHealth, setMaxHealth] = useState<number>(initialMaxHealth);

  // displayCurrentHealthInput should be initialized with the prop's value
  // and then updated whenever currentHealth (the numerical state) changes
  const [displayCurrentHealthInput, setDisplayCurrentHealthInput] = useState<string>(String(initialCurrentHealth)); //

  const [adjustValue, setAdjustValue] = useState<string>('');
  const [isEditingMaxHealth, setIsEditingMaxHealth] = useState<boolean>(false);
  const [tempMaxHealthEdit, setTempMaxHealthEdit] = useState<string>(String(maxHealth));
  const [healthError, setHealthError] = useState<string | null>(null);

  const [deathSuccesses, setDeathSuccesses] = useState<Array<boolean | null>>(Array(3).fill(null));
  const [deathFails, setDeathFails] = useState<Array<boolean | null>>(Array(3).fill(null));

  // Effect 1: Synchronize local state with props when props change
  // This is CRUCIAL when local state is initialized from props.
  useEffect(() => {
    setCurrentHealth(initialCurrentHealth);
    setDisplayCurrentHealthInput(String(initialCurrentHealth));
  }, [initialCurrentHealth]); // Only re-run if initialCurrentHealth prop changes

  useEffect(() => {
    setMaxHealth(initialMaxHealth);
    setTempMaxHealthEdit(String(initialMaxHealth));
  }, [initialMaxHealth]); // Only re-run if initialMaxHealth prop changes


  // Effect 2: Call onHealthChange when relevant local states change
  // This effect will trigger the parent update.
useEffect(() => {
    if (onHealthChange) {
        onHealthChange({
            current: currentHealth,
            max: maxHealth,
            deathSaves: { successes: deathSuccesses, failures: deathFails },
        });
    }
}, [currentHealth, maxHealth, deathSuccesses, deathFails]);

  // Effect 3: Reset death saves if currentHealth goes above 0
  useEffect(() => {
    if (currentHealth > 0 && (deathSuccesses.some(s => s !== null) || deathFails.some(f => f !== null))) {
      setDeathSuccesses(Array(3).fill(null));
      setDeathFails(Array(3).fill(null));
    }
  }, [currentHealth, deathSuccesses, deathFails]); //

  // Effect 4: For managing the max health edit state
  useEffect(() => {
    if (isEditingMaxHealth) {
      setTempMaxHealthEdit(String(maxHealth));
      setHealthError(null);
    }
  }, [isEditingMaxHealth, maxHealth]); //


  const handleAdjustClick = (action: 'add' | 'subtract') => {
    setHealthError(null);
    const value = parseInt(adjustValue, 10);
    if (!isNaN(value) && value > 0) {
      let newHealth = currentHealth;
      if (action === 'add') {
        newHealth = Math.min(currentHealth + value, maxHealth);
      } else if (action === 'subtract') {
        newHealth = Math.max(currentHealth - value, 0);
      }
      setCurrentHealth(newHealth);
      setDisplayCurrentHealthInput(String(newHealth)); // Update display input here directly
      setAdjustValue('');
    } else {
      setHealthError('Por favor, insira um valor numérico positivo.');
    }
  };

  const handleDisplayCurrentHealthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayCurrentHealthInput(e.target.value); //
    setHealthError(null);
  };

  const handleDisplayCurrentHealthInputBlur = () => {
    setHealthError(null);
    const value = parseInt(displayCurrentHealthInput, 10);
    if (!isNaN(value) && value >= 0) {
      setCurrentHealth(Math.min(value, maxHealth));
    } else {
      setDisplayCurrentHealthInput(String(currentHealth)); // Revert if invalid
      setHealthError('PV atual inválido (deve ser número >= 0).');
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
    setHealthError(null);
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
      setDisplayCurrentHealthInput(String(Math.min(newCurrent, newMax))); // Update display input here directly
      setIsEditingMaxHealth(false);
    } else {
      setHealthError('Valores PV inválidos: Atual >= 0, Máx > 0 e Máx >= Atual.');
    }
  };

  const handleDeathSaveClick = (index: number, type: 'success' | 'fail') => {
    if (type === 'success') {
      setDeathSuccesses(prevSaves => {
        const newSaves = [...prevSaves];
        newSaves[index] = newSaves[index] === true ? null : true;
        return newSaves;
      });
    } else {
      setDeathFails(prevSaves => {
        const newSaves = [...prevSaves];
        newSaves[index] = newSaves[index] === false ? null : false;
        return newSaves;
      });
    }
  };

  const percentage = maxHealth > 0 ? (currentHealth / maxHealth) * 100 : 0; // Recalculate percentage here for consistency

  return (
    <div className="card bg-transparent border-secondary text-white text-center p-3 health-controller-card">
      <div className="card bg-transparent border-secondary text-white text-center p-3 health-controller-card">
        <h6 className="card-subtitle mb-2 text-white small">Pontos de Vida</h6>

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

      {healthError && (
          <small className="text-danger mt-2">{healthError}</small>
      )}

      {currentHealth <= 0 && (
        <div className="d-flex justify-content-center align-items-center mt-3">
          <div className="d-flex flex-column align-items-center me-3">
            <small className="text-white mb-1">Sucessos</small>
            <div className="d-flex">
              {deathSuccesses.map((status, index) => (
                <button
                  key={`success-${index}`}
                  className={`rounded-circle mx-1 border p-0`}
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: status === true ? 'green' : 'gray',
                    borderColor: status === true ? 'green' : 'lightgray',
                  }}
                  onClick={() => handleDeathSaveClick(index, 'success')}
                ></button>
              ))}
            </div>
          </div>
          <div className="d-flex flex-column align-items-center ms-3">
            <small className="text-white mb-1">Falhas</small>
            <div className="d-flex">
              {deathFails.map((status, index) => (
                <button
                  key={`fail-${index}`}
                  className={`rounded-circle mx-1 border p-0`}
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: status === false ? 'red' : 'gray',
                    borderColor: status === false ? 'red' : 'lightgray',
                  }}
                  onClick={() => handleDeathSaveClick(index, 'fail')}
                ></button>
              ))}
            </div>
          </div>
        </div>
      )}

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

      <button
        className="btn btn-sm btn-warning mt-3"
        onClick={handleToggleEditMaxHealth}
        title="Editar Pontos de Vida Máximos"
      >
        <i className="bi bi-pencil me-1"></i> Editar Max PV
      </button>

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
    </div>
  );
};

export default HealthController;