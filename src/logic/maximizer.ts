import { CraftableItem, MaximizerResult, Inventory } from '../types/data';

/**
 * Netlify Function(calculateMax)을 호출하여 ILP 솔버 기반의 최대 생산량을 계산합니다.
 * 기존의 브루트포스 방식을 대체하여 더 정확하고 빠른 최적해를 제공합니다.
 */
export const calculateMaxCrafts = async (
  initialInventory: Inventory,
  targetItemName: CraftableItem
): Promise<MaximizerResult> => {
  try {
    const response = await fetch('/.netlify/functions/calculateMax', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inventory: initialInventory,
        targetItemName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`서버 응답 오류 (${response.status}): ${errorText}`);
    }

    const result: MaximizerResult = await response.json();
    return result;
  } catch (error) {
    console.error('최대 생산량 계산 API 호출 중 오류 발생:', error);
    
    // API 호출 실패 시 사용자 경험을 위해 기본값(0개) 반환
    return {
      maxCrafts: 0,
      exchangeSteps: [],
      remainingInventory: initialInventory,
    };
  }
};
