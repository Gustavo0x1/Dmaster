// src/components/CombatInterface/CombatInterface.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CombatActions from './CombatActions';
import CombatTokensDisplay from '../CombatTokenDisplay';
import { CharacterAction, Token } from '../../types';
import { useLayout } from '../Layout';
// Importação de uuidv4 e SampleToken podem ser removidas se não forem mais usadas para mocks de tokens
import { v4 as uuidv4 } from 'uuid';
import SampleToken from '../../img/0.png';
import SampleToken2 from '../../img/1.png';

interface CombatInterfaceProps {}

interface CharacterOption {
  id: number;
  name: string;
}

const CombatInterface: React.FC<CombatInterfaceProps> = () => {
  const electron = (window as any).electron;

  // Manter enemies e allies para o CombatTokensDisplay, como você indicou que é separado.
  // Em um cenário real, estes viriam de alguma fonte de dados de combate/mapa.
  const [enemies, setEnemies] = useState<Token[]>([]);
  const [allies, setAllies] = useState<Token[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<Token[]>([]);
interface InitiativeState {
  combatants: Token[];
  allies: Token[];
  enemies: Token[];
  currentTurnIndex: number;
}
  // Estado para as ações do personagem ATIVO, carregadas do DB
  const [activeCharacterActions, setActiveCharacterActions] = useState<CharacterAction[]>([]);
  // Estado para o ID do personagem atualmente selecionado no dropdown
  const [activeCharacterId, setActiveCharacterId] = useState<number | null>(null);
  // Estado para a lista de personagens para popular o dropdown (ID e Nome)
  const [characterOptions, setCharacterOptions] = useState<CharacterOption[]>([]);

  const { addContentToLeft, clearContentFromLeft, addContentToRight, clearContentFromRight } = useLayout();
  const [damageFormulaContent, setDamageFormulaContent] = useState<React.ReactNode | null>(null);
  const [hitFormulaContent, setHitFormulaContent] = useState<React.ReactNode | null>(null);
 const [currentInitiativeState, setCurrentInitiativeState] = useState<InitiativeState>({
    combatants: [],
    allies: [],
    enemies: [],
    currentTurnIndex: 0
  });
  const handleRenderDamageFormula = useCallback((formulaJSX: React.ReactNode) => {
    setDamageFormulaContent(formulaJSX);
  }, []);

  const handleRenderHitFormula = useCallback((formulaJSX: React.ReactNode) => {
    setHitFormulaContent(formulaJSX);
  }, []);

  // Mocks de tokens para o CombatTokensDisplay (mantidos como você os tinha)
  useEffect(() => {
    if (electron) {

      const handleInitiativeSync = ( data: any) => {
        console.log("[CombatInterface] Dados de iniciativa recebidos do servidor:", data);
        setAllies(data.allies)
        setEnemies(data.enemies)
        
        setCurrentInitiativeState(data); // Atualiza o estado completo da iniciativa
      };

      electron.on('initiative-sync-from-server', handleInitiativeSync);

      // NOVO: Envia uma requisição para o main.js para obter o estado inicial da iniciativa
      console.log("[CombatInterface] Requisitando estado inicial da iniciativa...");
      electron.send('request-initial-initiative-state'); //

      return () => {
        electron.DoremoveListener('initiative-sync-from-server', handleInitiativeSync);
      };
    }
  }, [electron]);
  // NOVO: useEffect para carregar a lista de personagens com ações para o select
  useEffect(() => {
    const fetchActionCharacterOptions = async () => {
      if (electron) {
        try {
          // Invoca o novo handler para obter apenas os IDs e Nomes dos personagens com ações
          const response = await electron.invoke('get-action-character-options');
          if (response.success && response.data) {
            setCharacterOptions(response.data);
            // Define o primeiro personagem da lista como padrão, se nenhum estiver selecionado
            if (activeCharacterId === null && response.data.length > 0) {
              setActiveCharacterId(response.data[0].id);
            }
          } else {
            console.error("Erro ao carregar opções de personagens com ações:", response.message);
          }
        } catch (error) {
          console.error("Erro na comunicação IPC ao carregar opções de personagens com ações:", error);
        }
      }
    };
    fetchActionCharacterOptions();
  }, [electron, activeCharacterId]); // Dependências: electron para chamar IPC, activeCharacterId para definir padrão na 1a vez


  // NOVO: useEffect para carregar as ações do personagem selecionado
  useEffect(() => {
    const fetchActiveCharacterActions = async () => {
      if (activeCharacterId !== null && electron) {
        try {
          // Usa o handler existente 'request-character-data' para obter os dados completos (incluindo ações)
          const response = await electron.invoke('request-character-data', activeCharacterId);
          if (response.success && response.data) {
            setActiveCharacterActions(response.data.actions || []);
            console.log(`Ações carregadas para o personagem ${activeCharacterId}:`, response.data.actions);
          } else {
            setActiveCharacterActions([]); // Limpa se houver erro ou personagem não encontrado
            console.error(`Erro ao carregar ações para o personagem ${activeCharacterId}:`, response.message);
          }
        } catch (error) {
          setActiveCharacterActions([]);
          console.error(`Erro na comunicação IPC ao carregar ações do personagem ${activeCharacterId}:`, error);
        }
      } else {
        setActiveCharacterActions([]); // Limpa as ações se nenhum personagem estiver selecionado
      }
    };

    fetchActiveCharacterActions();
  }, [activeCharacterId, electron]); // Dependências: activeCharacterId (para recarregar ao mudar) e electron


  useEffect(() => {
    // Renderiza o CombatTokensDisplay na coluna esquerda
    addContentToLeft(
      <CombatTokensDisplay
        enemies={enemies}
        allies={allies}
        selectedTokens={selectedTokens}
        onTokenSelectionChange={setSelectedTokens}
      />
    );

    // Renderiza o conteúdo das fórmulas de Dano e Acerto na coluna direita
    if (damageFormulaContent && hitFormulaContent) {
      addContentToRight(
        <div>
          {damageFormulaContent}
          {hitFormulaContent}
        </div>
      );
    } else if (damageFormulaContent) {
      addContentToRight(damageFormulaContent);
    } else if (hitFormulaContent) {
      addContentToRight(hitFormulaContent);
    }

    return () => {
      clearContentFromLeft();
      clearContentFromRight();
    };
  }, [
    enemies, // Agora depende apenas dos mocks de enemies/allies
    allies,
    selectedTokens,
    addContentToLeft,
    clearContentFromLeft,
    damageFormulaContent,
    hitFormulaContent,
    addContentToRight,
    clearContentFromRight
  ]);


  // Funções que o CombatActions usará para gerenciar as ações de combate.
  // AGORA, estas funções também precisarão invocar o IPC para persistir as mudanças no DB.

  const handleEditCombatAction = useCallback(async (action: CharacterAction) => {
    if (!activeCharacterId || !electron) return;

    // Primeiro, atualize o DB via IPC
    const response = await electron.invoke('edit-action', activeCharacterId, action);
    if (response.success) {
      // Se a atualização no DB foi bem-sucedida, atualize o estado local
      setActiveCharacterActions(prev => prev.map(a => a.id === action.id ? action : a));
      console.log("Ação atualizada no CombatInterface e DB:", action);
    } else {
      console.error("Falha ao atualizar ação no DB:", response.message);
      // Opcional: mostrar um alerta para o usuário
    }
  }, [activeCharacterId, electron]);

  const handleDeleteCombatAction = useCallback(async (actionId: number) => {
    if (!activeCharacterId || !electron) return;

    // Primeiro, confirme com o usuário se desejar (aqui omitido para brevidade)
    // Depois, delete no DB via IPC
    const response = await electron.invoke('delete-action', activeCharacterId, actionId);
    if (response.success) {
      // Se a exclusão no DB foi bem-sucedida, atualize o estado local
      setActiveCharacterActions(prev => prev.filter(a => a.id !== actionId));
      console.log("Ação deletada no CombatInterface e DB:", actionId);
    } else {
      console.error("Falha ao deletar ação no DB:", response.message);
      // Opcional: mostrar um alerta para o usuário
    }
  }, [activeCharacterId, electron]);


  const handleToggleCombatFavorite = useCallback(async (isFavorite: boolean, actionId?: number) => {
    if (!activeCharacterId || !electron || actionId === undefined) return;

    // Encontre a ação para obter todos os seus dados antes de enviar para edição
    const actionToUpdate = activeCharacterActions.find(a => a.id === actionId);
    if (!actionToUpdate) return;

    // Crie uma cópia da ação com o favorito atualizado
    const updatedAction = { ...actionToUpdate, isFavorite: isFavorite };

    // Atualize o DB via IPC
    const response = await electron.invoke('edit-action', activeCharacterId, updatedAction);
    if (response.success) {
      // Se a atualização no DB foi bem-sucedida, atualize o estado local
      setActiveCharacterActions(prev => prev.map(a => a.id === actionId ? updatedAction : a));
      console.log(`Ação ${actionId} favoritada: ${isFavorite} no CombatInterface e DB.`);
    } else {
      console.error("Falha ao favoritar/desfavoritar ação no DB:", response.message);
    }
  }, [activeCharacterId, electron, activeCharacterActions]);


  // Handler para selecionar um novo personagem ativo no dropdown
  const handleSelectActiveCharacter = useCallback((characterIdString: number) => {

    setActiveCharacterId(characterIdString);
  }, []);

  return (
    <div className="combat-interface-container h-100 d-flex flex-column p-3">
      <h3 className="text-highlight-warning text-center mb-4">Mesa de Combate</h3>

      {/* Dropdown de seleção de personagem */}
      <div className="mb-3">
        <label htmlFor="activeCharacterSelect" className="form-label text-white">Controlando:</label>
        <select
          id="activeCharacterSelect"
          className="form-select bg-dark text-white border-secondary"
          value={activeCharacterId === null ? '' : activeCharacterId}
          onChange={(e) => handleSelectActiveCharacter(parseInt(e.target.value))}
        >
          <option value="">Selecione um Personagem</option>
          {characterOptions.map(char => (
            <option key={char.id} value={char.id}>
              {char.name}
            </option>
          ))}
        </select>
      </div>
      <hr className="border-secondary mb-4" />

      <div className="flex-grow-1 overflow-auto">
        <CombatActions
          actions={activeCharacterActions} // Passa as ações do personagem ativo carregadas do DB
          onDeleteAction={handleDeleteCombatAction}
          onEditAction={handleEditCombatAction}
          onToggleFavorite={handleToggleCombatFavorite}
          selectedTokens={selectedTokens}
          // availableTokens já não é mais necessário aqui para a seleção de personagem principal
          // Se CombatActions ainda precisa de todos os tokens para outros fins (e.g., alvos), você pode passar enemies.concat(allies)
          availableTokens={enemies.concat(allies)} // Ainda é necessário para o seletor de alvo!
          onRenderDamageFormula={handleRenderDamageFormula}
          onRenderHitFormula={handleRenderHitFormula}
          // onSelectCharacter e activeCharacterId podem ser removidos do CombatActions.tsx se o dropdown for apenas aqui
          // Mas manter se CombatActions usar esses props para feedback visual ou lógica interna.
          
          
        />
      </div>
    </div>
  );
};

export default CombatInterface;