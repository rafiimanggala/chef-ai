import { describe, it, expect } from 'vitest';
import { CreditService } from '../../services/credit-service.js';

describe('CreditService', () => {
  describe('hasEnoughCredits', () => {
    it('returns true when balance >= required', () => {
      expect(CreditService.hasEnoughCredits(50, 30)).toBe(true);
    });

    it('returns false when balance < required', () => {
      expect(CreditService.hasEnoughCredits(10, 30)).toBe(false);
    });

    it('returns true when balance equals required', () => {
      expect(CreditService.hasEnoughCredits(30, 30)).toBe(true);
    });
  });

  describe('calculateRunCredits', () => {
    it('calculates credits from USD cost with 30% markup', () => {
      const credits = CreditService.calculateRunCredits(0.10);
      expect(credits).toBe(13);
    });

    it('returns minimum 1 credit for tiny costs', () => {
      const credits = CreditService.calculateRunCredits(0.001);
      expect(credits).toBe(1);
    });

    it('returns 0 for zero cost', () => {
      const credits = CreditService.calculateRunCredits(0);
      expect(credits).toBe(0);
    });
  });

  describe('calculateStepCredits', () => {
    it('calculates credits for an LLM call', () => {
      const credits = CreditService.calculateStepCredits({
        tokensIn: 2000,
        tokensOut: 500,
        modelPricing: { input: 3.0, output: 15.0 },
      });
      expect(credits).toBe(2);
    });
  });

  describe('estimateRunCredits', () => {
    it('returns low/expected/high range', () => {
      const estimate = CreditService.estimateRunCredits({
        complexity: 'medium',
        modelPricing: { input: 3.0, output: 15.0 },
        pluginCount: 3,
      });
      expect(estimate.low).toBeGreaterThan(0);
      expect(estimate.expected).toBeGreaterThan(estimate.low);
      expect(estimate.high).toBeGreaterThan(estimate.expected);
    });
  });
});
