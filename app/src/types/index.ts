// src/types/index.ts

// Para Atributos Básicos (Força, Destreza, etc.)
export interface BasicAttribute {
  name: string;
  value: number;
  modifier: number;
}

// Para Atributos Essenciais (Armadura, Iniciativa, etc.)
export interface EssentialAttributes {
  armor: number;
  initiative: string; // Ou number, dependendo de como você lida com o '+'
  proficiency: string; // Ou number
  speed: string;
}

// Para Perícias
export interface Skill {
  name: string;
  modifier: string; // Ou number
}

export interface CharacterAction {
  id: string; // Identificador único
  name: string; // Nome da ação (ex: "Bola de Fogo", "Ataque de Espada")
  description?: string; // Descrição geral da ação

  // Tipo principal da ação (para diferenciar ataques, magias, etc.)
  mainType: 'attack' | 'spell' | 'utility' | 'ability'; // Renomeado para 'mainType' para clareza

  // Tipo de efeito da ação (para diferenciar dano, cura, buff, debuff, etc.)
  // Essa é a propriedade que você pediu para 'Damage', 'Utility', 'Healing'
  effectCategory: 'damage' | 'utility' | 'healing';

  isFavorite?: boolean; // Para marcar se é favorita

  // --- Propriedades de Ataque (Opcionais) ---
  damageDice?: string; // Ex: "1d8", "2d6" (para ataques e magias de dano)
  damageType?: string; // Ex: "Slashing", "Fire", "Radiant"
  attackRange?: string; // Ex: "30ft", "Melee", "Touch" (para ataques e magias)
  properties?: string[]; // Ex: ['Versátil (1d10)', 'Acuidade'] (para ataques)

  // --- Propriedades de Magia (Opcionais) ---
  range?:string;
  level?: number; // Nível da magia (0 para truques)
  castingTime?: string;
  duration?: string;
  saveDC?: string; // Ex: 'CD de Destreza (Metade do dano)'
  school?: string; // Ex: 'Evocação'
  spellComponents?: { v?: boolean, s?: boolean, m?: string | MaterialComponent }; // Componentes da magia

  // --- Propriedades de Utilidade/Cura (Opcionais) ---
  utilityTitle?: string; // Título para ações de utilidade/cura (ex: "Cura", "Buff", "Debuff")
  utilityValue?: string; // Valor/detalhes para ações de utilidade/cura (ex: "1d6", "+2 CA", "Cegueira")
  healingDice?: string; // Ex: "1d4+2" (específico para cura)
  target?: string; // Quem a ação afeta (ex: "Um aliado", "Área de 15ft")
}



export type HealthAction = 'add' | 'subtract';
interface MaterialComponent {
  text: string;
  consumed?: boolean;
  cost?: number; // ou o tipo apropriado para cost
}
export interface RawSpellData {
    name: string;
    source: string;
    healingDice?: string;
    page: number;
    level: number | string; // Can be 0 (number) or string like "1º" or "Cantrip"
    school: string; // Abbreviation like "I" for Illusion
    time?: Array<{number: number, unit: string}>; // Made optional
    range?: { // Made optional
        type: string;
        distance?: { // Made optional
            amount?: number; // <<-- AQUI ESTÁ A MUDANÇA PRINCIPAL QUE CAUSAVA O ERRO
            type: string;
        };
    };
    components?: {v?: boolean, s?: boolean, m?: string | MaterialComponent}; // Made optional
    duration?: Array<{type: string, duration?: {type: string, amount: number}, concentration?: boolean}>; // Made optional
    entries: Array<string | any>; // Array of description paragraphs, can contain objects
    entriesHigherLevel?: Array<string | any>; // Array for higher level descriptions, made optional
    damage?: string; // Can be undefined
    damageType?: string; // Can be undefined
    save?: Array<{type: string, outcome: string}>; // Can be undefined
    opposedCheck?: string[]; // Can be undefined
    rituals?: string; // "sim" or "não", made optional
    concentracao?: string; // "sim" or "não", made optional
    // Add any other properties from your JSON that might be missing or have different types
    classes?: any; // Added as any, if you don't use it, you can remove it or type it specifically
    races?: any; // Added as any, if you don't use it, you can remove it or type it specifically
    // Sometimes, the JSON might have fields you don't use but are present, so marking them optional or `any` helps.
}
export interface Token {
  id: number; // PADRONIZADO: ID como number
  name: string;
  portraitUrl: string; // URL da imagem do token (avatar)
  currentHp: number; // HP atual do token
  maxHp: number;     // HP máximo do token
  ac: number;        // Classe de Armadura (AC) do token
  damageDealt?: string; // Algum indicador de dano causado por este token, se aplicável
  // Propriedades adicionais para o Grid (MainGrid.tsx)
  x: number; // Coordenada X no grid
  y: number; // Coordenada Y no grid
  image: string; // URL da imagem do token para o canvas (poderia ser portraitUrl, mas mantido para clareza)
  width: number; // Largura do token no grid
  height: number; // Altura do token no grid
}