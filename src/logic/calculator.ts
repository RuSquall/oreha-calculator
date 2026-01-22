import { MaterialName, CraftableItem, ProfitAnalysisResult, MaterialCostDetail } from '../types/data';
import { RECIPES } from './constants';
import { getEffectiveCosts } from './utils';

type Prices = Record<MaterialName, number>;

// Helper function for sales fee calculation (5% rounded up per unit)
const calculateUnitSalesFee = (unitPrice: number): number => {
  const fee = unitPrice * 0.05;
  return Math.ceil(fee);
};

export const analyzeCraftingProfit = (
  pricesPer100: Prices,
  craftFeeReduction: number,
  fusionMaterialMarketPricePer1: number,
  targetItemName: CraftableItem
): ProfitAnalysisResult => {
  
  const effectiveCosts = getEffectiveCosts(pricesPer100);

  const recipe = RECIPES.find(r => r.name === targetItemName);
  if (!recipe) {
    return {
      recommendation: '오류',
      profitFromCraftAndSell: 0,
      profitFromCraftAndUse: 0,
      valueFromSellingMaterials: 0,
      totalCraftingCost: 0,
      materialCostBreakdown: [],
      message: '선택된 제작 아이템을 찾을 수 없습니다.',
    };
  }

  let materialCostFor10Crafts = 0;
  let allMaterialPricesKnown = true;
  const materialBreakdown: MaterialCostDetail[] = [];

  for (const material in recipe.materials) {
    const requiredMaterialName = material as MaterialName;
    const requiredAmount = recipe.materials[requiredMaterialName]!;
    const unitCost = effectiveCosts[requiredMaterialName].price;
    const totalCost = unitCost * requiredAmount;
    
    if(unitCost === Infinity) {
      allMaterialPricesKnown = false;
      break;
    }
    materialCostFor10Crafts += totalCost;
    materialBreakdown.push({
      name: requiredMaterialName,
      requiredAmount: requiredAmount,
      unitCost: unitCost,
      totalCost: totalCost,
      source: effectiveCosts[requiredMaterialName].source,
    });
  }

  if (!allMaterialPricesKnown || fusionMaterialMarketPricePer1 <= 0) {
    return {
      recommendation: '오류',
      profitFromCraftAndSell: 0,
      profitFromCraftAndUse: 0,
      valueFromSellingMaterials: 0,
      totalCraftingCost: 0,
      materialCostBreakdown: [],
      message: '모든 재료의 가격과 융화재료 시장 가격을 입력해야 분석할 수 있습니다.',
    };
  }

  const baseGoldFee = recipe.gold;
  const actualCraftingFee = baseGoldFee * (1 - (craftFeeReduction / 100));
  const totalCraftingCost = materialCostFor10Crafts + actualCraftingFee;
  const fusionMaterialPriceFor10 = fusionMaterialMarketPricePer1 * 10;

  // Value from selling materials (for reference)
  let totalSalesFeeForMaterials = 0;
  for (const material in recipe.materials) {
    const requiredMaterialName = material as MaterialName;
    const requiredAmount = recipe.materials[requiredMaterialName]!;
    const marketValuePerUnit = effectiveCosts[requiredMaterialName].price;
    totalSalesFeeForMaterials += calculateUnitSalesFee(marketValuePerUnit) * requiredAmount;
  }
  const valueFromSellingMaterials = materialCostFor10Crafts - totalSalesFeeForMaterials;

  // Profit from crafting and selling
  const unitSalesFeeForCrafted = calculateUnitSalesFee(fusionMaterialMarketPricePer1);
  const totalSalesFeeForCrafted = unitSalesFeeForCrafted * 10;
  const revenueFromSellingCrafted = fusionMaterialPriceFor10 - totalSalesFeeForCrafted;
  const profitFromCraftAndSell = revenueFromSellingCrafted - totalCraftingCost;

  // Savings from crafting and using
  const profitFromCraftAndUse = fusionMaterialPriceFor10 - totalCraftingCost;

  // NEW RECOMMENDATION LOGIC
  let recommendation = '';
  if (profitFromCraftAndSell < 0 && profitFromCraftAndUse < 0) {
    recommendation = '제작 비추천';
  } else if (profitFromCraftAndSell > profitFromCraftAndUse) {
    recommendation = '제작 후 판매';
  } else {
    recommendation = '제작 후 사용';
  }

  return {
    recommendation: recommendation,
    profitFromCraftAndSell: Math.round(profitFromCraftAndSell),
    profitFromCraftAndUse: Math.round(profitFromCraftAndUse),
    valueFromSellingMaterials: Math.round(valueFromSellingMaterials),
    totalCraftingCost: Math.round(totalCraftingCost),
    materialCostBreakdown: materialBreakdown.map(item => ({
      ...item,
      unitCost: Math.round(item.unitCost * 100) / 100,
      totalCost: Math.round(item.totalCost),
    })),
  };
};


