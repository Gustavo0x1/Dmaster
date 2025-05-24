// src/utils/diceRoller.ts

/**
 * Rola um dado ou uma série de dados e retorna o resultado.
 * Suporta formatos como "1d20", "2d6", "1d8+3", "2d4-1".
 *
 * @param diceString A string representando os dados a serem rolados (ex: "1d20+5").
 * @returns O resultado total da rolagem.
 */
export const rollDice = (diceString: string): number => {
  const parts = diceString.match(/(\d*)d(\d+)([+-]\d+)?/);
  if (!parts) {
    console.warn(`Formato de dado inválido: ${diceString}`);
    return 0;
  }

  const numDice = parseInt(parts[1] || '1', 10); // Número de dados (padrão: 1)
  const dieType = parseInt(parts[2], 10);      // Tipo de dado (d4, d6, d20, etc.)
  const modifier = parseInt(parts[3] || '0', 10); // Modificador (+3, -1, etc.)

  let totalRoll = 0;
  for (let i = 0; i < numDice; i++) {
    totalRoll += Math.floor(Math.random() * dieType) + 1;
  }

  return totalRoll + modifier;
};

/**
 * Rola um dado d20 com vantagem ou desvantagem.
 * @param type 'normal' | 'advantage' | 'disadvantage'
 * @returns O resultado da rolagem (apenas o valor do d20, sem modificadores).
 */
export const rollD20 = (type: 'normal' | 'advantage' | 'disadvantage' = 'normal'): { roll1: number, roll2?: number, result: number } => {
  const roll1 = Math.floor(Math.random() * 20) + 1;
  let roll2: number | undefined;
  let result = roll1;

  if (type === 'advantage') {
    roll2 = Math.floor(Math.random() * 20) + 1;
    result = Math.max(roll1, roll2);
  } else if (type === 'disadvantage') {
    roll2 = Math.floor(Math.random() * 20) + 1;
    result = Math.min(roll1, roll2);
  }

  return { roll1, roll2, result };
};

/**
 * Formata um resultado de rolagem de dados para exibição.
 * @param rollResult O resultado da rolagem.
 * @param diceString A string de dados original.
 * @param rollType O tipo de rolagem (ataque, dano, etc.).
 * @param target O nome do alvo (opcional).
 * @param extraInfo Informações adicionais para a mensagem (ex: "com vantagem").
 * @returns Uma string formatada.
 */
export const formatRollResult = (rollResult: number, diceString: string, rollType: string, target?: string, extraInfo?: string): string => {
  const targetText = target ? ` em ${target}` : '';
  const extraText = extraInfo ? ` (${extraInfo})` : '';
  return `${rollType} de ${diceString}${targetText}${extraText}: ${rollResult}`;
};