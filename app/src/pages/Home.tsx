// components/Home.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useLayout } from '../components/Layout'; // Import useLayout
import RPGGrid from '../components/MainGrids';
import Chat from '../components/ChatBox';
import CombatTracker from '../components/Actions/CombatTracker';
import { CharacterSheet, Token, DamageLogEntry } from '../types';
// Define a type for the sendChatMessage function
type SendChatMessageFunction = (message: string) => void;
const initialCharacterData: CharacterSheet[] = [
  {
    id: 1,
    name: 'Elara',
    imageUrl: 'https://placehold.co/40x40/FF5733/white?text=E', // Exemplo de imagem
    health: { current: 30, max: 30 ,deathSaves: { successes: [null, null, null], failures: [null, null, null] } },

    attributes: [
      { name: 'Força', value: 14, modifier: 2 },
      { name: 'Destreza', value: 16, modifier: 3 },
      { name: 'Constituição', value: 12, modifier: 1 },
      { name: 'Inteligência', value: 10, modifier: 0 },
      { name: 'Sabedoria', value: 13, modifier: 1 },
      { name: 'Carisma', value: 8, modifier: -1 },
    ],
    essentialAttributes: { armor: 15, initiative: '3', proficiency: '2', speed: '30' },
    skills: [],
    bioFields: { history: '', personality: '', appearance: '', treasure: '' },
    actions: [],

  },
  {
    id: 2,
    name: 'Grom',
    imageUrl: 'https://placehold.co/40x40/3366FF/white?text=G', // Exemplo de imagem
    health: { current: 45, max: 45 ,deathSaves: { successes: [null, null, null], failures: [null, null, null] } },
    attributes: [], // Simplificado para o exemplo
    essentialAttributes: { armor: 18, initiative: '0', proficiency: '2', speed: '25' },
    skills: [],
    bioFields: { history: '', personality: '', appearance: '', treasure: '' },
    actions: [],

  },
];

// Mock de NPCs para o Combat Tracker
const initialNPCTokens: Token[] = [
  {
    id: 1,
    name: 'Goblin 2',
    image: 'https://placehold.co/40x40/880000/white?text=G2',
    initiative: 1,
    currentHp: 10,
    maxHp: 10,
    ac:1,
    portraitUrl: 'null',
    x:0,
    y:0,
    width:1,
    height:3
  },
  {
    id: 2,
    name: 'Goblin 2',
    image: 'https://placehold.co/40x40/880000/white?text=G2',
    initiative: 1,
    currentHp: 10,
    maxHp: 10,
    ac:1,
    portraitUrl: 'null',
    x:0,
    y:0,
    width:1,
    height:3
  },
];
const Home: React.FC = () => {
  const { addContentToCenter, addContentToLeft,addContentToRight, clearContentFromCenter, clearContentFromRight } = useLayout(); // Use the layout hook
  const [sendChatMessage, setSendChatMessage] = useState<SendChatMessageFunction | null>(null);
  const [characters, setCharacters] = useState<CharacterSheet[]>(initialCharacterData);
  const [npcTokens, setNpcTokens] = useState<Token[]>(initialNPCTokens);
  const [damageLogs, setDamageLogs] = useState<DamageLogEntry[]>([]);

  // Função para atualizar dados de um personagem (já existe no seu FullCharSheet)
  const updateCharacterData = (id: number, updates: Partial<CharacterSheet>) => {
    setCharacters(prev =>
      prev.map(char => (char.id === id ? { ...char, ...updates } : char))
    );
  };

  // Função para atualizar a saúde de qualquer combatente (personagem ou NPC)
  const handleUpdateCombatantHealth = (combatantId: number, newHealth: number) => {
    // Tenta atualizar um personagem
    setCharacters(prevChars =>
      prevChars.map(char =>
        char.id === combatantId ? { ...char, health: { ...char.health, current: newHealth } } : char
      )
    );
    // Tenta atualizar um NPC
    setNpcTokens(prevNpcs =>
      prevNpcs.map(npc =>
        npc.id === combatantId ? { ...npc, currentHp: newHealth } : npc
      )
    );
  };

  // Função para adicionar um registro de dano (para o CombatTracker)
  const handleAddDamageLogEntry = (entry: DamageLogEntry) => {
    setDamageLogs(prev => [...prev, entry]);
    console.log("Novo registro de dano:", entry);
  };

  // Combina personagens e NPCs para passar ao CombatTracker
  const allCombatants: Token[] = [
    ...characters.map(char => ({

    id: char.id,
    name:  char.name,
    image:  char.imageUrl,
    initiative: 1,
    currentHp:  char.health.current,
    maxHp: char.health.max,
    ac:1,
    portraitUrl: 'null',
    x:0,
    y:0,
    width:1,
    height:3
    })),
    ...npcTokens,
  ];

  // Use useEffect to add components to layout when Home mounts
  useEffect(() => {
    // Add RPGGrid to the center column
    addContentToLeft(  <CombatTracker
            combatants={allCombatants}
            onUpdateCombatantHealth={handleUpdateCombatantHealth}
            onAddDamageLogEntry={handleAddDamageLogEntry}
          />)
    addContentToCenter(<RPGGrid />);
    // Add Chat to the right column, passing the setSendChatMessage prop
    addContentToRight(<Chat setSendChatMessage={setSendChatMessage} />);

    // Cleanup function to remove components when Home unmounts
    return () => {
      clearContentFromCenter();
      clearContentFromRight();
    };
  }, [addContentToCenter, addContentToRight, clearContentFromCenter, clearContentFromRight, setSendChatMessage]);

  // The Home component itself doesn't need to render anything directly
  // within its return, as its children are now managed by the Layout.
  return null; // Or a loading spinner, or some placeholder if needed
};

export default Home;