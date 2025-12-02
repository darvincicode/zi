import { User, MiningPlan, GlobalSettings, Transaction, UnitMultiplier } from '../types';
import { createClient } from '@supabase/supabase-js';

// --- DATABASE CONFIGURATION ---
// 1. Create a project at https://supabase.com
// 2. Run the SQL query provided in the instructions to create the 'users' table.
// 3. Paste your URL and ANON KEY here.
const SUPABASE_URL = 'https://ydoetufcpqdlpkwmrehd.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkb2V0dWZjcHFkbHBrd21yZWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTA3MTYsImV4cCI6MjA4MDI2NjcxNn0.ujaiXSo3DGS7CBPVIQSLtzG6M14w-53k2Xr95s6x17o';

const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

const STORAGE_KEYS = {
  USERS: 'zec_users',
  PLANS: 'zec_plans',
  SETTINGS: 'zec_settings',
  CURRENT_USER: 'zec_current_user_id',
};

// Initial Data
const DEFAULT_PLANS: MiningPlan[] = [
  {
    id: 'plan_starter',
    name: 'Starter Cloud',
    hashRate: 1 * UnitMultiplier.GH,
    hashRateLabel: '1 GH/s',
    priceZec: 0.5,
    dailyProfit: 0.015,
  },
  {
    id: 'plan_advanced',
    name: 'Advanced Rig',
    hashRate: 100 * UnitMultiplier.GH,
    hashRateLabel: '100 GH/s',
    priceZec: 45,
    dailyProfit: 1.6,
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise Farm',
    hashRate: 1 * UnitMultiplier.TH,
    hashRateLabel: '1 TH/s',
    priceZec: 420,
    dailyProfit: 18.5,
  },
];

const DEFAULT_SETTINGS: GlobalSettings = {
  zecToUsd: 32.50, // Mock price
  baseMiningRate: 0.0000000001, // ZEC per Hash per Second (Mock logic)
  minWithdrawalAmount: 0.05, // Default minimum withdrawal
  referralBonusHashRate: 5 * UnitMultiplier.KH, // Default 5 kH/s
  supportEmail: 'contact@example.com',
  paymentConfig: {
    btcAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    ltcAddress: 'ltc1q5g5258n7f3d53q553957539753957',
    usdtTrc20Address: 'TKP7...TRC20Address',
    usdtBep20Address: '0x71C...BEP20Address'
  }
};

// --- Helpers for LocalStorage Fallback ---
const getFromLocal = <T>(key: string, defaultVal: T): T => {
  const item = localStorage.getItem(key);
  if (!item) return defaultVal;
  try {
    return JSON.parse(item);
  } catch {
    return defaultVal;
  }
};

const saveToLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- Service Methods (Now Async) ---

export const getSettings = (): GlobalSettings => getFromLocal(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
export const saveSettings = (settings: GlobalSettings) => saveToLocal(STORAGE_KEYS.SETTINGS, settings);

export const getPlans = (): MiningPlan[] => getFromLocal(STORAGE_KEYS.PLANS, DEFAULT_PLANS);
export const savePlans = (plans: MiningPlan[]) => saveToLocal(STORAGE_KEYS.PLANS, plans);

// Fetch all users (Admin)
export const getUsers = async (): Promise<User[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) {
      // Map DB fields to User type if needed
      return data.map((u: any) => ({
        id: u.id,
        loginZecAddress: u.login_zec_address,
        zecAddress: u.zec_address,
        balance: u.balance,
        activeHashRate: u.active_hash_rate,
        joinedAt: u.joined_at,
        transactions: u.transactions || [],
        activePlans: u.active_plans || [],
        referralCount: u.referral_count,
        referredBy: u.referred_by
      }));
    }
  }
  return getFromLocal(STORAGE_KEYS.USERS, []);
};

// Internal local save helper
const saveUsersLocal = (users: User[]) => saveToLocal(STORAGE_KEYS.USERS, users);

export const findUserByLoginAddress = async (address: string): Promise<User | undefined> => {
  if (supabase) {
     const { data, error } = await supabase.from('users').select('*').eq('login_zec_address', address).single();
     if (data) {
        return {
            id: data.id,
            loginZecAddress: data.login_zec_address,
            zecAddress: data.zec_address,
            balance: data.balance,
            activeHashRate: data.active_hash_rate,
            joinedAt: data.joined_at,
            transactions: data.transactions || [],
            activePlans: data.active_plans || [],
            referralCount: data.referral_count,
            referredBy: data.referred_by
        }
     }
     return undefined;
  }

  const users = getFromLocal<User[]>(STORAGE_KEYS.USERS, []);
  return users.find(u => u.loginZecAddress === address);
};

export const registerUser = async (address: string, referrerId?: string | null): Promise<User> => {
  const settings = getSettings();
  
  const newUser: User = {
    id: crypto.randomUUID(),
    loginZecAddress: address,
    zecAddress: address,
    balance: 0,
    activeHashRate: 10 * UnitMultiplier.KH,
    joinedAt: Date.now(),
    transactions: [],
    activePlans: [],
    referralCount: 0,
    referredBy: referrerId || null
  };

  if (supabase) {
     // Handle Referrer Bonus in DB
     if (referrerId) {
        // Fetch referrer first to add bonus
        const { data: refUser } = await supabase.from('users').select('*').eq('id', referrerId).single();
        if (refUser) {
           const newRate = refUser.active_hash_rate + settings.referralBonusHashRate;
           const newCount = (refUser.referral_count || 0) + 1;
           const txs = refUser.transactions || [];
           txs.push({
             id: crypto.randomUUID(),
             type: 'REFERRAL_BONUS',
             amount: 0,
             timestamp: Date.now(),
             status: 'COMPLETED',
             currency: 'ZEC'
           });
           await supabase.from('users').update({ 
               active_hash_rate: newRate, 
               referral_count: newCount,
               transactions: txs 
           }).eq('id', referrerId);
        }
     }

     // Insert new user
     const { error } = await supabase.from('users').insert({
        id: newUser.id,
        login_zec_address: newUser.loginZecAddress,
        zec_address: newUser.zecAddress,
        balance: newUser.balance,
        active_hash_rate: newUser.activeHashRate,
        joined_at: newUser.joinedAt,
        transactions: newUser.transactions,
        active_plans: newUser.activePlans,
        referral_count: newUser.referralCount,
        referred_by: newUser.referredBy
     });
     
     if (error) {
        console.error("DB Error:", error);
        throw new Error("Database registration failed");
     }
     return newUser;
  }

  // Fallback LocalStorage
  const users = getFromLocal<User[]>(STORAGE_KEYS.USERS, []);
  if (referrerId) {
    const referrerIndex = users.findIndex(u => u.id === referrerId);
    if (referrerIndex !== -1) {
      const referrer = users[referrerIndex];
      referrer.activeHashRate += settings.referralBonusHashRate;
      referrer.referralCount = (referrer.referralCount || 0) + 1;
      referrer.transactions.push({
        id: crypto.randomUUID(),
        type: 'REFERRAL_BONUS',
        amount: 0,
        timestamp: Date.now(),
        status: 'COMPLETED',
        currency: 'ZEC'
      });
      users[referrerIndex] = referrer;
    }
  }
  users.push(newUser);
  saveUsersLocal(users);
  return newUser;
};

export const updateUser = async (updatedUser: User) => {
  if (supabase) {
     await supabase.from('users').update({
        zec_address: updatedUser.zecAddress,
        balance: updatedUser.balance,
        active_hash_rate: updatedUser.activeHashRate,
        transactions: updatedUser.transactions,
        active_plans: updatedUser.activePlans,
        referral_count: updatedUser.referralCount
     }).eq('id', updatedUser.id);
     return;
  }

  const users = getFromLocal<User[]>(STORAGE_KEYS.USERS, []);
  const index = users.findIndex(u => u.id === updatedUser.id);
  if (index !== -1) {
    users[index] = updatedUser;
    saveUsersLocal(users);
  }
};

// --- Auth Simulation ---

export const loginUser = async (address: string, referrerId?: string | null): Promise<User> => {
  const existing = await findUserByLoginAddress(address);
  if (existing) {
    // Migration checks (if fields missing)
    let needsUpdate = false;
    if (existing.referralCount === undefined) {
        existing.referralCount = 0;
        existing.referredBy = null;
        needsUpdate = true;
    }
    if (needsUpdate) await updateUser(existing);

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, existing.id);
    return existing;
  }
  
  // Register new user
  const newUser = await registerUser(address, referrerId);
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, newUser.id);
  return newUser;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const id = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!id) return null;

  if (supabase) {
     const { data } = await supabase.from('users').select('*').eq('id', id).single();
     if (data) {
        return {
            id: data.id,
            loginZecAddress: data.login_zec_address,
            zecAddress: data.zec_address,
            balance: data.balance,
            activeHashRate: data.active_hash_rate,
            joinedAt: data.joined_at,
            transactions: data.transactions || [],
            activePlans: data.active_plans || [],
            referralCount: data.referral_count,
            referredBy: data.referred_by
        };
     }
     return null;
  }

  const users = getFromLocal<User[]>(STORAGE_KEYS.USERS, []);
  return users.find(u => u.id === id) || null;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

// --- Mining Logic ---

export const calculateMiningEarnings = (user: User, secondsElapsed: number): number => {
  const settings = getSettings();
  return user.activeHashRate * settings.baseMiningRate * secondsElapsed;
};