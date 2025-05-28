import React, { useState } from 'react';
import FullCharSheet from './FullCharSheet'; // Importa o componente da ficha completa
import { BasicAttribute, EssentialAttributes, Skill, CharacterAction } from '../../types'; // Ajuste o caminho conforme necessário
import deftoken from '../../img/0.png'; // Assumindo uma imagem de token padrão

// Defina a interface para os dados completos de cada personagem/ficha
export interface CharacterData {
  id: number; // Um ID único para a ficha (ex: "ficha-guerreira", "ficha-mago")
  name: string; // Nome do personagem para o rótulo da aba
  imageUrl: string;
  health: {
    current: number;
    max: number;
    deathSaves: {
      successes: Array<boolean | null>;
      failures: Array<boolean | null>;
    };
  };
  attributes: BasicAttribute[];
  skills: Skill[];
  essentialAttributes: EssentialAttributes;
  bioFields: {
    history: string;
    appearance: string;
    personality: string;
    treasure: string;
  };
  actions: CharacterAction[]; // Para armazenar magias/habilidades específicas do personagem
}

const CharacterSheetManager: React.FC = () => {
  // Dados mockados de múltiplas fichas de personagem.
  // No futuro, isso viria de um banco de dados ou de um estado global.
  const [characters, setCharacters] = useState<CharacterData[]>([
    {
      id: 1,
      name: 'Aella (Guerreira)',
      imageUrl: deftoken,
      health: { current: 35, max: 50, deathSaves: { successes: [null, null, null], failures: [null, null, null] } },
      attributes: [
        { name: 'Força', value: 18, modifier: 4 },
        { name: 'Destreza', value: 16, modifier: 3 },
        { name: 'Constituição', value: 14, modifier: 2 },
        { name: 'Inteligência', value: 10, modifier: 0 },
        { name: 'Sabedoria', value: 12, modifier: 1 },
        { name: 'Carisma', value: 8, modifier: -1 },
      ],
      skills: [
        { name: 'Atletismo', modifier: '+5' }, { name: 'Acrobacia', modifier: '+3' },
        { name: 'Furtividade', modifier: '+2' }, { name: 'Prestidigitação', modifier: '+2' },
        { name: 'Arcanismo', modifier: '+1' }, { name: 'História', modifier: '+0' },
        { name: 'Investigação', modifier: '+1' }, { name: 'Natureza', modifier: '+1' },
        { name: 'Religião', modifier: '+0' }, { name: 'Adestrar Animais', modifier: '+0' },
        { name: 'Intuição', modifier: '+1' }, { name: 'Medicina', modifier: '+0' },
        { name: 'Percepção', modifier: '+2' }, { name: 'Sobrevivência', modifier: '+0' },
        { name: 'Atuação', modifier: '+4' }, { name: 'Enganação', modifier: '+4' },
        { name: 'Intimidação', modifier: '+4' }, { name: 'Persuasão', modifier: '+4' },
      ],
      essentialAttributes: { armor: 16, initiative: '+2', proficiency: '+2', speed: '9 m' },
      bioFields: {
        history: "A história de Aella é marcada por batalhas em florestas sombrias e uma busca implacável por vingança contra os goblins que destruíram sua vila.",
        appearance: "Cabelos cor de ébano, olhos penetrantes que brilham no escuro. Uma cicatriz no braço esquerdo, lembrança de um encontro com um lobo atroz.",
        personality: "Reservada e cautelosa, mas fiercely leal aos seus companheiros. Tem um humor seco e um senso de justiça inabalável.",
        treasure: "Um punhal élfico de prata, um saco de moedas de ouro (150 gp) e um mapa rasgado de uma masmorra perdida."
      },
      actions: [
        {
          id: 4, name: 'Ataque Poderoso', mainType: 'attack', effectCategory: 'damage',
          attackRange: 'Corpo a Corpo', target: 'Um alvo', damageDice: '2d6 + 4', damageType: 'Perfurante',
          properties: ['Versátil'], description: 'Um ataque com grande força.', isFavorite: false
        },
        {
          id: 3, name: 'Curar Ferimentos', mainType: 'spell', effectCategory: 'healing',
          level: 1, castingTime: '1 Ação', duration: 'Instantânea', school: 'Evocação', healingDice: '1d8 + 2',
          description: 'Uma explosão de energia positiva que cura ferimentos.', isFavorite: true
        }
      ]
    },
    {
      id: 2,
      name: 'Elara (Maga)',
      imageUrl: deftoken,
      health: { current: 20, max: 25, deathSaves: { successes: [null, null, null], failures: [null, null, null] } },
      attributes: [
        { name: 'Força', value: 8, modifier: -1 },
        { name: 'Destreza', value: 14, modifier: 2 },
        { name: 'Constituição', value: 12, modifier: 1 },
        { name: 'Inteligência', value: 18, modifier: 4 },
        { name: 'Sabedoria', value: 10, modifier: 0 },
        { name: 'Carisma', value: 16, modifier: 3 },
      ],
      skills: [
        { name: 'Arcanismo', modifier: '+6' }, { name: 'História', modifier: '+4' },
        { name: 'Investigação', modifier: '+4' }, { name: 'Medicina', modifier: '+0' },
        { name: 'Persuasão', modifier: '+5' }, { name: 'Furtividade', modifier: '+2' },
        { name: 'Percepção', modifier: '+2' }, { name: 'Sobrevivência', modifier: '+0' },
        { name: 'Atuação', modifier: '+3' }, { name: 'Enganação', modifier: '+3' },
        { name: 'Intimidação', modifier: '+3' }, { name: 'Adestrar Animais', modifier: '+0' },
        { name: 'Atletismo', modifier: '+1' }, { name: 'Acrobacia', modifier: '+2' },
        { name: 'Natureza', modifier: '+4' }, { name: 'Religião', modifier: '+4' },
      ],
      essentialAttributes: { armor: 12, initiative: '+2', proficiency: '+2', speed: '9 m' },
      bioFields: {
        history: "Elara cresceu na academia arcana, onde seu talento inato para a magia logo se destacou. Sua busca por conhecimento a levou a explorar ruínas antigas e desvendar mistérios arcanos.",
        appearance: "Longos cabelos prateados, olhos azuis como safiras, sempre com um tomo de feitiços em mãos. Possui runas delicadas tatuadas nos pulsos.",
        personality: "Curiosa e intelectual, com uma pitada de arrogância. Confia mais em sua inteligência do que na força bruta, mas é leal aos seus amigos.",
        treasure: "Um orbe de cristal que pulsa com energia mágica, um grimório com feitiços raros e um conjunto de componentes arcanos exóticos."
      },
      actions: [
        {
          id: 2, name: 'Míssil Mágico', mainType: 'spell', effectCategory: 'damage',
          level: 1, castingTime: '1 Ação', duration: 'Instantânea', school: 'Evocação',
          attackRange: '36 metros', target: 'Até 3 alvos', damageDice: '1d4 + 1', damageType: 'Força',
          description: 'Cria três mísseis brilhantes que acertam alvos visíveis.', isFavorite: false
        },
        {
          id: 1, name: 'Escudo Arcano', mainType: 'spell', effectCategory: 'utility',
          level: 1, castingTime: '1 Reação', duration: '1 Rodada', school: 'Abjuração', utilityTitle: 'Aumenta CA',
          utilityValue: '+5', description: 'Cria uma barreira mágica invisível para se proteger.', isFavorite: true
        }
      ]
    },
    {
      id:3,
      name: 'Grom (Bárbaro)',
      imageUrl: deftoken,
      health: { current: 40, max: 40, deathSaves: { successes: [null, null, null], failures: [null, null, null] } },
      attributes: [
        { name: 'Força', value: 20, modifier: 5 },
        { name: 'Destreza', value: 10, modifier: 0 },
        { name: 'Constituição', value: 18, modifier: 4 },
        { name: 'Inteligência', value: 7, modifier: -2 },
        { name: 'Sabedoria', value: 10, modifier: 0 },
        { name: 'Carisma', value: 12, modifier: 1 },
      ],
      skills: [
        { name: 'Atletismo', modifier: '+7' }, { name: 'Intimidação', modifier: '+3' },
        { name: 'Sobrevivência', modifier: '+2' }, { name: 'Percepção', modifier: '+0' },
        { name: 'Acrobacia', modifier: '+0' }, { name: 'Furtividade', modifier: '+0' },
        { name: 'Prestidigitação', modifier: '+0' }, { name: 'Arcanismo', modifier: '-2' },
        { name: 'História', modifier: '-2' }, { name: 'Investigação', modifier: '-2' },
        { name: 'Natureza', modifier: '+0' }, { name: 'Religião', modifier: '-2' },
        { name: 'Adestrar Animais', modifier: '+0' }, { name: 'Intuição', modifier: '+0' },
        { name: 'Medicina', modifier: '+0' }, { name: 'Atuação', modifier: '+1' },
        { name: 'Enganação', modifier: '+1' }, { name: 'Persuasão', modifier: '+1' },
      ],
      essentialAttributes: { armor: 14, initiative: '+0', proficiency: '+2', speed: '12 m' },
      bioFields: {
        history: "Grom é um bárbaro das terras selvagens, banido de seu clã após um conflito com o chefe. Agora, ele vagueia em busca de desafios e glória em combate.",
        appearance: "Grande e musculoso, com uma barba espessa e trançada. Cicatrizes de batalhas cobrem seu corpo. Usa peles de animais e machados de duas mãos.",
        personality: "Impulsivo e facilmente provocado, mas surpreendentemente leal quando sua confiança é conquistada. Odeia a covardia e adora um bom banquete.",
        treasure: "Um machado de batalha ancestral adornado com runas, um cinto de moedas de prata (200 sp) e dentes de orc como colar."
      },
      actions: [
        {
          id: 2, name: 'Fúria Bárbara', mainType: 'utility', effectCategory: 'utility',
          utilityTitle: 'Entra em Fúria', duration: '1 minuto',
          description: 'Entra em um estado de fúria selvagem, ganhando bônus em dano e resistência.', isFavorite: true
        },
        {
          id: 1, name: 'Ataque Furioso', mainType: 'attack', effectCategory: 'damage',
          attackRange: 'Corpo a Corpo', target: 'Um alvo', damageDice: '1d12 + 5', damageType: 'Cortante',
          properties: ['Pesada', 'Duas Mãos'], description: 'Um golpe devastador com seu machado.', isFavorite: false
        }
      ]
    },
    // Adicione mais personagens conforme necessário
  ]);

  // Estado para controlar qual ficha (personagem) está ativa.
  const [activeCharacterId, setActiveCharacterId] = useState<number>(characters[0]?.id || 0);

  // Função para atualizar os dados de um personagem específico
  // Esta função é passada para FullCharSheet para que ele possa reportar as mudanças
  const handleUpdateCharacterData = (id: number, updatedData: Partial<CharacterData>) => {
    setCharacters(prevCharacters =>
      prevCharacters.map(char =>
        char.id === id ? { ...char, ...updatedData } : char
      )
    );
  };

  // Mensagem caso não haja personagens
  if (characters.length === 0) {
    return (
      <div className="p-4 text-white text-center">
        <h3>Nenhum personagem disponível.</h3>
        <p>Crie um novo personagem para começar!</p>
        <button className="btn btn-warning mt-3" onClick={() => alert('Abrir modal de criação de personagem!')}>
          Criar Novo Personagem
        </button>
      </div>
    );
  }

  // Encontra os dados do personagem ativo para passar ao FullCharSheet
  const activeCharacterData = characters.find(char => char.id === activeCharacterId);

  return (
    <div className="d-flex flex-column h-100 w-100 p-3">


      {/* Navegação por Abas */}
      <ul className="nav nav-tabs nav-justified mb-3 w-100 justify-content-center" role="tablist">
        {characters.map((char) => (
          <li className="nav-item" key={char.id}>
            <button
              className={`nav-link ${activeCharacterId === char.id ? 'active' : ''} text-white`}
              onClick={() => setActiveCharacterId(char.id)}
              type="button"
              role="tab"
              aria-controls={`${char.id}-tab-pane`}
              aria-selected={activeCharacterId === char.id}
            >
              {char.name}
            </button>
          </li>
        ))}
        {/* Botão para adicionar nova ficha */}
        <li className="nav-item">
          <button
            className="nav-link text-info"
            onClick={() => alert('Funcionalidade para adicionar nova ficha!')}
            type="button"
          >
            + Nova Ficha
          </button>
        </li>
      </ul>

      {/* Conteúdo das Abas (renderiza FullCharSheet apenas para o personagem ativo) */}
      <div className="tab-content flex-grow-1 h-100">
        {activeCharacterData && (
          <div
            key={activeCharacterData.id}
            className="tab-pane fade show active h-100" // Manter show active para garantir a exibição do conteúdo da aba
            id={`${activeCharacterData.id}-tab-pane`}
            role="tabpanel"
            aria-labelledby={`${activeCharacterData.id}-tab`}
          >
            {/* O FullCharSheet agora recebe os dados do personagem e a função de atualização */}
            <FullCharSheet
           characterData={activeCharacterData}
           updateCharacterData={handleUpdateCharacterData}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSheetManager;