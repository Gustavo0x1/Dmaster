// src/components/ActionManager/ActionManager.tsx
import React, { useState, useEffect } from 'react';
import ActionCreator from './ActionCreator';
import CombatActions from './CombatActions';
import SelectedTokenDisplay from './TokenSelection'; // Ajuste o caminho se necessário
import { CombatAction, Token } from '../../types'; // Importe o tipo Token padronizado
import { useLayout } from '../Layout'; // Importe o hook useLayout

const ActionManager: React.FC = () => {
  // `selectedTokensFromLayout` é a lista de tokens selecionados no grid, vindo do Layout
  // `setSelectedTokensInLayout` é a função para atualizar essa lista no Layout (se o ActionManager precisar fazer isso)
  const { addContentToRight, clearContentFromRight, selectedTokens: selectedTokensFromLayout, setSelectedTokens: setSelectedTokensInLayout } = useLayout();

  const [savedActions, setSavedActions] = useState<CombatAction[]>([]);
  const [activeTab, setActiveTab] = useState<'acoes' | 'criar' | 'grupo'>('acoes');
  const [actionToEdit, setActionToEdit] = useState<CombatAction | null>(null);
  const [selectedTokenFromCombatActions, setSelectedTokenFromCombatActions] = useState<Token | null>(null); // Token selecionado via CombatActions

  // Efeito para injetar SelectedTokenDisplay na coluna direita do Layout
  useEffect(() => {
    addContentToRight(<SelectedTokenDisplay token={selectedTokenFromCombatActions} />);

    // Limpeza ao desmontar
    return () => {
      // Limpa apenas o conteúdo da coluna direita, ou todo o layout se preferir.
      // Cuidado ao usar clearAllLayoutContent aqui se outros componentes também injetam conteúdo.
      clearContentFromRight(); 
    };
  }, [selectedTokenFromCombatActions, addContentToRight, clearContentFromRight]);


  const handleSaveAction = (newAction: CombatAction) => {
    if (actionToEdit) {
      setSavedActions(prevActions => prevActions.map(action =>
        action.id === actionToEdit.id ? newAction : action
      ));
      alert(`Ação "${newAction.name}" atualizada com sucesso!`);
      setActionToEdit(null);
    } else {
      setSavedActions(prevActions => [...prevActions, { ...newAction, isFavorite: false }]);
      alert(`Ação "${newAction.name}" salva com sucesso!`);
    }
    setActiveTab('acoes');
    console.log("Lista de ações salvas/atualizadas:", [...savedActions.filter(a => a.id !== (actionToEdit?.id || '')), newAction]);
  };

  const handleDeleteAction = (actionId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta ação?")) {
      setSavedActions(prevActions => prevActions.filter(action => action.id !== actionId));
      alert("Ação excluída!");
      if (actionToEdit && actionToEdit.id === actionId) {
        setActionToEdit(null);
      }
    }
  };

  const handleEditRequest = (action: CombatAction) => {
    setActionToEdit(action);
    setActiveTab('criar');
  };

  const handleToggleFavorite = (actionId: string, isFavorite: boolean) => {
    setSavedActions(prevActions => prevActions.map(action =>
      action.id === actionId ? { ...action, isFavorite: isFavorite } : action
    ));
  };

  // Callback de CombatActions para o token alvo selecionado
  const handleTokenSelectedFromCombatActions = (token: Token | null) => {
    setSelectedTokenFromCombatActions(token);
  };

  return (
    <div className="d-flex flex-column h-100 w-100 p-3">
      <h3 className="text-warning text-center mb-3">Gerenciador de Ações</h3>

      {/* Navegação por Abas */}
      <ul className="nav nav-tabs nav-justified mb-3 w-100 justify-content-center" role="tablist">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'acoes' ? 'active' : ''} text-white`}
            onClick={() => { setActiveTab('acoes'); setActionToEdit(null); }}
            type="button"
            role="tab"
            aria-controls="acoes-tab-pane"
            aria-selected={activeTab === 'acoes'}
          >
            Ações Salvas
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'criar' ? 'active' : ''} text-white`}
            onClick={() => { setActiveTab('criar'); setActionToEdit(null); }}
            type="button"
            role="tab"
            aria-controls="criar-tab-pane"
            aria-selected={activeTab === 'criar'}
          >
            Criar Ação
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'grupo' ? 'active' : ''} text-white`}
            onClick={() => setActiveTab('grupo')}
            type="button"
            role="tab"
            aria-controls="grupo-tab-pane"
            aria-selected={activeTab === 'grupo'}
          >
            Grupo
          </button>
        </li>
      </ul>

      {/* Conteúdo das Abas */}
      <div className="tab-content flex-grow-1 h-100">
        {activeTab === 'acoes' && (
          <div className="tab-pane fade show active h-100" id="acoes-tab-pane" role="tabpanel" aria-labelledby="acoes-tab">
            <CombatActions
              actions={savedActions}
              onDeleteAction={handleDeleteAction}
              onEditAction={handleEditRequest}
              onToggleFavorite={handleToggleFavorite}
              availableTokens={selectedTokensFromLayout} // PASSA OS TOKENS SELECIONADOS DO GRID
              onTokenSelected={handleTokenSelectedFromCombatActions}
            />
          </div>
        )}
        {activeTab === 'criar' && (
          <div className="tab-pane fade show active h-100" id="criar-tab-pane" role="tabpanel" aria-labelledby="criar-tab">
            <ActionCreator
              onSaveAction={handleSaveAction}
              actionToEdit={actionToEdit}
              onCancelEdit={() => setActionToEdit(null)}
            />
          </div>
        )}
        {activeTab === 'grupo' && (
          <div className="tab-pane fade show active h-100" id="grupo-tab-pane" role="tabpanel" aria-labelledby="grupo-tab">
            <div className="card bg-dark border-secondary text-white h-100 p-3 d-flex align-items-center justify-content-center">
              <p className="text-muted">Funcionalidade de Grupo em desenvolvimento.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionManager;