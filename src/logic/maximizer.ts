import solver from 'javascript-lp-solver';
import { MaterialName, CraftableItem, MaximizerResult, ExchangeStepDetail, Inventory } from '../types/data';
import { RECIPES, DISCRETE_EXCHANGES as EX, MATERIAL_NAMES } from './constants';

// Helper to convert recipe for 10 crafts to 1 craft
const getSingleCraftRecipe = (targetItemName: CraftableItem) => {
    const recipe10 = RECIPES.find(r => r.name === targetItemName);
    if (!recipe10) throw new Error('Recipe not found');
    const singleRecipe: Record<MaterialName, number> = {} as Record<MaterialName, number>;
    for (const mat in recipe10.materials) {
        singleRecipe[mat as MaterialName] = recipe10.materials[mat as MaterialName]! / 10;
    }
    return singleRecipe;
};

export const calculateMaxCrafts = (
    initialInventory: Inventory,
    targetItemName: CraftableItem
): MaximizerResult => {
    const singleCraftRecipe = getSingleCraftRecipe(targetItemName);

    // Define a type for the solution object from javascript-lp-solver
    interface LPSolution {
        feasible: boolean;
        result: {
            crafts: number;
            [key: string]: number; // Allow other properties
        };
        variables: {
            [key: string]: number; // For exchange variables (y_key)
        };
    }

    const model: any = {
        optimize: 'crafts',
        opType: 'max',
        constraints: {},
        variables: {
            crafts: {
                // This is our objective variable
            }
        },
        ints: {
            crafts: 1 // crafts must be an integer
        }
    };

    // Add exchange variables and declare them as integers
    for (const key in EX) {
        const varName = `y_${key}`;
        model.variables[varName] = {};
        model.ints[varName] = 1; // exchange counts must be integers
    }

    // Initialize constraints for each material
    for (const materialName of MATERIAL_NAMES) {
        model.constraints[materialName] = { max: initialInventory[materialName] || 0 };
    }

    // Build variables and constraints
    // For each craft, it consumes materials
    for (const materialName of MATERIAL_NAMES) {
        const requiredForCraft = singleCraftRecipe[materialName] || 0;
        if (requiredForCraft > 0) {
            model.variables.crafts[materialName] = requiredForCraft;
        }
    }

    // For each exchange, define its impact on materials
    for (const key in EX) {
        const ex = EX[key];
        const varName = `y_${key}`;

        // Material consumed by exchange
        model.variables[varName][ex.from] = -ex.fromAmount;
        // Material produced by exchange
        model.variables[varName][ex.to] = ex.toAmount;
    }

    const solution: LPSolution = solver.Solve(model) as LPSolution;

    if (solution.feasible) {
        const maxCrafts = Math.floor(solution.result.crafts);
        const exchangeSteps: ExchangeStepDetail[] = [];

        for (const key in EX) {
            const count = Math.floor(solution.variables[`y_${key}`] || 0);
            if (count > 0) {
                const ex = EX[key];
                exchangeSteps.push({
                    fromMaterial: ex.from,
                    fromAmount: ex.fromAmount,
                    toMaterial: ex.to,
                    toAmount: ex.toAmount,
                    count: count,
                });
            }
        }

        // Calculate remaining inventory
        const remainingInventory: Inventory = { ...initialInventory };
        for (const materialName of MATERIAL_NAMES) {
            let finalAmount = (initialInventory[materialName] || 0);

            // Subtract materials used for crafting
            finalAmount -= maxCrafts * (singleCraftRecipe[materialName] || 0);

            // Apply exchanges
            for (const key in EX) {
                const ex = EX[key];
                const count = Math.floor(solution.variables[`y_${key}`] || 0);
                if (count > 0) {
                    if (ex.from === materialName) {
                        finalAmount -= count * ex.fromAmount;
                    }
                    if (ex.to === materialName) {
                        finalAmount += count * ex.toAmount;
                    }
                }
            }
            remainingInventory[materialName] = Math.max(0, Math.floor(finalAmount)); // Ensure non-negative and integer
        }


        return {
            maxCrafts: maxCrafts,
            exchangeSteps: exchangeSteps,
            remainingInventory: remainingInventory,
        };
    } else {
        return { maxCrafts: 0, exchangeSteps: [], remainingInventory: initialInventory };
    }
};