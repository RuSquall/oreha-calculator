export interface Material {
  name: string;
  price: number;
}

export type MaterialName = 
  | '아비도스 목재'
  | '부드러운 목재'
  | '목재'
  | '튼튼한 목재'
  | '벌목의 가루';

export type CraftableItem = '아비도스 융화 재료' | '상급 아비도스 융화 재료';

export interface Recipe {
  name: CraftableItem;
  gold: number;
  materials: {
    [key in MaterialName]?: number;
  };
}

export interface CalculationResult {
  totalCost: number;
  steps: {
    [key: string]: string;
  };
}

export interface ExchangeStepDetail {
  fromMaterial: MaterialName;
  fromAmount: number;
  toMaterial: MaterialName;
  toAmount: number;
  count: number; // Number of times this specific exchange was performed
}

export interface MaximizerResult {
  maxCrafts: number;
  exchangeSteps: ExchangeStepDetail[]; // Changed to structured detail
  remainingInventory: Record<MaterialName, number>;
}

export interface MaterialCostDetail {
  name: MaterialName;
  requiredAmount: number;
  unitCost: number;
  totalCost: number;
  source: string;
}

export interface ProfitAnalysisResult {
  recommendation: string;
  profitFromCraftAndSell: number;
  profitFromCraftAndUse: number;
  valueFromSellingMaterials: number;
  totalCraftingCost: number;
  message?: string;
  materialCostBreakdown: MaterialCostDetail[];
}

export interface ComprehensiveAnalysisResult {
  recommendation: string;
  totalValueSellAll: number;
  totalValueCraftSell: number;
  totalValueCraftUse: number;
  maxCraftsPossible: number;
  craftSellExchangeSteps: ExchangeStepDetail[];
  craftUseExchangeSteps: ExchangeStepDetail[];
  message?: string;
}

export type Inventory = Record<MaterialName, number>;
