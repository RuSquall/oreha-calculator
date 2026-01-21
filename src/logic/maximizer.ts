import { MaterialName, CraftableItem, MaximizerResult } from '../types/data';
import { RECIPES, DISCRETE_EXCHANGES as EX } from './constants';

type Inventory = Record<MaterialName, number>;

export const calculateMaxCrafts = (
  initialInventory: Inventory,
  targetItemName: CraftableItem
): MaximizerResult => {
  const recipe = RECIPES.find(r => r.name === targetItemName);
  if (!recipe) throw new Error('Recipe not found');

  const oRecipe = {
    A: recipe.materials['목재']! / 10,
    B: recipe.materials['부드러운 목재']! / 10,
    C: recipe.materials['아비도스 목재']! / 10,
  };

  let resources: Inventory = { ...initialInventory };
  let initialExchanges: { [key: string]: number } = {};

  // Pre-computation: Convert all Sturdy Timber
  const sturdyEx = EX.FROM_STURDY_TO_TIMBER;
  const sturdyExchangesCount = Math.floor(resources[sturdyEx.from] / sturdyEx.fromAmount);
  if (sturdyExchangesCount > 0) {
    resources[sturdyEx.from] -= sturdyExchangesCount * sturdyEx.fromAmount;
    resources[sturdyEx.to] += sturdyExchangesCount * sturdyEx.toAmount;
    initialExchanges['StoA'] = sturdyExchangesCount;
  }

  let maxCrafts = 0;
  let bestExchanges: { [key: string]: number } = { ...initialExchanges };
  let finalInventory = { ...resources };

  const maxBtoA = Math.floor(resources['부드러운 목재'] / EX.FROM_SOFT_TO_TIMBER.fromAmount);

  for (let bToA_count = 0; bToA_count <= maxBtoA; bToA_count++) {
    let res1 = { ...resources };
    res1['부드러운 목재'] -= bToA_count * EX.FROM_SOFT_TO_TIMBER.fromAmount;
    res1['목재'] += bToA_count * EX.FROM_SOFT_TO_TIMBER.toAmount;

    // Stage 1 Crafts
    let stage1Crafts = Infinity;
    if (oRecipe.A > 0) stage1Crafts = Math.min(stage1Crafts, Math.floor(res1['목재'] / oRecipe.A));
    if (oRecipe.B > 0) stage1Crafts = Math.min(stage1Crafts, Math.floor(res1['부드러운 목재'] / oRecipe.B));
    if (oRecipe.C > 0) stage1Crafts = Math.min(stage1Crafts, Math.floor(res1['아비도스 목재'] / oRecipe.C));
    if (stage1Crafts === Infinity) stage1Crafts = 0;
    stage1Crafts = Math.floor(stage1Crafts / 10) * 10; // Ensure it's a multiple of 10

    const remaining = { ...res1 };
    remaining['목재'] -= stage1Crafts * oRecipe.A;
    remaining['부드러운 목재'] -= stage1Crafts * oRecipe.B;
    remaining['아비도스 목재'] -= stage1Crafts * oRecipe.C;

    const maxAtoP = Math.floor(remaining['목재'] / EX.FROM_TIMBER_TO_POWDER.fromAmount);
    for (let aToP_count = 0; aToP_count <= maxAtoP; aToP_count++) {
      const maxBtoP = Math.floor(remaining['부드러운 목재'] / EX.FROM_SOFT_TO_POWDER.fromAmount);
      for (let bToP_count = 0; bToP_count <= maxBtoP; bToP_count++) {
        
        let currentP = remaining['벌목의 가루'] 
            + (aToP_count * EX.FROM_TIMBER_TO_POWDER.toAmount)
            + (bToP_count * EX.FROM_SOFT_TO_POWDER.toAmount);
        
        const pToC_count = Math.floor(currentP / EX.FROM_POWDER_TO_ABIDOS.fromAmount);
        
        let currentA = remaining['목재'] - (aToP_count * EX.FROM_TIMBER_TO_POWDER.fromAmount);
        let currentB = remaining['부드러운 목재'] - (bToP_count * EX.FROM_SOFT_TO_POWDER.fromAmount);
        let currentC = remaining['아비도스 목재'] + (pToC_count * EX.FROM_POWDER_TO_ABIDOS.toAmount);
        
        let stage2Crafts = Infinity;
        if (oRecipe.A > 0) stage2Crafts = Math.min(stage2Crafts, Math.floor(currentA / oRecipe.A));
        if (oRecipe.B > 0) stage2Crafts = Math.min(stage2Crafts, Math.floor(currentB / oRecipe.B));
        if (oRecipe.C > 0) stage2Crafts = Math.min(stage2Crafts, Math.floor(currentC / oRecipe.C));
        if (stage2Crafts === Infinity) stage2Crafts = 0;
        stage2Crafts = Math.floor(stage2Crafts / 10) * 10; // Ensure it's a multiple of 10

        const totalCrafts = stage1Crafts + stage2Crafts;

        if (totalCrafts > maxCrafts) {
          maxCrafts = totalCrafts;
          bestExchanges = {
            ...initialExchanges,
            BtoA: bToA_count,
            AtoP: aToP_count,
            BtoP: bToP_count,
            PtoC: pToC_count,
          };
          
          // Recalculate final inventory for the best case
          const finalP = currentP - (pToC_count * EX.FROM_POWDER_TO_ABIDOS.fromAmount);
          finalInventory = {
             '아비도스 목재': currentC - stage2Crafts * oRecipe.C,
             '부드러운 목재': currentB - stage2Crafts * oRecipe.B,
             '목재': currentA - stage2Crafts * oRecipe.A,
             '튼튼한 목재': remaining['튼튼한 목재'],
             '벌목의 가루': finalP,
          };
        }
      }
    }
  }
  
  const transformationMap: {[key: string]: string} = {
    StoA: `${EX.FROM_STURDY_TO_TIMBER.fromAmount} ${EX.FROM_STURDY_TO_TIMBER.from} -> ${EX.FROM_STURDY_TO_TIMBER.toAmount} ${EX.FROM_STURDY_TO_TIMBER.to}`,
    BtoA: `${EX.FROM_SOFT_TO_TIMBER.fromAmount} ${EX.FROM_SOFT_TO_TIMBER.from} -> ${EX.FROM_SOFT_TO_TIMBER.toAmount} ${EX.FROM_SOFT_TO_TIMBER.to}`,
    AtoP: `${EX.FROM_TIMBER_TO_POWDER.fromAmount} ${EX.FROM_TIMBER_TO_POWDER.from} -> ${EX.FROM_TIMBER_TO_POWDER.toAmount} ${EX.FROM_TIMBER_TO_POWDER.to}`,
    BtoP: `${EX.FROM_SOFT_TO_POWDER.fromAmount} ${EX.FROM_SOFT_TO_POWDER.from} -> ${EX.FROM_SOFT_TO_POWDER.toAmount} ${EX.FROM_SOFT_TO_POWDER.to}`,
    PtoC: `${EX.FROM_POWDER_TO_ABIDOS.fromAmount} ${EX.FROM_POWDER_TO_ABIDOS.from} -> ${EX.FROM_POWDER_TO_ABIDOS.toAmount} ${EX.FROM_POWDER_TO_ABIDOS.to}`,
  };

  const finalSteps = Object.entries(bestExchanges)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => `${transformationMap[key]} (x${value}회)`);

  return {
    maxCrafts: maxCrafts,
    exchangeSteps: finalSteps,
    remainingInventory: finalInventory,
  };
};


