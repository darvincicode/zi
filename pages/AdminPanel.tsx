import React, { useState, useEffect } from 'react';
import { getUsers, fetchPlans, fetchSettings, savePlans, saveSettings, updateUser } from '../services/storage';
import { User, MiningPlan, GlobalSettings, UnitMultiplier, Transaction } from '../types';
import { Edit2, Save, Trash2, Plus, Users, Cpu, Activity, Search, Download, CheckCircle2, XCircle, Wallet, ArrowUpRight, ArrowDownLeft, Mail } from 'lucide-react';

interface PendingTransaction {
  userId: string;
  userAddress: string;
  transaction: Transaction;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'plans' | 'settings' | 'finance' | 'gateways'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<MiningPlan[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [searchZec, setSearchZec] = useState('');
  
  // Edit States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Manual Withdraw State
  const [manualWithdrawUser, setManualWithdrawUser] = useState<User | null>(null);
  const [manualAmount, setManualAmount] = useState<string>('');
  
  // Loading State
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    const fetchedUsers = await getUsers();
    setUsers(fetchedUsers);
    
    // Fetch Settings and Plans from DB
    const s = await fetchSettings();
    setSettings(s);
    
    const p = await fetchPlans();
    setPlans(p);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await updateUser(editingUser);
      setEditingUser(null);
      refreshData();
    }
  };

  const handleManualWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualWithdrawUser || !manualAmount) return;
    
    const amount = parseFloat(manualAmount);
    if (amount <= 0 || amount > manualWithdrawUser.balance) {
      alert("Invalid amount or insufficient balance.");
      return;
    }

    const updatedUser: User = {
      ...manualWithdrawUser,
      balance: manualWithdrawUser.balance - amount,
      transactions: [
        ...manualWithdrawUser.transactions,
        {
          id: crypto.randomUUID(),
          type: 'WITHDRAW',
          amount: amount,
          timestamp: Date.now(),
          status: 'COMPLETED',
          currency: 'ZEC'
        }
      ]
    };
    
    await updateUser(updatedUser);
    setManualWithdrawUser(null);
    setManualAmount('');
    refreshData();
    alert("Manual withdrawal processed successfully.");
  };

  const handleProcessTransaction = async (userId: string, txId: string, action: 'APPROVE' | 'REJECT') => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const txIndex = user.transactions.findIndex(t => t.id === txId);
    if (txIndex === -1) return;

    const tx = user.transactions[txIndex];
    if (tx.status !== 'PENDING') return;

    let updatedUser = { ...user };
    const newTransactions = [...user.transactions];

    if (tx.type === 'WITHDRAW') {
        if (action === 'APPROVE') {
            newTransactions[txIndex] = { ...tx, status: 'COMPLETED' };
            updatedUser.transactions = newTransactions;
        } else {
            newTransactions[txIndex] = { ...tx, status: 'FAILED' };
            updatedUser.balance += tx.amount; // Refund
            updatedUser.transactions = newTransactions;
        }
    } else if (tx.type === 'DEPOSIT') {
        if (action === 'APPROVE') {
            newTransactions[txIndex] = { ...tx, status: 'COMPLETED' };
            // Activate Plan Logic
            if (tx.planId) {
                const plan = plans.find(p => p.id === tx.planId);
                if (plan) {
                    updatedUser.activeHashRate += plan.hashRate;
                    updatedUser.activePlans.push(plan.id);
                }
            }
            updatedUser.transactions = newTransactions;
        } else {
            newTransactions[txIndex] = { ...tx, status: 'FAILED' };
            updatedUser.transactions = newTransactions;
        }
    }

    await updateUser(updatedUser);
    refreshData();
  };

  const handlePlanChange = (index: number, field: keyof MiningPlan, value: any) => {
    const newPlans = [...plans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setPlans(newPlans);
  };

  const saveAllPlans = async () => {
    setSaving(true);
    await savePlans(plans);
    setSaving(false);
    alert('Plans updated successfully!');
  };

  const saveAllSettings = async () => {
    if (settings) {
      setSaving(true);
      await saveSettings(settings);
      setSaving(false);
      alert('Settings updated successfully!');
    }
  };

  const filteredUsers = users.filter(u => u.loginZecAddress.toLowerCase().includes(searchZec.toLowerCase()));

  const pendingTransactions: PendingTransaction[] = users.flatMap(u => 
    u.transactions
      .filter(t => (t.type === 'WITHDRAW' || t.type === 'DEPOSIT') && t.status === 'PENDING')
      .map(t => ({
        userId: u.id,
        userAddress: u.loginZecAddress,
        transaction: t
      }))
  );

  if (!settings) return <div className="p-8 text-white">Loading Admin Data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Admin Control Panel</h1>
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <div className="flex items-center gap-2"><Users size={16}/> Users</div>
          </button>
           <button 
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'finance' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <div className="flex items-center gap-2">
              <Download size={16}/> 
              Finance
              {pendingTransactions.length > 0 && <span className="bg-red-500 text-white text-xs px-1.5 rounded-full">{pendingTransactions.length}</span>}
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('gateways')}
            className={`px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'gateways' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <div className="flex items-center gap-2"><Wallet size={16}/> Payments</div>
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'plans' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <div className="flex items-center gap-2"><Cpu size={16}/> Plans</div>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <div className="flex items-center gap-2"><Activity size={16}/> Settings</div>
          </button>
        </div>
      </div>

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Registered Users</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search ZEC Address..." 
                value={searchZec}
                onChange={(e) => setSearchZec(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-sm rounded-full pl-9 pr-4 py-1.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-950 text-slate-200 uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">ZEC (Login/Withdraw)</th>
                  <th className="px-6 py-4">Balance</th>
                  <th className="px-6 py-4">Hashrate (H/s)</th>
                  <th className="px-6 py-4">Ref Count</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-mono">{user.loginZecAddress}</td>
                    <td className="px-6 py-4">{user.balance.toFixed(6)}</td>
                    <td className="px-6 py-4">{user.activeHashRate.toLocaleString()}</td>
                    <td className="px-6 py-4">{user.referralCount || 0}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button 
                        onClick={() => setEditingUser(user)}
                        className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white p-2 rounded transition-colors"
                        title="Edit User"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setManualWithdrawUser(user)}
                        className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white p-2 rounded transition-colors"
                        title="Manual Withdraw"
                      >
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- FINANCE TAB (Withdrawals & Deposits) --- */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
             <div className="p-4 border-b border-slate-800">
                <h2 className="font-semibold text-white">Pending Transactions (Deposits & Withdrawals)</h2>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-slate-950 text-slate-200 uppercase font-medium">
                    <tr>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Details</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {pendingTransactions.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No pending transactions.</td></tr>
                    ) : (
                      pendingTransactions.map(pt => (
                        <tr key={pt.transaction.id} className="hover:bg-slate-800/50">
                          <td className="px-6 py-4">
                             {pt.transaction.type === 'WITHDRAW' ? (
                               <span className="text-amber-500 flex items-center gap-1 font-bold"><ArrowUpRight size={14}/> WITHDRAW</span>
                             ) : (
                               <span className="text-emerald-500 flex items-center gap-1 font-bold"><ArrowDownLeft size={14}/> DEPOSIT</span>
                             )}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{pt.userAddress}</td>
                          <td className="px-6 py-4 font-mono text-xs">
                             {pt.transaction.type === 'DEPOSIT' && (
                                <div className="space-y-1">
                                    <div className="text-slate-300">{pt.transaction.currency}</div>
                                    <div className="text-slate-600 text-[10px] break-all max-w-[150px]">{pt.transaction.txHash}</div>
                                    <div className="text-blue-400 text-[10px]">Awaiting 5 conf.</div>
                                </div>
                             )}
                             {pt.transaction.type === 'WITHDRAW' && (
                                <span className="text-slate-400">To: {pt.userAddress}</span>
                             )}
                          </td>
                          <td className="px-6 py-4 font-mono text-white font-bold">{pt.transaction.amount} ZEC</td>
                          <td className="px-6 py-4 flex gap-2">
                             <button 
                                onClick={() => handleProcessTransaction(pt.userId, pt.transaction.id, 'APPROVE')}
                                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs"
                             >
                               <CheckCircle2 size={14}/> {pt.transaction.type === 'DEPOSIT' ? 'Confirm (5/5)' : 'Approve'}
                             </button>
                             <button 
                                onClick={() => handleProcessTransaction(pt.userId, pt.transaction.id, 'REJECT')}
                                className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded text-xs"
                             >
                               <XCircle size={14}/> Reject
                             </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* --- PAYMENT GATEWAYS TAB --- */}
      {activeTab === 'gateways' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-3xl">
          <h2 className="text-xl font-bold text-white mb-6">Payment Gateway Configuration</h2>
          
          <div className="space-y-8">
             {/* Crypto Wallets Section */}
             <div>
               <h3 className="text-lg font-semibold text-emerald-400 mb-4 border-b border-emerald-900/30 pb-2">Admin Deposit Wallets</h3>
               <p className="text-xs text-slate-500 mb-4">Users will see these addresses when making direct crypto payments.</p>
               
               <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Bitcoin (BTC) Address</label>
                    <input 
                      type="text" 
                      value={settings.paymentConfig.btcAddress}
                      onChange={(e) => setSettings({...settings, paymentConfig: {...settings.paymentConfig, btcAddress: e.target.value}})}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Litecoin (LTC) Address</label>
                    <input 
                      type="text" 
                      value={settings.paymentConfig.ltcAddress}
                      onChange={(e) => setSettings({...settings, paymentConfig: {...settings.paymentConfig, ltcAddress: e.target.value}})}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">USDT (TRC20) Address</label>
                      <input 
                        type="text" 
                        value={settings.paymentConfig.usdtTrc20Address}
                        onChange={(e) => setSettings({...settings, paymentConfig: {...settings.paymentConfig, usdtTrc20Address: e.target.value}})}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">USDT (BEP20) Address</label>
                      <input 
                        type="text" 
                        value={settings.paymentConfig.usdtBep20Address}
                        onChange={(e) => setSettings({...settings, paymentConfig: {...settings.paymentConfig, usdtBep20Address: e.target.value}})}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm"
                      />
                    </div>
                  </div>
               </div>
             </div>

             <div className="flex justify-end pt-4">
                <button onClick={saveAllSettings} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50">
                   <Save size={18} /> {saving ? 'Saving...' : 'Save Payment Config'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Edit User</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">ZEC Login/Withdraw Address (Fixed)</label>
                <input type="text" value={editingUser.loginZecAddress} disabled className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-500 cursor-not-allowed" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Balance</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    value={editingUser.balance} 
                    onChange={(e) => setEditingUser({...editingUser, balance: parseFloat(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-emerald-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Hashrate (H/s)</label>
                  <input 
                    type="number" 
                    value={editingUser.activeHashRate} 
                    onChange={(e) => setEditingUser({...editingUser, activeHashRate: parseInt(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-emerald-500 outline-none" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MANUAL WITHDRAW MODAL --- */}
      {manualWithdrawUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Manual Withdrawal</h3>
            <p className="text-sm text-slate-400 mb-4">
              Deduct funds from <strong>{manualWithdrawUser.loginZecAddress.substring(0, 10)}...</strong> and mark as paid.
            </p>
            <form onSubmit={handleManualWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Amount (ZEC)</label>
                <input 
                  type="number" 
                  step="0.000001"
                  max={manualWithdrawUser.balance}
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder={`Max: ${manualWithdrawUser.balance.toFixed(6)}`}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-emerald-500 outline-none" 
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => {setManualWithdrawUser(null); setManualAmount('');}} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded">Process</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PLANS TAB --- */}
      {activeTab === 'plans' && (
        <div className="grid gap-6">
          {plans.map((plan, idx) => (
            <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-white font-bold mb-4 border-b border-slate-800 pb-2">Plan: {plan.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Display Name</label>
                  <input 
                    type="text" 
                    value={plan.name} 
                    onChange={(e) => handlePlanChange(idx, 'name', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Hashrate (Raw H/s)</label>
                  <input 
                    type="number" 
                    value={plan.hashRate} 
                    onChange={(e) => handlePlanChange(idx, 'hashRate', parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Label (e.g. 1 GH/s)</label>
                  <input 
                    type="text" 
                    value={plan.hashRateLabel} 
                    onChange={(e) => handlePlanChange(idx, 'hashRateLabel', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Price (ZEC)</label>
                  <input 
                    type="number" 
                    value={plan.priceZec} 
                    onChange={(e) => handlePlanChange(idx, 'priceZec', parseFloat(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white" 
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
             <button onClick={saveAllPlans} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50">
               <Save size={18} /> {saving ? 'Saving...' : 'Save All Plans'}
             </button>
          </div>
        </div>
      )}

      {/* --- SETTINGS TAB --- */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Global Mining Configuration</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Global Output Rate Multiplier</label>
              <p className="text-xs text-slate-500 mb-2">Controls how much ZEC is generated per Hash per Second.</p>
              <input 
                type="number" 
                step="0.00000000001"
                value={settings.baseMiningRate} 
                onChange={(e) => setSettings({...settings, baseMiningRate: parseFloat(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" 
              />
            </div>
            
             {/* Referral Bonus Setting */}
             <div className="border-t border-slate-800 pt-6">
              <label className="block text-sm font-medium text-indigo-400 mb-2">Referral Bonus (H/s per invite)</label>
              <p className="text-xs text-slate-500 mb-2">Amount of Hashrate added to the referrer when a new user joins using their link. (5000 H/s = 5 kH/s)</p>
              <input 
                type="number" 
                value={settings.referralBonusHashRate} 
                onChange={(e) => setSettings({...settings, referralBonusHashRate: parseInt(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" 
              />
            </div>

            <div className="border-t border-slate-800 pt-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">Minimum Withdrawal Amount (ZEC)</label>
              <p className="text-xs text-slate-500 mb-2">Users cannot withdraw less than this amount.</p>
              <input 
                type="number" 
                step="0.001"
                value={settings.minWithdrawalAmount} 
                onChange={(e) => setSettings({...settings, minWithdrawalAmount: parseFloat(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" 
              />
            </div>

            {/* Support Email Setting */}
            <div className="border-t border-slate-800 pt-6">
              <label className="block text-sm font-medium text-emerald-400 mb-2">Support Email Address</label>
              <p className="text-xs text-slate-500 mb-2">Displayed in the website footer.</p>
              <div className="relative">
                <input 
                  type="email" 
                  value={settings.supportEmail} 
                  onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 pl-9 text-white" 
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>
            </div>
            
            <div className="border-t border-slate-800 pt-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">ZEC to USD Rate (Display only)</label>
              <input 
                type="number" 
                value={settings.zecToUsd} 
                onChange={(e) => setSettings({...settings, zecToUsd: parseFloat(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" 
              />
            </div>

            <button onClick={saveAllSettings} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50">
               <Save size={18} /> {saving ? 'Saving...' : 'Update Global Settings'}
             </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;