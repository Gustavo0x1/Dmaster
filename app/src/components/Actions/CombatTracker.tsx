// src/components/CombatTracker/CombatTracker.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Combatant, DamageLogEntry, CharacterSheet, Token } from '../../types';
import Dice from '../Dice'; // Se você quiser integrar o Dice aqui também

// Interface para as props do componente CombatTracker
interface CombatTrackerProps {
  // Lista de combatentes. Pode ser CharacterSheet[] ou Token[] dependendo de como você os gerencia.
  // Vou usar Token[] para simplificar, mas você pode mapear CharacterSheet para Token se necessário.
  combatants: Token[]; // Pode ser uma lista de Tokens ou de CharacterSheet simplificados
  onUpdateCombatantHealth: (combatantId: number, newHealth: number) => void;
  // onUpdateCombatantInitiative: (combatantId: string, newInitiative: number | string) => void; // Se quiser editar iniciativa aqui
  onAddDamageLogEntry: (entry: DamageLogEntry) => void;
  // Talvez uma função para resetar o log de dano, etc.
}

const CombatTracker: React.FC<CombatTrackerProps> = ({
  combatants,
  onUpdateCombatantHealth,
  onAddDamageLogEntry,
}) => {
  const [activeTab, setActiveTab] = useState<'initiative' | 'damageLog'>('initiative');
  const [initiativeOrder, setInitiativeOrder] = useState<Combatant[]>([]);
  const [damageLog, setDamageLog] = useState<DamageLogEntry[]>([]);
  const [editingHealthId, setEditingHealthId] = useState<number | null>(null);
  const [currentHealthValue, setCurrentHealthValue] = useState<number>(0);
  const [newDamageAmount, setNewDamageAmount] = useState<number | ''>('');
  const [newHealingAmount, setNewHealingAmount] = useState<number | ''>('');
  const [selectedCombatantForDamage, setSelectedCombatantForDamage] = useState<number | null>(null);

  const rollDiceFunctionRef = useRef<((diceNotation: string, forcedValue?: number | 'random') => void) | null>(null);

  // Efeito para inicializar a ordem de iniciativa quando os combatentes mudam
  useEffect(() => {
    const initialCombatants: Combatant[] = combatants.map(token => ({
      ...token,
      order: 0, // A ordem será definida na função de rolagem/classificação
      isPlayer: false, // Defina a lógica para identificar jogadores vs. NPCs
    }));
    setInitiativeOrder(initialCombatants);
  }, [combatants]);

  // Função para rolar iniciativa e classificar
  const handleRollInitiative = () => {
    const rolledInitiative = initiativeOrder.map(combatant => {
      // Assumindo que initiative pode ser um número ou uma string (ex: "1d20+3")
      let rollResult = 0;
      let modifier = 0;

      if (typeof combatant.initiative === 'number') {
        modifier = combatant.initiative;
        rollResult = Math.floor(Math.random() * 20) + 1 + modifier; // Rola 1d20 + modificador
      } else if (typeof combatant.initiative === 'string' && combatant.initiative.includes('d')) {
        // Lógica simples para "1d20+X"
        const parts = combatant.initiative.split('+');
        const dieRoll = parseInt(parts[0].split('d')[1]); // Pega o número do dado (ex: 20 de "1d20")
        modifier = parts.length > 1 ? parseInt(parts[1]) : 0;
        rollResult = Math.floor(Math.random() * dieRoll) + 1 + modifier;
      } else {
        // Se for uma string que é apenas um número
        modifier = parseInt(combatant.initiative as string);
        rollResult = Math.floor(Math.random() * 20) + 1 + modifier;
      }

      return { ...combatant, order: rollResult }; // 'order' agora é o valor da iniciativa rolada
    });

    // Classifica do maior para o menor
    const sortedInitiative = [...rolledInitiative].sort((a, b) => b.order - a.order);
    setInitiativeOrder(sortedInitiative);
    openAlertModal("Iniciativa Rolada!", "A ordem de iniciativa foi definida.");
  };

  // Funções para gerenciamento de vida
  const handleEditHealthClick = (combatant: Combatant) => {
    setEditingHealthId(combatant.id);
    setCurrentHealthValue(combatant.currentHp);
  };

  const handleHealthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setCurrentHealthValue(value);
    }
  };

  const handleSaveHealthEdit = (combatantId: number) => {
    onUpdateCombatantHealth(combatantId, currentHealthValue);
    setEditingHealthId(null);
  };

  const handleCancelHealthEdit = () => {
    setEditingHealthId(null);
  };

  const handleKeyPressHealth = (e: React.KeyboardEvent<HTMLInputElement>, combatantId: number) => {
    if (e.key === 'Enter') {
      handleSaveHealthEdit(combatantId);
    } else if (e.key === 'Escape') {
      handleCancelHealthEdit();
    }
  };

  // Funções para registro de dano
  const handleRecordDamage = (type: 'damage' | 'healing', combatantId: number, combatantName: string) => {
    const amount = type === 'damage' ? newDamageAmount : newHealingAmount;
    if (amount === '' || amount <= 0) {
      openAlertModal("Valor Inválido", "Por favor, insira um valor positivo para dano ou cura.");
      return;
    }

    const newLogEntry: DamageLogEntry = {
      id: 1, // ID único
      combatantId: combatantId,
      combatantName: combatantName,
      damageTaken: type === 'damage' ? amount : 0,
      damageDealt: 0, // Esta parte precisaria de mais contexto sobre quem causou o dano
      healingReceived: type === 'healing' ? amount : 0,
      timestamp: new Date().toLocaleString(),
      description: type === 'damage' ? `Recebeu ${amount} de dano.` : `Curado em ${amount}.`,
    };

    setDamageLog(prevLog => [...prevLog, newLogEntry]);
    onAddDamageLogEntry(newLogEntry); // Chama a função do pai para persistir (se necessário)

    // Atualiza a saúde do combatente
    const targetCombatant = combatants.find(c => c.id === combatantId);
    if (targetCombatant) {
      const updatedHealth = type === 'damage'
        ? Math.max(0, targetCombatant.currentHp - amount)
        : Math.min(targetCombatant.maxHp, targetCombatant.currentHp + amount);
      onUpdateCombatantHealth(combatantId, updatedHealth);
    }

    // Limpa os campos
    setNewDamageAmount('');
    setNewHealingAmount('');
    setSelectedCombatantForDamage(null);
    openAlertModal(type === 'damage' ? "Dano Registrado!" : "Cura Registrada!", `Dano/Cura para ${combatantName} atualizado.`);
  };


  // Estados e funções para o modal de ALERTA SIMPLES (reaproveitado do FullCharSheet)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalTitle, setAlertModalTitle] = useState('');
  const [alertModalMessage, setAlertModalMessage] = useState<string | React.ReactNode>('');

  const openAlertModal = (title: string, message: string | React.ReactNode) => {
    setAlertModalTitle(title);
    setAlertModalMessage(message);
    setShowAlertModal(true);
  };

  const closeAlertModal = () => {
    setShowAlertModal(false);
    setAlertModalTitle('');
    setAlertModalMessage('');
  };


  return (
    <div className="container-fluid combat-tracker-container h-100">
      {/* DICE COMPONENT - Opcional, para rolar dados diretamente do tracker */}
      <Dice
        onRollRequest={(rollFn) => {
          rollDiceFunctionRef.current = rollFn;
          console.log("Função de rolagem do DiceApp recebida pelo CombatTracker!");
        }}
      />

      <div className="row h-100 d-flex flex-column">
        {/* Abas de Navegação */}
        <div className="col-12 mb-3 flex-shrink-0">
          <ul className="nav nav-tabs nav-justified" role="tablist">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'initiative' ? 'active' : ''} text-light-base`}
                onClick={() => setActiveTab('initiative')}
                type="button"
              >
                Ordem de Iniciativa
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'damageLog' ? 'active' : ''} text-light-base`}
                onClick={() => setActiveTab('damageLog')}
                type="button"
              >
                Registro de Dano
              </button>
            </li>
          </ul>
        </div>

        {/* Conteúdo das Abas */}
        <div className="tab-content-display flex-grow-1">
          {activeTab === 'initiative' && (
            <div className="tab-page-active fade show active flex-grow-1" id="initiative-tab-page">
              <div className="row justify-content-center h-100">
                <div className="col-lg-8 col-md-10 col-sm-12 py-3 d-flex flex-column">
                  <h3 className="text-highlight-warning mb-4 text-center">Ordem de Iniciativa</h3>
                  <div className="text-center mb-3">
                    <button className="btn btn-success me-2" onClick={handleRollInitiative}>
                      <i className="bi bi-dice-5 me-2"></i>Rolar Iniciativa
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => setInitiativeOrder([])}>
                      <i className="bi bi-arrow-counterclockwise me-2"></i>Resetar Ordem
                    </button>
                  </div>
                  <div className="card custom-card-base p-0 flex-grow-1 overflow-y-auto">
                    {initiativeOrder.length === 0 ? (
                      <p className="text-secondary-muted text-center py-3">Nenhum combatente na ordem de iniciativa ainda.</p>
                    ) : (
                      <ul className="list-group list-group-flush initiative-list">
                        {initiativeOrder.map((combatant, index) => (
                          <li key={combatant.id} className="list-group-item d-flex align-items-center justify-content-between custom-list-item">
                            <div className="d-flex align-items-center">
                              <span className="badge bg-primary rounded-pill me-3" style={{ minWidth: '30px' }}>{index + 1}</span>
                              <img src={combatant.image || 'placeholder.png'} alt={combatant.name} className="rounded-circle me-3" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                              <h5 className="mb-0 text-light-base">{combatant.name}</h5>
                            </div>
                            <div className="d-flex align-items-center">
                              <span className="text-highlight-warning me-3">Iniciativa: <strong style={{ fontSize: '1.2em' }}>{combatant.order}</strong></span>
                              <span className="text-info me-3">Vida:</span>
                              {editingHealthId === combatant.id ? (
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-center"
                                  value={currentHealthValue}
                                  onChange={handleHealthChange}
                                  onBlur={() => handleSaveHealthEdit(combatant.id)}
                                  onKeyDown={(e) => handleKeyPressHealth(e, combatant.id)}
                                  autoFocus
                                  style={{ maxWidth: '70px' }}
                                />
                              ) : (
                                <span className="text-light-base me-3" onClick={() => handleEditHealthClick(combatant)} style={{ cursor: 'pointer' }}>
                                  {combatant.currentHp} / {combatant.maxHp}
                                </span>
                              )}
                              {/* Botão de rolagem de teste para um combatente específico */}
                              <button
                                className="btn btn-sm btn-outline-light"
                                onClick={() => {
                                  if (rollDiceFunctionRef.current) {
                                    rollDiceFunctionRef.current(`1d20+${combatant.initiative}`, 'random'); // Assumindo que initiative é um número ou string parseável para modificador
                                    openAlertModal("Rolagem de Teste", `Rolagem de 1d20 + iniciativa para ${combatant.name} enviada.`);
                                  } else {
                                    openAlertModal("Erro", "DiceApp ainda não está pronto para rolar.");
                                  }
                                }}
                                disabled={!rollDiceFunctionRef.current}
                                title="Rolar 1d20 + Iniciativa"
                              >
                                <i className="bi bi-dice-6"></i>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'damageLog' && (
            <div className="tab-page-active fade show active flex-grow-1" id="damage-log-tab-page">
              <div className="row justify-content-center h-100">
                <div className="col-lg-10 col-md-11 col-sm-12 py-3 d-flex flex-column">
                  <h3 className="text-highlight-warning mb-4 text-center">Registro de Dano</h3>

                  {/* Formulário para registrar dano/cura */}
                  <div className="card custom-card-base p-3 mb-4">
                    <h5 className="text-light-base mb-3">Registrar Dano/Cura</h5>
                    <div className="row g-3 align-items-end">
                      <div className="col-md-4">
                        <label htmlFor="combatantSelect" className="form-label text-secondary-muted small">Combatente</label>
                        <select
                          id="combatantSelect"
                          className="form-select bg-dark text-light-base border-secondary"
                          value={selectedCombatantForDamage || ''}
                          onChange={(e) => setSelectedCombatantForDamage(parseInt(e.target.value))}
                        >
                          <option value="" disabled>Selecione um combatente</option>
                          {combatants.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label htmlFor="damageAmount" className="form-label text-secondary-muted small">Dano Causado</label>
                        <input
                          type="number"
                          id="damageAmount"
                          className="form-control bg-dark text-light-base border-secondary"
                          value={newDamageAmount}
                          onChange={(e) => setNewDamageAmount(parseInt(e.target.value) || '')}
                          placeholder="Ex: 10"
                        />
                      </div>
                      <div className="col-md-3">
                        <label htmlFor="healingAmount" className="form-label text-secondary-muted small">Cura Recebida</label>
                        <input
                          type="number"
                          id="healingAmount"
                          className="form-control bg-dark text-light-base border-secondary"
                          value={newHealingAmount}
                          onChange={(e) => setNewHealingAmount(parseInt(e.target.value) || '')}
                          placeholder="Ex: 5"
                        />
                      </div>
                      <div className="col-md-2 d-grid">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => selectedCombatantForDamage && handleRecordDamage('damage', selectedCombatantForDamage, combatants.find(c => c.id === selectedCombatantForDamage)?.name || '')}
                          disabled={!selectedCombatantForDamage || newDamageAmount === '' || newDamageAmount <= 0}
                        >
                          <i className="bi bi-heartbreak-fill me-2"></i>Aplicar Dano
                        </button>
                        <button
                          className="btn btn-success btn-sm mt-2"
                          onClick={() => selectedCombatantForDamage && handleRecordDamage('healing', selectedCombatantForDamage, combatants.find(c => c.id === selectedCombatantForDamage)?.name || '')}
                          disabled={!selectedCombatantForDamage || newHealingAmount === '' || newHealingAmount <= 0}
                        >
                          <i className="bi bi-bandages-fill me-2"></i>Aplicar Cura
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de log de dano */}
                  <div className="card custom-card-base p-0 flex-grow-1 overflow-y-auto">
                    {damageLog.length === 0 ? (
                      <p className="text-secondary-muted text-center py-3">Nenhum registro de dano/cura ainda.</p>
                    ) : (
                      <table className="table table-dark table-striped table-hover table-sm">
                        <thead>
                          <tr>
                            <th scope="col" className="text-highlight-warning text-center">Hora</th>
                            <th scope="col" className="text-highlight-warning text-center">Combatente</th>
                            <th scope="col" className="text-highlight-warning text-center">Dano Recebido</th>
                            <th scope="col" className="text-highlight-warning text-center">Cura Recebida</th>
                            <th scope="col" className="text-highlight-warning text-center">Descrição</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...damageLog].reverse().map(entry => ( // Inverte para mostrar o mais recente primeiro
                            <tr key={entry.id}>
                              <td className="text-light-base text-center small">{entry.timestamp}</td>
                              <td className="text-light-base text-center">{entry.combatantName}</td>
                              <td className="text-danger text-center">{entry.damageTaken > 0 ? `-${entry.damageTaken}` : '-'}</td>
                              <td className="text-success text-center">{entry.healingReceived > 0 ? `+${entry.healingReceived}` : '-'}</td>
                              <td className="text-secondary-muted text-start small">{entry.description || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Alerta Simples (reaproveitado) */}
      {showAlertModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content custom-card-base">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-highlight-warning">{alertModalTitle}</h5>
                <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={closeAlertModal}></button>
              </div>
              <div className="modal-body text-light-base">
                {alertModalMessage}
              </div>
              <div className="modal-footer border-secondary">
                <button type="button" className="btn btn-secondary" onClick={closeAlertModal}>Ok</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CombatTracker;