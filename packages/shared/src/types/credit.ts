export type CreditTransactionType =
  | 'monthly-reset'
  | 'purchase'
  | 'run-consume'
  | 'run-refund'
  | 'bonus';

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: CreditTransactionType;
  runId: string | null;
  description: string | null;
  createdAt: Date;
}

export interface CreditBalance {
  balance: number;
  monthlyReset: number;
  plan: 'free' | 'pro' | 'power';
}
