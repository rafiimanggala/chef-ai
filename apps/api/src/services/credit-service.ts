const MARKUP = 1.3;
const CREDITS_PER_DOLLAR = 100;

interface ModelPricing {
  input: number;
  output: number;
}

interface StepCostInput {
  tokensIn: number;
  tokensOut: number;
  modelPricing: ModelPricing;
}

interface EstimateInput {
  complexity: 'simple' | 'medium' | 'complex';
  modelPricing: ModelPricing;
  pluginCount: number;
}

interface CreditEstimate {
  low: number;
  expected: number;
  high: number;
}

const STEP_ESTIMATES = {
  simple:  { low: 3, expected: 8, high: 15 },
  medium:  { low: 8, expected: 20, high: 40 },
  complex: { low: 20, expected: 50, high: 100 },
} as const;

const AVG_TOKENS_PER_STEP = { input: 2000, output: 500 };

export class CreditService {
  static hasEnoughCredits(balance: number, required: number): boolean {
    return balance >= required;
  }

  static calculateRunCredits(costUsd: number): number {
    if (costUsd === 0) return 0;
    const withMarkup = costUsd * MARKUP;
    return Math.max(1, Math.round(withMarkup * CREDITS_PER_DOLLAR));
  }

  static calculateStepCredits(input: StepCostInput): number {
    const inputCost = (input.tokensIn / 1_000_000) * input.modelPricing.input;
    const outputCost = (input.tokensOut / 1_000_000) * input.modelPricing.output;
    const totalCost = inputCost + outputCost;
    return this.calculateRunCredits(totalCost);
  }

  static estimateRunCredits(input: EstimateInput): CreditEstimate {
    const steps = STEP_ESTIMATES[input.complexity];
    const costPerStep = (numSteps: number) => {
      const inputCost = (numSteps * AVG_TOKENS_PER_STEP.input / 1_000_000) * input.modelPricing.input;
      const outputCost = (numSteps * AVG_TOKENS_PER_STEP.output / 1_000_000) * input.modelPricing.output;
      const pluginCost = numSteps * 0.6 * input.pluginCount * 0.001;
      return inputCost + outputCost + pluginCost;
    };

    return {
      low: this.calculateRunCredits(costPerStep(steps.low)),
      expected: this.calculateRunCredits(costPerStep(steps.expected)),
      high: this.calculateRunCredits(costPerStep(steps.high)),
    };
  }
}
