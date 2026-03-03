import { Handler } from '@netlify/functions';
// @ts-ignore
import solver from 'javascript-lp-solver';

interface Inventory {
  '아비도스 목재': number;
  '부드러운 목재': number;
  '목재': number;
  '튼튼한 목재': number;
  '벌목의 가루': number;
}

interface RequestBody {
  inventory: Inventory;
  targetItemName: '아비도스 융화 재료' | '상급 아비도스 융화 재료';
}

const RECIPES = {
  '상급 아비도스 융화 재료': { A: 112, B: 59, C: 43 },
  '아비도스 융화 재료': { A: 86, B: 45, C: 33 },
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}') as RequestBody;
    const { inventory, targetItemName } = body;
    
    console.log(`[ILP-JS] Request for ${targetItemName}`, inventory);

    const recipe = RECIPES[targetItemName];
    if (!recipe) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid target item' }) };
    }

    const inv = {
      A: Math.max(0, inventory['목재'] || 0),
      B: Math.max(0, inventory['부드러운 목재'] || 0),
      C: Math.max(0, inventory['아비도스 목재'] || 0),
      S: Math.max(0, inventory['튼튼한 목재'] || 0),
      P: Math.max(0, inventory['벌목의 가루'] || 0),
    };

    /**
     * javascript-lp-solver 모델 정의
     * 목적: x (제작 횟수) 최대화
     * 제약 조건: 각 재료의 소모량이 초기 보유량을 넘지 않아야 함
     */
    const model = {
      optimize: "x",
      opType: "max",
      constraints: {
        timber: { max: inv.A },
        soft_timber: { max: inv.B },
        abidos_timber: { max: inv.C },
        sturdy_timber: { max: inv.S },
        powder: { max: inv.P }
      },
      variables: {
        // x: 제작 횟수 (10개 단위)
        x: { 
          timber: recipe.A, 
          soft_timber: recipe.B, 
          abidos_timber: recipe.C,
          x: 1 
        },
        // e_TP: 목재 -> 가루 (100 -> 80)
        e_TP: { timber: 100, powder: -80 },
        // e_SP: 부드러운 목재 -> 가루 (50 -> 80)
        e_SP: { soft_timber: 50, powder: -80 },
        // e_PS: 가루 -> 부드러운 목재 (100 -> 50)
        e_PS: { powder: 100, soft_timber: -50 },
        // e_PA: 가루 -> 아비도스 목재 (100 -> 10)
        e_PA: { powder: 100, abidos_timber: -10 },
        // e_ST: 부드러운 목재 -> 목재 (25 -> 50)
        e_ST: { soft_timber: 25, timber: -50 },
        // e_UT: 튼튼한 목재 -> 목재 (5 -> 50)
        e_UT: { sturdy_timber: 5, timber: -50 }
      },
      // 모든 변수를 정수(Integer)로 제한하여 ILP 수행
      ints: { x: 1, e_TP: 1, e_SP: 1, e_PS: 1, e_PA: 1, e_ST: 1, e_UT: 1 }
    };

    // 정밀도를 높여서 최적해를 더 정확하게 찾도록 합니다.
    const result = solver.Solve(model, 1e-9);
    console.log(`[ILP-JS] Solver result status: feasible=${result.feasible}`);

    if (!result.feasible) {
      console.warn('[ILP-JS] No feasible solution found');
      return {
        statusCode: 200,
        body: JSON.stringify({ maxCrafts: 0, exchangeSteps: [], remainingInventory: inventory }),
      };
    }

    const x = Math.max(0, Math.floor(result.x || 0));
    const e_TP = Math.max(0, Math.floor(result.e_TP || 0));
    const e_SP = Math.max(0, Math.floor(result.e_SP || 0));
    const e_PS = Math.max(0, Math.floor(result.e_PS || 0));
    const e_PA = Math.max(0, Math.floor(result.e_PA || 0));
    const e_ST = Math.max(0, Math.floor(result.e_ST || 0));
    const e_UT = Math.max(0, Math.floor(result.e_UT || 0));

    const exchangeSteps = [];
    if (e_UT > 0) exchangeSteps.push({ fromMaterial: '튼튼한 목재', fromAmount: 5, toMaterial: '목재', toAmount: 50, count: e_UT });
    if (e_ST > 0) exchangeSteps.push({ fromMaterial: '부드러운 목재', fromAmount: 25, toMaterial: '목재', toAmount: 50, count: e_ST });
    if (e_TP > 0) exchangeSteps.push({ fromMaterial: '목재', fromAmount: 100, toMaterial: '벌목의 가루', toAmount: 80, count: e_TP });
    if (e_SP > 0) exchangeSteps.push({ fromMaterial: '부드러운 목재', fromAmount: 50, toMaterial: '벌목의 가루', toAmount: 80, count: e_SP });
    if (e_PS > 0) exchangeSteps.push({ fromMaterial: '벌목의 가루', fromAmount: 100, toMaterial: '부드러운 목재', toAmount: 50, count: e_PS });
    if (e_PA > 0) exchangeSteps.push({ fromMaterial: '벌목의 가루', fromAmount: 100, toMaterial: '아비도스 목재', toAmount: 10, count: e_PA });

    const remainingInventory = {
      '목재': Math.round(inv.A + (e_ST * 50) + (e_UT * 50) - (e_TP * 100) - (x * recipe.A)),
      '부드러운 목재': Math.round(inv.B + (e_PS * 50) - (e_SP * 50) - (e_ST * 25) - (x * recipe.B)),
      '아비도스 목재': Math.round(inv.C + (e_PA * 10) - (x * recipe.C)),
      '튼튼한 목재': Math.round(inv.S - (e_UT * 5)),
      '벌목의 가루': Math.round(inv.P + (e_TP * 80) + (e_SP * 80) - (e_PS * 100) - (e_PA * 100)),
    };

    console.log(`[ILP-JS] Max crafts calculated: ${x * 10}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ maxCrafts: x * 10, exchangeSteps, remainingInventory }),
    };
  } catch (error) {
    console.error('[ILP-JS] Solver Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: String(error) }),
    };
  }
};
