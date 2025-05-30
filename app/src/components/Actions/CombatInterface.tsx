// src/components/CombatInterface/CombatInterface.tsx
import React, { useState, useEffect } from 'react';
import CombatActions from './CombatActions';
import CombatTokensDisplay from '../CombatTokenDisplay';
import { CharacterAction, Token } from '../../types';
import { useLayout } from '../Layout';
import { v4 as uuidv4 } from 'uuid';
import SampleToken from '../../img/0.png'
import SampleToken2 from '../../img/1.png'
interface CombatInterfaceProps {
  // Se as ações fossem gerenciadas por um pai mais acima, elas viriam aqui
  // Por agora, vamos simular que este componente "recebe" ações e também as cria.
}

const CombatInterface: React.FC<CombatInterfaceProps> = () => {
  // NOVO: Ações de combate gerenciadas aqui.
  const [combatActions, setCombatActions] = useState<CharacterAction[]>([]);
  // Mudar a forma como os tokens são gerenciados
  const [enemies, setEnemies] = useState<Token[]>([]);
  const [allies, setAllies] = useState<Token[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<Token[]>([]); // NOVO: Estado para tokens selecionados

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

  // useLayout para injetar o CombatTokensDisplay na coluna esquerda
  const { addContentToLeft, clearContentFromLeft } = useLayout();

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
    // Limpa o conteúdo da coluna esquerda quando o componente é desmontado
    return () => { clearContentFromLeft(); };
  }, [enemies, allies, selectedTokens, addContentToLeft, clearContentFromLeft]);


  // Funções que o CombatActions usará para gerenciar as ações de combate
  const handleEditCombatAction = (action: CharacterAction) => {
    setCombatActions(prev => prev.map(a => a.id === action.id ? action : a));
    console.log("Ação atualizada no CombatInterface:", action);
    // IMPORTANTE: No cenário real, isso PRECISA notificar o CharacterSheet ou o gerenciador de estado global
    // para que a edição seja persistente e consistente entre as duas telas.
  };
  const handleDeleteCombatAction = (actionId: number) => {
// <--- This function expects 'actionId' to be a 'number'
    setCombatActions(prev => prev.filter(a => a.id !== actionId));
    console.log("Ação deletada no CombatInterface:", actionId);
    // IMPORTANTE: Notificar o CharacterSheet ou o gerenciador de estado global
  };


  const handleToggleCombatFavorite = (isFavorite: boolean,actionId?: number) => {
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

        />
      </div>
    </div>
  );
};

export default CombatInterface;