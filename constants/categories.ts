/**
 * Mapa kategorii do kolorów neonowych
 * Używana do losowania kategorii podczas gry i stylizacji
 */

export const CATEGORIES_MAP = {
  MATH: "DAMAGE",
  TRAVEL: "DAMAGE",
  ENGLISH: "DAMAGE",
  MEDICINE: "HEAL",
  NATURE: "HEAL",
  MOVIES: "HEAL",
  CHEMISTRY: "POISON",
  BOOKS: "POISON",
  SPACE: "POISON",
  RELIGION: "HIDE",
  MUSIC: "HIDE",
  CULINARY: "HIDE",
  GAMES: "50/50",
  HISTORY: "50/50",
  FLAGS: "50/50",
  COUNTRIES: "TIME",
  IT: "TIME",
  USELESS: "TIME",
} as const;

export const CATEGORY_NAMES = Object.keys(CATEGORIES_MAP) as string[];

/**
 * Zwraca typ karty dla danej kategorii
 * @param category Nazwa kategorii
 * @returns Typ karty (DAMAGE, HEAL, POISON, HIDE, 50/50, TIME)
 */
export const getCategoryCardType = (category: string): string => {
  return CATEGORIES_MAP[category as keyof typeof CATEGORIES_MAP] || "#FFFFFF";
};
