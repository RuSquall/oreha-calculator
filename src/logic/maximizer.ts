import { MaterialName, CraftableItem, MaximizerResult, ExchangeStepDetail, Inventory } from '../types/data';
import { RECIPES, DISCRETE_EXCHANGES as EX } from './constants';

export const calculateMaxCrafts = (
  initialInventory: Inventory,
  targetItemName: CraftableItem
): MaximizerResult => {
  const recipe = RECIPES.find(r => r.name === targetItemName);
  if (!recipe) throw new Error('Recipe not found');

  // Use recipe for 10 crafts directly to avoid floating point issues
  const recipeFor10 = {
    A: recipe.materials['목재']!,
    B: recipe.materials['부드러운 목재']!,
    C: recipe.materials['아비도스 목재']!,
  };

  // Sanitize inventory: ensure all materials have a numeric value.
  const resources: Inventory = {
    '목재': initialInventory['목재'] || 0,
    '부드러운 목재': initialInventory['부드러운 목재'] || 0,
    '튼튼한 목재': initialInventory['튼튼한 목재'] || 0,
    '아비도스 목재': initialInventory['아비도스 목재'] || 0,
    '벌목의 가루': initialInventory['벌목의 가루'] || 0,
  };
  
  // Pre-computation: Convert all Sturdy Timber (S->A) as it has no other use
  const sturdyEx = EX.FROM_STURDY_TO_TIMBER;
  const sturdyExchangesCount = Math.floor(resources[sturdyEx.from]! / sturdyEx.fromAmount);
  if (sturdyExchangesCount > 0) {
    resources[sturdyEx.from]! -= sturdyExchangesCount * sturdyEx.fromAmount;
    resources[sturdyEx.to]! += sturdyExchangesCount * sturdyEx.toAmount;
  }

  let maxCrafts = 0;
  let bestExchanges: { [key: string]: number } = { StoA: sturdyExchangesCount };
  let finalInventory: Inventory = { ...resources };

  // Loop through B -> A conversions
  const maxBtoA = Math.floor(resources['부드러운 목재']! / EX.FROM_SOFT_TO_TIMBER.fromAmount);
  for (let bToA_count = 0; bToA_count <= maxBtoA; bToA_count++) {
    const res1 = { ...resources };
    res1['부드러운 목재']! -= bToA_count * EX.FROM_SOFT_TO_TIMBER.fromAmount;
    res1['목재']! += bToA_count * EX.FROM_SOFT_TO_TIMBER.toAmount;

    // Stage 1: Calculate crafts possible with current materials before powder conversion
    let stage1_batches = Infinity;
    if (recipeFor10.A > 0) stage1_batches = Math.min(stage1_batches, Math.floor(res1['목재']! / recipeFor10.A));
    if (recipeFor10.B > 0) stage1_batches = Math.min(stage1_batches, Math.floor(res1['부드러운 목재']! / recipeFor10.B));
    if (recipeFor10.C > 0) stage1_batches = Math.min(stage1_batches, Math.floor(res1['아비도스 목재']! / recipeFor10.C));
    if (stage1_batches === Infinity) stage1_batches = 0;

    const remaining = { ...res1 };
    remaining['목재']! -= stage1_batches * recipeFor10.A;
    remaining['부드러운 목재']! -= stage1_batches * recipeFor10.B;
    remaining['아비도스 목재']! -= stage1_batches * recipeFor10.C;

    // Stage 2: Use remaining materials to create powder and then more items
    const maxAtoP = Math.floor(remaining['목재']! / EX.FROM_TIMBER_TO_POWDER.fromAmount);
    const maxBtoP = Math.floor(remaining['부드러운 목재']! / EX.FROM_SOFT_TO_POWDER.fromAmount);

    for (let aToP_count = 0; aToP_count <= maxAtoP; aToP_count++) {
      for (let bToP_count = 0; bToP_count <= maxBtoP; bToP_count++) {
        
        let powderFromA = aToP_count * EX.FROM_TIMBER_TO_POWDER.toAmount;
        let powderFromB = bToP_count * EX.FROM_SOFT_TO_POWDER.toAmount;
        let totalPowder = remaining['벌목의 가루']! + powderFromA + powderFromB;

        let pToC_count = Math.floor(totalPowder / EX.FROM_POWDER_TO_ABIDOS.fromAmount);
        
        let finalA = remaining['목재']! - (aToP_count * EX.FROM_TIMBER_TO_POWDER.fromAmount);
        let finalB = remaining['부드러운 목재']! - (bToP_count * EX.FROM_SOFT_TO_POWDER.fromAmount);
        let finalC = remaining['아비도스 목재']! + (pToC_count * EX.FROM_POWDER_TO_ABIDOS.toAmount);
        let finalP = totalPowder - (pToC_count * EX.FROM_POWDER_TO_ABIDOS.fromAmount);

        let stage2_batches = Infinity;
        if (recipeFor10.A > 0) stage2_batches = Math.min(stage2_batches, Math.floor(finalA / recipeFor10.A));
        if (recipeFor10.B > 0) stage2_batches = Math.min(stage2_batches, Math.floor(finalB / recipeFor10.B));
        if (recipeFor10.C > 0) stage2_batches = Math.min(stage2_batches, Math.floor(finalC / recipeFor10.C));
        if (stage2_batches === Infinity) stage2_batches = 0;

        const total_batches = stage1_batches + stage2_batches;
        const totalCrafts = total_batches * 10;

        if (totalCrafts > maxCrafts) {
          maxCrafts = totalCrafts;
          bestExchanges = {
            StoA: sturdyExchangesCount,
            BtoA: bToA_count,
            AtoP: aToP_count,
            BtoP: bToP_count,
            PtoC: pToC_count,
          };
          
          finalInventory = {
            '목재': finalA - (stage2_batches * recipeFor10.A),
            '부드러운 목재': finalB - (stage2_batches * recipeFor10.B),
            '아비도스 목재': finalC - (stage2_batches * recipeFor10.C),
            '벌목의 가루': finalP,
            '튼튼한 목재': (initialInventory['튼튼한 목재'] || 0) - (sturdyExchangesCount * sturdyEx.fromAmount),
          }
        }
      }
    }
  }
  
  const finalSteps: ExchangeStepDetail[] = [];
  const exchangeMap: { [key: string]: { ex: any, from: MaterialName, to: MaterialName } } = {
    'StoA': { ex: EX.FROM_STURDY_TO_TIMBER, from: '튼튼한 목재', to: '목재' },
    'BtoA': { ex: EX.FROM_SOFT_TO_TIMBER, from: '부드러운 목재', to: '목재' },
    'AtoP': { ex: EX.FROM_TIMBER_TO_POWDER, from: '목재', to: '벌목의 가루' },
    'BtoP': { ex: EX.FROM_SOFT_TO_POWDER, from: '부드러운 목재', to: '벌목의 가루' },
    'PtoC': { ex: EX.FROM_POWDER_TO_ABIDOS, from: '벌목의 가루', to: '아비도스 목재' },
  };

  for (const key in bestExchanges) {
    const count = bestExchanges[key];
    if (count > 0) {
      const mapInfo = exchangeMap[key];
      finalSteps.push({
        fromMaterial: mapInfo.from,
        fromAmount: mapInfo.ex.fromAmount,
        toMaterial: mapInfo.to,
        toAmount: mapInfo.ex.toAmount,
        count: count,
      });
    }
  }

  return {
    maxCrafts: maxCrafts,
    exchangeSteps: finalSteps,
    remainingInventory: finalInventory,
  };
};



