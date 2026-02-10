declare module 'javascript-lp-solver' {
    interface Model {
        optimize: string;
        opType: 'min' | 'max';
        constraints: { [key: string]: { min?: number; max?: number; equal?: number } };
        variables: { [key: string]: { [key: string]: number } };
        ints?: { [key: string]: 1 };
        binaries?: { [key: string]: 1 };
    }

    interface Solution {
        feasible: boolean;
        result: { [key: string]: number };
        variables: { [key: string]: number };
        // Add other properties if needed, e.g., bounded, isInteger, etc.
    }

    function Solve(model: Model): Solution;

    export default { Solve };
}
