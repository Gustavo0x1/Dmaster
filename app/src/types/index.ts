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
export interface AttackAction {
  id: string;
  name: string;
  type: 'attack';
  damage: string;
  range: string;
  properties: string[];
  effectType: 'damage' | 'utility';
  utilityTitle?: string;
  utilityValue?: string;
  isFavorite?: boolean; // NOVO
}
export interface SpellAction {
  id: string;
  name: string;
  type: 'spell';
  level: number;
  castingTime: string;
  range: string;
  duration: string;
  description: string;
  damage?: string; // Ex: '8d6 Fogo'
  saveDC?: string; // Ex: 'CD de Destreza (Metade do dano)'
  school?: string;
  effectType: 'damage' | 'utility';
  utilityTitle?: string;
  utilityValue?: string;
    isFavorite?: boolean; // NOVO
}

export type CombatAction = AttackAction | SpellAction;

export type TargetType = 'single' | 'multiple';


// Para a ação de ajuste de vida (adicionar/subtrair)
export type HealthAction = 'add' | 'subtract';
interface MaterialComponent {
  text: string;
  consumed?: boolean;
  cost?: number; // ou o tipo apropriado para cost
}
export interface RawSpellData {
    name: string;
    source: string;
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