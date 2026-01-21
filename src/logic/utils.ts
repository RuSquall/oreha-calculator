import { MaterialName } from '../types/data';
import { MATERIAL_NAMES, DISCRETE_EXCHANGES } from './constants';

type Prices = Record<MaterialName, number>;
export type EffectiveCosts = Record<MaterialName, { price: number; source: string }>;

export const getEffectiveCosts = (pricesPer100: Prices): EffectiveCosts => {
  const effectiveCosts: EffectiveCosts = {} as EffectiveCosts;

  for (const materialName of MATERIAL_NAMES) {
    if (materialName === '벌목의 가루') {
      effectiveCosts[materialName] = { price: Infinity, source: '교환으로만 획득' };
    } else {
      const price = (pricesPer100[materialName] || 0) > 0 ? (pricesPer100[materialName] / 100) : Infinity;
      effectiveCosts[materialName] = { price: price, source: '직접 구매' };
    }
  }

  for (let i = 0; i < 50; i++) {
    Object.values(DISCRETE_EXCHANGES).forEach(ex => {
      const sourceCost = effectiveCosts[ex.from].price;
      if (sourceCost === Infinity) return;

      const costOfOneBatch = sourceCost * ex.fromAmount;
      const pricePerUnitFromExchange = costOfOneBatch / ex.toAmount;
      
      if (pricePerUnitFromExchange < effectiveCosts[ex.to].price) {
        effectiveCosts[ex.to].price = pricePerUnitFromExchange;
        effectiveCosts[ex.to].source = `${ex.from}(으)로부터 교환`;
      }
    });
  }
  return effectiveCosts;
};
