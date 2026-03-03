import { Handler } from '@netlify/functions';

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
    
    console.log(`[ILP] Request for ${targetItemName}`, inventory);

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

    // glpk.js를 동적으로 불러옵니다.
    // @ts-ignore
    const glpkImport = await import('glpk.js');
    const glpk = glpkImport.default;
    const solver = await glpk();
    
    // x: batches, e_XX: exchanges
    const lp = {
      name: 'LP',
      objective: {
        direction: solver.GLP_MAX,
        name: 'obj',
        vars: [{ name: 'x', coef: 1.0 }]
      },
      subjectTo: [
        {
          name: 'timber',
          vars: [
            { name: 'x', coef: recipe.A },
            { name: 'e_TP', coef: 100 },
            { name: 'e_ST', coef: -50 },
            { name: 'e_UT', coef: -50 }
          ],
          bnds: { type: solver.GLP_UP, ub: inv.A, lb: 0 }
        },
        {
          name: 'soft_timber',
          vars: [
            { name: 'x', coef: recipe.B },
            { name: 'e_SP', coef: 50 },
            { name: 'e_ST', coef: 25 },
            { name: 'e_PS', coef: -50 }
          ],
          bnds: { type: solver.GLP_UP, ub: inv.B, lb: 0 }
        },
        {
          name: 'abidos_timber',
          vars: [
            { name: 'x', coef: recipe.C },
            { name: 'e_PA', coef: -10 }
          ],
          bnds: { type: solver.GLP_UP, ub: inv.C, lb: 0 }
        },
        {
          name: 'sturdy_timber',
          vars: [{ name: 'e_UT', coef: 5 }],
          bnds: { type: solver.GLP_UP, ub: inv.S, lb: 0 }
        },
        {
          name: 'powder',
          vars: [
            { name: 'e_PS', coef: 100 },
            { name: 'e_PA', coef: 100 },
            { name: 'e_TP', coef: -80 },
            { name: 'e_SP', coef: -80 }
          ],
          bnds: { type: solver.GLP_UP, ub: inv.P, lb: 0 }
        }
      ],
      // Ensure all variables are non-negative
      bounds: [
        { name: 'x', type: solver.GLP_LO, lb: 0 },
        { name: 'e_TP', type: solver.GLP_LO, lb: 0 },
        { name: 'e_SP', type: solver.GLP_LO, lb: 0 },
        { name: 'e_PS', type: solver.GLP_LO, lb: 0 },
        { name: 'e_PA', type: solver.GLP_LO, lb: 0 },
        { name: 'e_ST', type: solver.GLP_LO, lb: 0 },
        { name: 'e_UT', type: solver.GLP_LO, lb: 0 }
      ],
      generals: ['x', 'e_TP', 'e_SP', 'e_PS', 'e_PA', 'e_ST', 'e_UT']
    };

    const result = solver.solve(lp);
    console.log(`[ILP] Solver result status: ${result.status}`);

    // GLP_OPT: 5, GLP_FEAS: 2
    if (!result.result || !result.result.vars) {
      console.warn('[ILP] No feasible solution found');
      return {
        statusCode: 200,
        body: JSON.stringify({ maxCrafts: 0, exchangeSteps: [], remainingInventory: inventory }),
      };
    }

    const v = result.result.vars;
    const x = Math.max(0, Math.floor(v.x || 0));
    const e_TP = Math.max(0, Math.floor(v.e_TP || 0));
    const e_SP = Math.max(0, Math.floor(v.e_SP || 0));
    const e_PS = Math.max(0, Math.floor(v.e_PS || 0));
    const e_PA = Math.max(0, Math.floor(v.e_PA || 0));
    const e_ST = Math.max(0, Math.floor(v.e_ST || 0));
    const e_UT = Math.max(0, Math.floor(v.e_UT || 0));

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

    console.log(`[ILP] Max crafts calculated: ${x * 10}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ maxCrafts: x * 10, exchangeSteps, remainingInventory }),
    };
  } catch (error) {
    console.error('[ILP] Solver Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: String(error) }),
    };
  }
};
