import { MaterialName, CraftableItem, MaximizerResult, ExchangeStepDetail } from '../types/data';
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

    // --- START: New optimized calculation logic with Binary Search ---
    let stage2Crafts = 0;
    let low = 0;
    // Set a reasonable upper bound for crafts to prevent infinite loops
    let high = Math.floor(res1['목재'] / oRecipe.A + res1['아비도스 목재'] / oRecipe.C) + 1000;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (mid === 0) {
        low = mid + 1;
        continue;
      }

      const crafts_to_check = mid;
      const neededA = crafts_to_check * oRecipe.A;
      const neededB = crafts_to_check * oRecipe.B;
      const neededC = crafts_to_check * oRecipe.C;

      // Check if we have enough B material, as it cannot be created.
      if (res1['부드러운 목재'] < neededB) {
        high = mid - 1;
        continue;
      }

      const deficitC = Math.max(0, neededC - remaining['아비도스 목재']);
      const pToC_needed_count = Math.ceil(deficitC / EX.FROM_POWDER_TO_ABIDOS.toAmount);
      const powderForC = pToC_needed_count * EX.FROM_POWDER_TO_ABIDOS.fromAmount;
      const powderDeficit = Math.max(0, powderForC - remaining['벌목의 가루']);

      const timberForCrafts = neededA;

      const availableA_for_powder = res1['목재'] - timberForCrafts;

      if (availableA_for_powder < 0) {
          high = mid - 1;
          continue;
      }

      // Prioritize converting Soft Wood to Powder as it's more efficient, but we assume it's more valuable.
      // Let's use Timber first.
      const powderFromA = Math.floor(availableA_for_powder / EX.FROM_TIMBER_TO_POWDER.fromAmount) * EX.FROM_TIMBER_TO_POWDER.toAmount;
      const powderFromB = Math.floor((res1['부드러운 목재'] - neededB) / EX.FROM_SOFT_TO_POWDER.fromAmount) * EX.FROM_SOFT_TO_POWDER.toAmount;

      if (powderDeficit <= powderFromA + powderFromB) {
        stage2Crafts = crafts_to_check;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    stage2Crafts = Math.floor(stage2Crafts / 10) * 10;

    const totalCrafts = stage1Crafts + stage2Crafts;

    if (totalCrafts > maxCrafts) {
      maxCrafts = totalCrafts;

      // Recalculate the exchange counts for the best case
      const neededC = stage2Crafts * oRecipe.C;
      const deficitC = Math.max(0, neededC - remaining['아비도스 목재']);
      const pToC_count = Math.ceil(deficitC / EX.FROM_POWDER_TO_ABIDOS.toAmount);
      const powderForC = pToC_count * EX.FROM_POWDER_TO_ABIDOS.fromAmount;
      let powderDeficit = Math.max(0, powderForC - remaining['벌목의 가루']);

      const neededA = stage2Crafts * oRecipe.A;
      const availableA_for_powder = res1['목재'] - neededA;
      const powderFromA = Math.floor(Math.max(0, availableA_for_powder) / EX.FROM_TIMBER_TO_POWDER.fromAmount);
      const aToP_to_use = Math.ceil(Math.min(powderDeficit, powderFromA * EX.FROM_TIMBER_TO_POWDER.toAmount) / EX.FROM_TIMBER_TO_POWDER.toAmount);
      let aToP_count = aToP_to_use > 0 ? aToP_to_use : 0;
      powderDeficit -= aToP_count * EX.FROM_TIMBER_TO_POWDER.toAmount;
      
      const neededB = stage2Crafts * oRecipe.B;
      const availableB_for_powder = res1['부드러운 목재'] - neededB;
      const bToP_to_use = Math.ceil(Math.max(0, powderDeficit) / EX.FROM_SOFT_TO_POWDER.toAmount);
      let bToP_count = bToP_to_use > 0 ? bToP_to_use : 0;

      bestExchanges = {
        ...initialExchanges,
        BtoA: bToA_count,
        AtoP: aToP_count,
        BtoP: bToP_count,
        PtoC: pToC_count,
      };
      
      const currentP = remaining['벌목의 가루'] + aToP_count * EX.FROM_TIMBER_TO_POWDER.toAmount + bToP_count * EX.FROM_SOFT_TO_POWDER.toAmount;
      const finalP = currentP - pToC_count * EX.FROM_POWDER_TO_ABIDOS.fromAmount;
      finalInventory = {
         '아비도스 목재': remaining['아비도스 목재'] + pToC_count * EX.FROM_POWDER_TO_ABIDOS.toAmount - stage2Crafts * oRecipe.C,
         '부드러운 목재': remaining['부드러운 목재'] - bToP_count * EX.FROM_SOFT_TO_POWDER.fromAmount - stage2Crafts * oRecipe.B,
         '목재': remaining['목재'] - aToP_count * EX.FROM_TIMBER_TO_POWDER.fromAmount - stage2Crafts * oRecipe.A,
         '튼튼한 목재': resources['튼튼한 목재'],
         '벌목의 가루': finalP,
      };
    }
  }
  
  const finalSteps: ExchangeStepDetail[] = [];

  // StoA (Sturdy to Timber)
  if (bestExchanges['StoA'] > 0) {
    finalSteps.push({
      fromMaterial: EX.FROM_STURDY_TO_TIMBER.from,
      fromAmount: EX.FROM_STURDY_TO_TIMBER.fromAmount,
      toMaterial: EX.FROM_STURDY_TO_TIMBER.to,
      toAmount: EX.FROM_STURDY_TO_TIMBER.toAmount,
      count: bestExchanges['StoA'],
    });
  }

  // BtoA (Soft to Timber)
  if (bestExchanges['BtoA'] > 0) {
    finalSteps.push({
      fromMaterial: EX.FROM_SOFT_TO_TIMBER.from,
      fromAmount: EX.FROM_SOFT_TO_TIMBER.fromAmount,
      toMaterial: EX.FROM_SOFT_TO_TIMBER.to,
      toAmount: EX.FROM_SOFT_TO_TIMBER.toAmount,
      count: bestExchanges['BtoA'],
    });
  }

  // AtoP (Timber to Powder)
  if (bestExchanges['AtoP'] > 0) {
    finalSteps.push({
      fromMaterial: EX.FROM_TIMBER_TO_POWDER.from,
      fromAmount: EX.FROM_TIMBER_TO_POWDER.fromAmount,
      toMaterial: EX.FROM_TIMBER_TO_POWDER.to,
      toAmount: EX.FROM_TIMBER_TO_POWDER.toAmount,
      count: bestExchanges['AtoP'],
    });
  }

  // BtoP (Soft to Powder)
  if (bestExchanges['BtoP'] > 0) {
    finalSteps.push({
      fromMaterial: EX.FROM_SOFT_TO_POWDER.from,
      fromAmount: EX.FROM_SOFT_TO_POWDER.fromAmount,
      toMaterial: EX.FROM_SOFT_TO_POWDER.to,
      toAmount: EX.FROM_SOFT_TO_POWDER.toAmount,
      count: bestExchanges['BtoP'],
    });
  }

  // PtoC (Powder to Abidos)
  if (bestExchanges['PtoC'] > 0) {
    finalSteps.push({
      fromMaterial: EX.FROM_POWDER_TO_ABIDOS.from,
      fromAmount: EX.FROM_POWDER_TO_ABIDOS.fromAmount,
      toMaterial: EX.FROM_POWDER_TO_ABIDOS.to,
      toAmount: EX.FROM_POWDER_TO_ABIDOS.toAmount,
      count: bestExchanges['PtoC'],
    });
  }

  return {
    maxCrafts: maxCrafts,
    exchangeSteps: finalSteps,
    remainingInventory: finalInventory,
  };
};


