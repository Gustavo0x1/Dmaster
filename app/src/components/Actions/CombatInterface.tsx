// src/components/CombatInterface/CombatInterface.tsx
import React, { useState, useEffect } from 'react';
import CombatActions from './CombatActions';
import SelectedTokenDisplay from './TokenSelection';
import { CharacterAction, Token } from '../../types';
import { useLayout } from '../Layout'; // Assumindo que você tem um LayoutContext
import {v4 as uuidv4} from 'uuid'
interface CombatInterfaceProps {
  // Se as ações fossem gerenciadas por um pai mais acima, elas viriam aqui
  // Por agora, vamos simular que este componente "recebe" ações e também as cria.
}

const CombatInterface: React.FC<CombatInterfaceProps> = () => {
  // NOVO: Ações de combate gerenciadas aqui.
  const [combatActions, setCombatActions] = useState<CharacterAction[]>([]);
  const [selectedTokenToDisplay, setSelectedTokenToDisplay] = useState<Token | null>(null);

  // Mocks de tokens disponíveis para o combate
  const availableCombatTokens: Token[] = [
    { id: 101, name: 'Goblin 1', portraitUrl: 'https://via.placeholder.com/30/00FF00/000000?text=G1', currentHp: 5, maxHp: 7, ac: 13, x: 1, y: 1, image: '', width: 1, height: 1 },
    { id: 102, name: 'Orc Líder', portraitUrl: 'https://via.placeholder.com/30/FF4500/FFFFFF?text=OL', currentHp: 20, maxHp: 25, ac: 15, x: 2, y: 3, image: '', width: 1, height: 1 },
    { id: 103, name: 'Esqueleto', portraitUrl: 'https://via.placeholder.com/30/C0C0C0/000000?text=SK', currentHp: 8, maxHp: 10, ac: 12, x: 4, y: 2, image: '', width: 1, height: 1 },
  ];

  // Adiciona 2 inserções aleatórias na inicialização (apenas para demonstração)
  useEffect(() => {
    const defaultActions: CharacterAction[] = [
      {
        id: uuidv4(),
        name: 'Bola de Fogo',
        description: 'Uma explosão de fogo que incinera inimigos em uma área.',
        mainType: 'spell',
        effectCategory: 'damage',
        isFavorite: true,
        damageDice: '8d6',
        damageType: 'Fogo',
        level: 3,
        castingTime: '1 Ação',
        range: '45m',
        duration: 'Instantânea',
        saveDC: 'CD Destreza (Metade do Dano)',
        school: 'Evocação',
        target: 'Área de 6m de raio'
      },
      {
        id: uuidv4(),
        name: 'Ataque com Espada Longa',
        description: 'Um golpe certeiro com sua espada de combate.',
        mainType: 'attack',
        effectCategory: 'damage',
        isFavorite: false,
        damageDice: '1d8',
        damageType: 'Cortante',
        attackRange: 'Corpo a Corpo',
        properties: ['Versátil (1d10)'],
        target: 'Um criatura'
      },
       {
        id: uuidv4(),
        name: 'Palavra Curativa',
        description: 'Cura um alvo com uma palavra divina.',
        mainType: 'spell',
        effectCategory: 'healing',
        isFavorite: false,
        healingDice: '1d4+2',
        level: 1,
        castingTime: '1 Ação Bônus',
        range: '18m',
        duration: 'Instantânea',
        school: 'Evocação',
        target: 'Um criatura'
      },
      {
        id: uuidv4(),
        name: 'Invisibilidade',
        description: 'Torna uma criatura invisível ao toque.',
        mainType: 'spell',
        effectCategory: 'utility',
        isFavorite: true,
        utilityTitle: 'Invisível',
        utilityValue: 'Alvo se torna invisível',
        level: 2,
        castingTime: '1 Ação',
        range: 'Toque',
        duration: '1 hora (Concentração)',
        school: 'Ilusão',
        target: 'Um criatura'
      }
    ];
    setCombatActions(defaultActions);
  }, []); // O array vazio garante que rode apenas uma vez na montagem

  // Se você usa useLayout para injetar o display do token na coluna direita
  const { addContentToRight, clearContentFromRight } = useLayout();

  useEffect(() => {
    addContentToRight(<SelectedTokenDisplay token={selectedTokenToDisplay} />);
    return () => { clearContentFromRight(); };
  }, [selectedTokenToDisplay, addContentToRight, clearContentFromRight]);

  // Funções que o CombatActions usará para gerenciar as ações de combate
  const handleEditCombatAction = (action: CharacterAction) => {
    // No contexto de combate, "editar" pode significar apenas atualizar o estado local
    // ou, se houver um modal de edição de ação aqui, abri-lo.
    // Para este exemplo, apenas atualiza o estado se a ação já existir.
    setCombatActions(prev => prev.map(a => a.id === action.id ? action : a));
    console.log("Ação atualizada no CombatInterface:", action);
    // IMPORTANTE: No cenário real, isso PRECISA notificar o CharacterSheet ou o gerenciador de estado global
    // para que a edição seja persistente e consistente entre as duas telas.
  };

  const handleDeleteCombatAction = (actionId: string) => {
    setCombatActions(prev => prev.filter(a => a.id !== actionId));
    console.log("Ação deletada no CombatInterface:", actionId);
    // IMPORTANTE: Notificar o CharacterSheet ou o gerenciador de estado global
  };

  const handleToggleCombatFavorite = (actionId: string, isFavorite: boolean) => {
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
          availableTokens={availableCombatTokens}
          onTokenSelected={setSelectedTokenToDisplay}
        />
      </div>
    </div>
  );
};

export default CombatInterface;