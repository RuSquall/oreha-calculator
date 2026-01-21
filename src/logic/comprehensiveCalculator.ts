import { MaterialName, CraftableItem, ComprehensiveAnalysisResult, Inventory } from '../types/data';
import { RECIPES, MATERIAL_NAMES } from './constants';
import { calculateMaxCrafts } from './maximizer'; // Re-use maximizer logic
import { getEffectiveCosts } from './utils';

type Prices = Record<MaterialName, number>;

// Helper function for sales fee calculation (5% rounded up per unit)
const calculateUnitSalesFee = (unitPrice: number): number => {
  const fee = unitPrice * 0.05;
  return Math.ceil(fee);
};

export const analyzeComprehensiveProfit = (
  initialInventory: Inventory,
  pricesPer100: Prices,
  craftFeeReduction: number,
  fusionMaterialMarketPricePer1: number,
  targetItemName: CraftableItem
): ComprehensiveAnalysisResult => {

  const effectiveCosts = getEffectiveCosts(pricesPer100);
  const recipe = RECIPES.find(r => r.name === targetItemName);
  if (!recipe) {
    return {
      recommendation: '오류',
      totalValueSellAll: 0,
      totalValueCraftSell: 0,
      totalValueCraftUse: 0,
      maxCraftsPossible: 0,
      craftSellExchangeSteps: [],
      craftUseExchangeSteps: [],
      message: '선택된 제작 아이템을 찾을 수 없습니다.',
    };
  }

  // --- Scenario 1: Sell All Initial Inventory Directly ---
  let totalValueSellAll = 0;
  for (const materialName of MATERIAL_NAMES) {
    const count = initialInventory[materialName] || 0;
    if (count === 0) continue;

    const marketValuePerUnit = (pricesPer100[materialName] || 0) / 100;
    if (marketValuePerUnit === 0) continue; // Cannot sell if market price is 0

    const unitSalesFee = calculateUnitSalesFee(marketValuePerUnit);
    const netValuePerUnit = marketValuePerUnit - unitSalesFee;
    
    totalValueSellAll += netValuePerUnit * count;
  }

  // --- Scenario 2 & 3: Craft Max Items ---
  const maximizerResult = calculateMaxCrafts(initialInventory, targetItemName);
  const maxCrafts = maximizerResult.maxCrafts; // Total single items
  const remainingInventory = maximizerResult.remainingInventory;
  
  // Calculate total base gold fee for maxCrafts
  const baseGoldFeePer10 = recipe.gold;
  const actualCraftingFeePer10 = baseGoldFeePer10 * (1 - (craftFeeReduction / 100));
  const totalActualCraftingFee = (maxCrafts / 10) * actualCraftingFeePer10;

  // Calculate value of selling remaining inventory
  let valueFromSellingRemaining = 0;
  for (const materialName of MATERIAL_NAMES) {
    const count = remainingInventory[materialName] || 0;
    if (count === 0) continue;

    const marketValuePerUnit = (pricesPer100[materialName] || 0) / 100;
    if (marketValuePerUnit === 0) continue;

    const unitSalesFee = calculateUnitSalesFee(marketValuePerUnit);
    const netValuePerUnit = marketValuePerUnit - unitSalesFee;
    
    valueFromSellingRemaining += netValuePerUnit * count;
  }

  // --- Scenario 2: Craft Max Items, Sell Crafted Items, Sell Remaining Inventory ---
  const unitSalesFeeForCrafted = calculateUnitSalesFee(fusionMaterialMarketPricePer1);
  const totalSalesFeeForCrafted = unitSalesFeeForCrafted * maxCrafts;
  const revenueFromSellingCrafted = (fusionMaterialMarketPricePer1 * maxCrafts) - totalSalesFeeForCrafted;
  
  const totalValueCraftSell = revenueFromSellingCrafted - totalActualCraftingFee + valueFromSellingRemaining;

  // --- Scenario 3: Craft Max Items, Use Crafted Items, Sell Remaining Inventory ---
  const marketValueOfCraftedForUse = fusionMaterialMarketPricePer1 * maxCrafts;
  const totalValueCraftUse = marketValueOfCraftedForUse - totalActualCraftingFee + valueFromSellingRemaining;

  // Determine recommendation
  let recommendation = '';
  let bestValue = Math.max(totalValueSellAll, totalValueCraftSell, totalValueCraftUse);

  if (bestValue <= 0) {
    recommendation = '현재는 수익성이 없습니다.';
  } else if (bestValue === totalValueSellAll) {
    recommendation = '모든 재료 직접 판매';
  } else if (bestValue === totalValueCraftSell) {
    recommendation = '최대 제작 후 판매';
  } else { // bestValue === totalValueCraftUse
    recommendation = '최대 제작 후 직접 사용';
  }

  return {
    recommendation: recommendation,
    totalValueSellAll: Math.round(totalValueSellAll),
    totalValueCraftSell: Math.round(totalValueCraftSell),
    totalValueCraftUse: Math.round(totalValueCraftUse),
    maxCraftsPossible: maxCrafts,
    craftSellExchangeSteps: maximizerResult.exchangeSteps,
    craftUseExchangeSteps: maximizerResult.exchangeSteps, // Same steps for both craft scenarios
  };
};
