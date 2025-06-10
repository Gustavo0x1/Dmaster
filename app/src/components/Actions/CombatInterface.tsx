// src/components/CombatInterface/CombatInterface.tsx
import React, { useState, useEffect, useCallback } from 'react';
import CombatActions from './CombatActions';
import CombatTokensDisplay from '../CombatTokenDisplay';
import { CharacterAction, Token } from '../../types';
import { useLayout } from '../Layout';
import { v4 as uuidv4 } from 'uuid';
import SampleToken from '../../img/0.png';
import SampleToken2 from '../../img/1.png';

interface CombatInterfaceProps {
  // Se as ações fossem gerenciadas por um pai mais acima, elas viriam aqui
  // Por agora, vamos simular que este componente "recebe" ações e também as cria.
}

const CombatInterface: React.FC<CombatInterfaceProps> = () => {

  // NOVO: Ações de combate gerenciadas aqui.
  const [combatActions, setCombatActions] = useState<CharacterAction[]>([]);
  // Mudar a forma como os tokens são gerenciados
  const [enemies, setEnemies] = useState<Token[]>([]);
  const electron = (window as any).electron;
  const [allies, setAllies] = useState<Token[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<Token[]>([]); // NOVO: Estado para tokens selecionados

  // useLayout para injetar o CombatTokensDisplay na coluna esquerda
  const { addContentToLeft, clearContentFromLeft, addContentToRight, clearContentFromRight } = useLayout();

  // State to hold the JSX for the Damage Formula section
  const [damageFormulaContent, setDamageFormulaContent] = useState<React.ReactNode | null>(null);
  // NEW State to hold the JSX for the Hit Formula section
  const [hitFormulaContent, setHitFormulaContent] = useState<React.ReactNode | null>(null);


  // Callback to receive the Damage Formula JSX from CombatActions
  const handleRenderDamageFormula = useCallback((formulaJSX: React.ReactNode) => {
    setDamageFormulaContent(formulaJSX);
  }, []);

  // NEW Callback to receive the Hit Formula JSX from CombatActions
  const handleRenderHitFormula = useCallback((formulaJSX: React.ReactNode) => {
    setHitFormulaContent(formulaJSX);
  }, []);

  // Mocks de tokens disponíveis para o combate
  useEffect(() => {
    // Definindo inimigos e aliados na inicialização
    const initialEnemies: Token[] = [
      { id: 101, name: 'Goblin 1', portraitUrl: SampleToken, currentHp: 5, maxHp: 7, ac: 13, x: 1, y: 1, image: '', width: 1, height: 1 },
      { id: 102, name: 'Orc Líder', portraitUrl: SampleToken, currentHp: 20, maxHp: 25, ac: 15, x: 2, y: 3, image: '', width: 1, height: 1 },
      { id: 103, name: 'Esqueleto', portraitUrl: SampleToken, currentHp: 8, maxHp: 10, ac: 12, x: 4, y: 2, image: '', width: 1, height: 1 },
    ];
    const initialAllies: Token[] = [
      { id: 201, name: 'Herói A', portraitUrl: SampleToken2, currentHp: 30, maxHp: 30, ac: 18, x: 5, y: 5, image: '', width: 1, height: 1 },
      { id: 202, name: 'Curandeiro B', portraitUrl: SampleToken2, currentHp: 25, maxHp: 25, ac: 14, x: 6, y: 6, image: '', width: 1, height: 1 },
    ];
    setEnemies(initialEnemies);
    setAllies(initialAllies);
  }, []);

  useEffect(() => {
    if (1) {
      electron.invoke('request-character-data', 1)
        .then((response: any) => {
          if (response.success && response.data) {
            const data = response.data;
            setCombatActions(data.actions || []);
            console.log("Dados do personagem carregados:", data);
          } else {
            console.error("Erro ao carregar dados do personagem:", response.message);
          }
        })
        .catch((error: unknown) => {
          console.error("Erro na comunicação IPC ao carregar dados do personagem:", error);
        });
    }
  }, [electron]);

  useEffect(() => {
    // Renderiza o CombatTokensDisplay na coluna esquerda
    addContentToLeft(
      <CombatTokensDisplay
        enemies={enemies}
        allies={allies}
        selectedTokens={selectedTokens}
        onTokenSelectionChange={setSelectedTokens} // Passa a função para atualizar os selecionados
      />
    );

    // Renderiza o conteúdo das fórmulas de Dano e Acerto na coluna direita
    if (damageFormulaContent && hitFormulaContent) {
      // You can arrange them as you like here, e.g., using a div to wrap them
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


    // Limpa o conteúdo da coluna esquerda e direita quando o componente é desmontado
    return () => {
      clearContentFromLeft();
      clearContentFromRight();
    };
  }, [
    enemies,
    allies,
    selectedTokens,
    addContentToLeft,
    clearContentFromLeft,
    damageFormulaContent,
    hitFormulaContent,
    addContentToRight,
    clearContentFromRight
  ]);


  // Funções que o CombatActions usará para gerenciar as ações de combate
  const handleEditCombatAction = (action: CharacterAction) => {
    setCombatActions(prev => prev.map(a => a.id === action.id ? action : a));
    console.log("Ação atualizada no CombatInterface:", action);
    // IMPORTANTE: No cenário real, isso PRECISA notificar o CharacterSheet ou o gerenciador de estado global
    // para que a edição seja persistente e consistente entre as duas telas.
  };
  const handleDeleteCombatAction = (actionId: number) => {
    setCombatActions(prev => prev.filter(a => a.id !== actionId));
    console.log("Ação deletada no CombatInterface:", actionId);
    // IMPORTANTE: Notificar o CharacterSheet ou o gerenciador de estado global
  };


  const handleToggleCombatFavorite = (isFavorite: boolean, actionId?: number) => {
    setCombatActions(prev => prev.map(a => a.id === actionId ? { ...a, isFavorite: isFavorite } : a));
    console.log(`Ação ${actionId} favoritada: ${isFavorite} no CombatInterface.`);
    // IMPORTANTE: Notificar o CharacterSheet ou o gerenciador de estado global
  };

  return (
    <div className="combat-interface-container h-100 d-flex flex-column p-3">
      <h3 className="text-highlight-warning text-center mb-4">Mesa de Combate</h3>

      <div className="flex-grow-1 overflow-auto">
        <CombatActions
          actions={combatActions}
          onDeleteAction={handleDeleteCombatAction}
          onEditAction={handleEditCombatAction}
          onToggleFavorite={handleToggleCombatFavorite}
          selectedTokens={selectedTokens}
          onRenderDamageFormula={handleRenderDamageFormula} // Pass the new prop
          onRenderHitFormula={handleRenderHitFormula} // NEW: Pass the hit formula prop
        />
      </div>
    </div>
  );
};

export default CombatInterface;