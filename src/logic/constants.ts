import { Recipe, MaterialName } from '../types/data';

export interface ExchangeRecipe {
  from: MaterialName;
  fromAmount: number;
  to: MaterialName;
  toAmount: number;
}

export const RECIPES: Recipe[] = [
  {
    name: '상급 아비도스 융화재료',
    gold: 520,
    materials: {
      '아비도스 목재': 43,
      '부드러운 목재': 59,
      '목재': 112,
    },
  },
  {
    name: '아비도스 융화재료',
    gold: 400,
    materials: {
      '아비도스 목재': 33,
      '부드러운 목재': 45,
      '목재': 86,
    },
  },
];

export const MATERIAL_NAMES: MaterialName[] = [
  '아비도스 목재',
  '부드러운 목재',
  '목재',
  '튼튼한 목재',
  '벌목의 가루',
];

export const PURCHASABLE_MATERIALS: MaterialName[] = [
  '아비도스 목재',
  '부드러운 목재',
  '목재',
  '튼튼한 목재',
];

export const DISCRETE_EXCHANGES: Record<string, ExchangeRecipe> = {
  FROM_TIMBER_TO_POWDER: { from: '목재', fromAmount: 100, to: '벌목의 가루', toAmount: 80 },
  FROM_SOFT_TO_POWDER: { from: '부드러운 목재', fromAmount: 50, to: '벌목의 가루', toAmount: 80 },
  FROM_POWDER_TO_SOFT: { from: '벌목의 가루', fromAmount: 100, to: '부드러운 목재', toAmount: 50 },
  FROM_POWDER_TO_ABIDOS: { from: '벌목의 가루', fromAmount: 100, to: '아비도스 목재', toAmount: 10 },
  FROM_SOFT_TO_TIMBER: { from: '부드러운 목재', fromAmount: 25, to: '목재', toAmount: 50 },
  FROM_STURDY_TO_TIMBER: { from: '튼튼한 목재', fromAmount: 5, to: '목재', toAmount: 50 },
};
