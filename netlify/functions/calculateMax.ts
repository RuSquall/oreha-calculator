import { Handler } from '@netlify/functions';
// @ts-ignore
import glpk from 'glpk.js';

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
    const { inventory, targetItemName } = JSON.parse(event.body || '{}') as RequestBody;
    const recipe = RECIPES[targetItemName];

    if (!recipe) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid target item' }) };
    }

    // Sanitize inventory (prevent NaN/undefined)
    const inv = {
      A: inventory['목재'] || 0,
      B: inventory['부드러운 목재'] || 0,
      C: inventory['아비도스 목재'] || 0,
      S: inventory['튼튼한 목재'] || 0,
      P: inventory['벌목의 가루'] || 0,
    };

    const solver = await glpk();
    
    // LP Model Definition
    // x: number of batches (10 items each)
    // e_TP: Timber to Powder (100 -> 80)
    // e_SP: Soft to Powder (50 -> 80)
    // e_PS: Powder to Soft (100 -> 50)
    // e_PA: Powder to Abidos (100 -> 10)
    // e_ST: Soft to Timber (25 -> 50)
    // e_UT: Sturdy to Timber (5 -> 50)

    const lp = {
      name: 'LP',
      objective: {
        direction: solver.GLP_MAX,
        name: 'obj',
        vars: [
          { name: 'x', coef: 1.0 }
        ]
      },
      subjectTo: [
        // Timber Constraint: A*x + 100*e_TP - 50*e_ST - 50*e_UT <= Initial Timber
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
        // Soft Timber Constraint: B*x + 50*e_SP + 25*e_ST - 50*e_PS <= Initial Soft Timber
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
        // Abidos Timber Constraint: C*x - 10*e_PA <= Initial Abidos Timber
        {
          name: 'abidos_timber',
          vars: [
            { name: 'x', coef: recipe.C },
            { name: 'e_PA', coef: -10 }
          ],
          bnds: { type: solver.GLP_UP, ub: inv.C, lb: 0 }
        },
        // Sturdy Timber Constraint: 5*e_UT <= Initial Sturdy Timber
        {
          name: 'sturdy_timber',
          vars: [
            { name: 'e_UT', coef: 5 }
          ],
          bnds: { type: solver.GLP_UP, ub: inv.S, lb: 0 }
        },
        // Powder Constraint: 100*e_PS + 100*e_PA - 80*e_TP - 80*e_SP <= Initial Powder
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
      generals: ['x', 'e_TP', 'e_SP', 'e_PS', 'e_PA', 'e_ST', 'e_UT']
    };

    const result = solver.solve(lp);

    if (result.status !== solver.GLP_OPT) {
      // If not optimal, return 0 crafts
      return {
        statusCode: 200,
        body: JSON.stringify({
          maxCrafts: 0,
          exchangeSteps: [],
          remainingInventory: inventory
        }),
      };
    }

    const x = Math.floor(result.result.vars.x || 0);
    const e_TP = Math.floor(result.result.vars.e_TP || 0);
    const e_SP = Math.floor(result.result.vars.e_SP || 0);
    const e_PS = Math.floor(result.result.vars.e_PS || 0);
    const e_PA = Math.floor(result.result.vars.e_PA || 0);
    const e_ST = Math.floor(result.result.vars.e_ST || 0);
    const e_UT = Math.floor(result.result.vars.e_UT || 0);

    // Calculate exchange steps
    const exchangeSteps = [];
    if (e_UT > 0) exchangeSteps.push({ fromMaterial: '튼튼한 목재', fromAmount: 5, toMaterial: '목재', toAmount: 50, count: e_UT });
    if (e_ST > 0) exchangeSteps.push({ fromMaterial: '부드러운 목재', fromAmount: 25, toMaterial: '목재', toAmount: 50, count: e_ST });
    if (e_TP > 0) exchangeSteps.push({ fromMaterial: '목재', fromAmount: 100, toMaterial: '벌목의 가루', toAmount: 80, count: e_TP });
    if (e_SP > 0) exchangeSteps.push({ fromMaterial: '부드러운 목재', fromAmount: 50, toMaterial: '벌목의 가루', toAmount: 80, count: e_SP });
    if (e_PS > 0) exchangeSteps.push({ fromMaterial: '벌목의 가루', fromAmount: 100, toMaterial: '부드러운 목재', toAmount: 50, count: e_PS });
    if (e_PA > 0) exchangeSteps.push({ fromMaterial: '벌목의 가루', fromAmount: 100, toMaterial: '아비도스 목재', toAmount: 10, count: e_PA });

    // Calculate remaining inventory
    const remainingInventory = {
      '목재': inv.A + (e_ST * 50) + (e_UT * 50) - (e_TP * 100) - (x * recipe.A),
      '부드러운 목재': inv.B + (e_PS * 50) - (e_SP * 50) - (e_ST * 25) - (x * recipe.B),
      '아비도스 목재': inv.C + (e_PA * 10) - (x * recipe.C),
      '튼튼한 목재': inv.S - (e_UT * 5),
      '벌목의 가루': inv.P + (e_TP * 80) + (e_SP * 80) - (e_PS * 100) - (e_PA * 100),
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        maxCrafts: x * 10,
        exchangeSteps,
        remainingInventory,
      }),
    };
  } catch (error) {
    console.error('ILP Solver Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: String(error) }),
    };
  }
};
