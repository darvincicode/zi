export interface MiningPlan {
  id: string;
  name: string;
  hashRate: number; // in H/s
  hashRateLabel: string; // e.g., "1 GH/s"
  priceZec: number;
  dailyProfit: number;
  features: string[]; // List of features/descriptions displayed on the card
}

export interface User {
  id: string;
  loginZecAddress: string; // Used for login (Renamed from ltcAddress)
  zecAddress: string | null; // Used for withdrawals
  balance: number;
  activeHashRate: number; // in H/s
  joinedAt: number;
  isAdmin?: boolean;
  transactions: Transaction[];
  activePlans: string[]; // IDs of purchased plans
  // Referral System
  referralCount: number;
  referredBy: string | null; // ID of the user who referred this user
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'MINING_REWARD' | 'PURCHASE' | 'REFERRAL_BONUS';
  amount: number; // Amount in ZEC value
  currency?: 'ZEC' | 'BTC' | 'LTC' | 'USDT_TRC20' | 'USDT_BEP20';
  txHash?: string; // For deposits
  timestamp: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  planId?: string; // If this transaction is for buying a plan
}

export interface PaymentConfig {
  btcAddress: string;
  ltcAddress: string;
  usdtTrc20Address: string;
  usdtBep20Address: string;
}

export interface GlobalSettings {
  zecToUsd: number;
  baseMiningRate: number; // Global multiplier for mining logic
  minWithdrawalAmount: number; // Minimum amount required to withdraw
  referralBonusHashRate: number; // HashRate reward per invite (in H/s)
  supportEmail: string; // Contact email for footer
  paymentConfig: PaymentConfig;
}

export enum UnitMultiplier {
  KH = 1000,
  MH = 1000000,
  GH = 1000000000,
  TH = 1000000000000
}