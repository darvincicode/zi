import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUser, getPlans, getSettings, updateUser, calculateMiningEarnings, fetchPlans, fetchSettings } from '../services/storage';
import { User, MiningPlan, UnitMultiplier } from '../types';
import { 
  Zap, 
  TrendingUp, 
  Coins, 
  Download, 
  Settings, 
  AlertTriangle,
  Server,
  Activity,
  CheckCircle2,
  X,
  Copy,
  QrCode,
  Wallet,
  Users,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<MiningPlan[]>([]);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [miningData, setMiningData] = useState<{time: string, rate: number}[]>([]);
  const lastUpdateRef = useRef<number>(Date.now());
  const savePendingRef = useRef<boolean>(false);

  // Payment Modal States
  const [selectedPlan, setSelectedPlan] = useState<MiningPlan | null>(null);
  const [cryptoType, setCryptoType] = useState<'BTC' | 'LTC' | 'USDT_TRC20' | 'USDT_BEP20'>('LTC');
  const [txHash, setTxHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Exchange Rates
  const [exchangeRates, setExchangeRates] = useState<{btc: number, ltc: number, usdt: number}>({ btc: 0, ltc: 0, usdt: 1 });

  // Initialization
  useEffect(() => {
    const init = async () => {
        const currentUser = await getCurrentUser();
        
        // Fetch global settings and plans asynchronously from DB to update local cache
        await fetchSettings();
        const latestPlans = await fetchPlans();
        
        setPlans(latestPlans);
        
        // Fetch Live Crypto Rates for Payment Calculation
        try {
           const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin&vs_currencies=usd');
           const data = await res.json();
           setExchangeRates({
             btc: data.bitcoin.usd,
             ltc: data.litecoin.usd,
             usdt: 1 // Stable
           });
        } catch (e) {
            console.error("Failed to fetch rates", e);
        }

        if (currentUser) {
          setUser(currentUser);
          
           // Seed initial chart data
            const now = new Date();
            const initialData = Array.from({length: 10}).map((_, i) => ({
            time: new Date(now.getTime() - (9 - i) * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            rate: currentUser ? currentUser.activeHashRate / 1000 : 10
            }));
            setMiningData(initialData);
        }
    };
    init();
  }, []);

  // Mining Loop
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const elapsedSeconds = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      // Calculate earnings locally first
      const earnings = calculateMiningEarnings(user, elapsedSeconds);
      
      // Update local state immediately for UI response
      const updatedUser = { ...user, balance: user.balance + earnings };
      setUser(updatedUser);

      // Randomize chart slightly
      setMiningData(prev => {
        const newData = [...prev];
        if (newData.length > 20) newData.shift();
        newData.push({
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          rate: (user.activeHashRate / 1000) * (1 + (Math.random() * 0.05 - 0.025)) 
        });
        return newData;
      });

      // Save to DB periodically (every ~3s in this loop)
      // In a real app we might debounce this further
      if (!savePendingRef.current) {
         savePendingRef.current = true;
         try {
             await updateUser(updatedUser);
         } finally {
             savePendingRef.current = false;
         }
      }

    }, 3000);

    return () => clearInterval(interval);
  }, [user?.id, user?.activeHashRate]); 

  const handleWithdraw = async () => {
    if (!user) return;
    const settings = getSettings();
    const minAmount = settings.minWithdrawalAmount;

    if (user.balance < minAmount) {
      setNotification({ msg: `Insufficient balance (Min ${minAmount} ZEC).`, type: 'error' });
      return;
    }

    const amount = user.balance;
    const updatedUser: User = {
      ...user,
      balance: 0,
      transactions: [
        ...user.transactions,
        {
          id: crypto.randomUUID(),
          type: 'WITHDRAW',
          amount: amount,
          timestamp: Date.now(),
          status: 'PENDING',
          currency: 'ZEC'
        }
      ]
    };

    setUser(updatedUser);
    await updateUser(updatedUser);
    setNotification({ msg: `Withdrawal request for ${amount.toFixed(6)} ZEC submitted.`, type: 'success' });
  };

  const handleCryptoPayment = async () => {
    if (!user || !selectedPlan) return;
    if (txHash.length < 10) {
      alert("Please enter a valid Transaction Hash");
      return;
    }
    
    setIsProcessing(true);

    const updatedUser: User = {
      ...user,
      transactions: [
        ...user.transactions,
        {
          id: crypto.randomUUID(),
          type: 'DEPOSIT',
          amount: selectedPlan.priceZec,
          currency: cryptoType,
          txHash: txHash,
          timestamp: Date.now(),
          status: 'PENDING',
          planId: selectedPlan.id
        }
      ]
    };

    setUser(updatedUser);
    await updateUser(updatedUser);
    
    setTimeout(() => {
      setNotification({ msg: `Payment submitted! Plan will activate after 5 network confirmations.`, type: 'success' });
      setIsProcessing(false);
      setSelectedPlan(null);
      setTxHash('');
    }, 1000);
  };

  const getAdminAddress = (type: string) => {
    const s = getSettings().paymentConfig;
    switch(type) {
      case 'BTC': return s.btcAddress;
      case 'LTC': return s.ltcAddress;
      case 'USDT_TRC20': return s.usdtTrc20Address;
      case 'USDT_BEP20': return s.usdtBep20Address;
      default: return '';
    }
  };

  const copyReferralLink = () => {
    if (!user) return;
    const link = `${window.location.origin}${window.location.pathname}#/?ref=${user.id}`;
    navigator.clipboard.writeText(link);
    setNotification({ msg: "Referral link copied to clipboard!", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const settings = getSettings();

  const renderPaymentAmount = () => {
    if (!selectedPlan) return null;
    const usdPrice = (selectedPlan.priceZec * settings.zecToUsd);
    
    if (cryptoType.includes('USDT')) {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4 text-center">
                <p className="text-emerald-400 text-xs uppercase font-bold tracking-wider mb-1">Amount to Transfer</p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-mono font-bold text-white">{usdPrice.toFixed(2)}</span>
                    <span className="text-lg font-bold text-emerald-500">USDT</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Equivalent to {selectedPlan.priceZec} ZEC</p>
            </div>
        )
    }

    let cryptoAmount = 0;
    let symbol = cryptoType;
    
    if (cryptoType === 'BTC' && exchangeRates.btc > 0) {
        cryptoAmount = usdPrice / exchangeRates.btc;
    } else if (cryptoType === 'LTC' && exchangeRates.ltc > 0) {
        cryptoAmount = usdPrice / exchangeRates.ltc;
    }

    return (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4 text-center">
            <p className="text-emerald-400 text-xs uppercase font-bold tracking-wider mb-1">Amount to Transfer</p>
            {cryptoAmount > 0 ? (
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-mono font-bold text-white">{cryptoAmount.toFixed(6)}</span>
                    <span className="text-lg font-bold text-emerald-500">{symbol}</span>
                </div>
            ) : (
                <div className="text-amber-400 text-sm">Fetching live {symbol} rates...</div>
            )}
            
            <p className="text-[10px] text-slate-400 mt-1">≈ ${usdPrice.toFixed(2)} USD (Live Rate)</p>
        </div>
    )
  };

  if (!user) return <div>Loading dashboard...</div>;

  const estimatedDaily = (user.activeHashRate * settings.baseMiningRate * 86400).toFixed(6);
  const refBonusKHs = (settings.referralBonusHashRate / 1000).toFixed(1);

  return (
    <div className="space-y-8 relative">
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg flex items-center gap-2 shadow-xl ${notification.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-800' : 'bg-red-900/90 text-red-200 border border-red-800'}`}>
          {notification.type === 'success' ? <CheckCircle2 size={18}/> : <AlertTriangle size={18} />}
          {notification.msg}
          <button className="ml-auto hover:text-white" onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      {/* --- PAYMENT MODAL --- */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Purchase {selectedPlan.name}</h3>
                <p className="text-emerald-400 font-mono text-sm">{selectedPlan.priceZec} ZEC</p>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="text-slate-500 hover:text-white"><X size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4 bg-emerald-900/20 p-3 rounded-lg border border-emerald-900/50">
                    <Wallet className="text-emerald-400 w-5 h-5" />
                    <p className="text-sm text-emerald-200">Payment method: <span className="font-bold">Direct Crypto Transfer</span></p>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Select Network</label>
                    <div className="grid grid-cols-2 gap-2">
                       {(['BTC', 'LTC', 'USDT_TRC20', 'USDT_BEP20'] as const).map(t => (
                         <button 
                          key={t}
                          onClick={() => setCryptoType(t)}
                          className={`text-xs font-mono py-2 rounded border ${cryptoType === t ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}
                         >
                           {t.replace('_', ' ')}
                         </button>
                       ))}
                    </div>
                  </div>

                  {renderPaymentAmount()}

                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center text-center">
                     {getAdminAddress(cryptoType) ? (
                       <div className="bg-white p-2 rounded mb-3">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getAdminAddress(cryptoType))}`}
                            alt="Payment QR Code"
                            className="w-24 h-24"
                          />
                       </div>
                     ) : (
                        <QrCode className="w-24 h-24 text-white bg-slate-900 p-2 rounded mb-3"/>
                     )}
                     
                     <p className="text-xs text-slate-500 mb-1">Send payment to this address:</p>
                     <div className="flex items-center gap-2 w-full bg-slate-900 rounded px-2 py-1.5 border border-slate-800">
                        <code className="text-xs text-emerald-400 flex-1 break-all text-left">
                          {getAdminAddress(cryptoType) || "Address not configured by admin"}
                        </code>
                        <button 
                            onClick={() => {
                                const addr = getAdminAddress(cryptoType);
                                if(addr) {
                                    navigator.clipboard.writeText(addr);
                                    setNotification({ msg: "Address copied!", type: 'success' });
                                    setTimeout(() => setNotification(null), 2000);
                                }
                            }}
                            className="text-slate-500 hover:text-white" 
                            title="Copy"
                        >
                            <Copy size={14}/>
                        </button>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs text-slate-500 mb-1">Transaction Hash (TXID)</label>
                     <input 
                      type="text" 
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="Enter the transaction hash..."
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3 text-white text-sm focus:border-emerald-500 outline-none font-mono"
                     />
                     <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                       <AlertTriangle size={10}/> Plan activates after 5 confirmations.
                     </p>
                  </div>

                  <button 
                      onClick={handleCryptoPayment}
                      disabled={isProcessing}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl mt-2"
                    >
                      {isProcessing ? 'Verifying...' : 'Confirm Payment Sent'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}


      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Coins className="w-24 h-24 text-emerald-500" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Current Balance</p>
          <h3 className="text-3xl font-bold text-white font-mono">{user.balance.toFixed(8)} <span className="text-emerald-500 text-lg">ZEC</span></h3>
          <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Generating live
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-24 h-24 text-blue-500" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Active Hashrate</p>
          <h3 className="text-3xl font-bold text-white">
            {(user.activeHashRate / 1000).toLocaleString()} <span className="text-blue-500 text-lg">kH/s</span>
          </h3>
          <p className="text-slate-500 text-xs mt-2">Base speed + Upgrades</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-24 h-24 text-amber-500" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Est. Daily Profit</p>
          <h3 className="text-3xl font-bold text-white font-mono">{estimatedDaily} <span className="text-amber-500 text-lg">ZEC</span></h3>
          <p className="text-slate-500 text-xs mt-2">≈ ${(parseFloat(estimatedDaily) * settings.zecToUsd).toFixed(2)} USD</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Mining Activity (kH/s)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={miningData}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={12} tickLine={false} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="rate" stroke="#10b981" fillOpacity={1} fill="url(#colorRate)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Withdrawal & Settings */}
        <div className="space-y-6">
           {/* Referral Program Card */}
           <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 bg-gradient-to-br from-indigo-900/20 to-slate-900">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Affiliate Program
            </h3>
            <div className="space-y-4">
               <div>
                  <p className="text-sm text-slate-300 mb-2">
                    Invite friends and earn <span className="text-emerald-400 font-bold">{refBonusKHs} kH/s</span> for every new member!
                  </p>
                  <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Your Referral Link</label>
                  <div className="flex items-center gap-2 w-full bg-slate-950 rounded px-2 py-1.5 border border-slate-800">
                    <code className="text-xs text-indigo-300 flex-1 truncate">
                      {`${window.location.origin}${window.location.pathname}#/?ref=${user.id}`}
                    </code>
                    <button 
                      onClick={copyReferralLink}
                      className="text-slate-500 hover:text-white p-1" 
                      title="Copy Link"
                    >
                      <Copy size={14}/>
                    </button>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 text-center">
                     <p className="text-xs text-slate-500">Total Referrals</p>
                     <p className="text-lg font-bold text-white">{user.referralCount || 0}</p>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 text-center">
                     <p className="text-xs text-slate-500">Bonus Earned</p>
                     <p className="text-lg font-bold text-emerald-400">{((user.referralCount || 0) * settings.referralBonusHashRate / 1000).toLocaleString()} <span className="text-xs">kH/s</span></p>
                  </div>
               </div>
            </div>
          </div>

          {/* Wallet Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-400" />
              Wallet
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">My ZEC Address (Fixed)</label>
                <div className="bg-slate-950 border border-slate-700 rounded px-3 py-3 text-sm text-slate-300 font-mono break-all">
                   {user.loginZecAddress}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Withdrawals are automatically sent to your login address.
                </p>
              </div>
              
              <div className="pt-4 border-t border-slate-800">
                <button 
                  onClick={handleWithdraw}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  Withdraw Funds
                </button>
                <p className="text-xs text-slate-500 text-center mt-2">Min. Withdrawal: {settings.minWithdrawalAmount} ZEC</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Plans */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Server className="w-6 h-6 text-emerald-500" />
          Upgrade Hashrate
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 flex flex-col hover:border-emerald-500/50 transition-all shadow-lg hover:shadow-emerald-900/10">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="text-3xl font-bold text-emerald-400 mt-2">{plan.hashRateLabel}</div>
              </div>
              
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  No Maintenance Fees
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Fast Activation
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Est. {plan.dailyProfit} ZEC / Day
                </li>
              </ul>

              <div className="mt-auto">
                <div className="mb-3">
                  <p className="text-2xl font-bold text-white leading-none">{plan.priceZec} <span className="text-sm text-slate-500 font-normal">ZEC</span></p>
                  <p className="text-sm text-slate-500 mt-1">≈ ${(plan.priceZec * settings.zecToUsd).toFixed(2)} USD</p>
                </div>
                <button 
                  onClick={() => setSelectedPlan(plan)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                >
                  Buy Power
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Recent Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
           <h3 className="text-lg font-semibold text-white">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-950 text-slate-200 uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Via</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {user.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No transactions found</td>
                </tr>
              ) : (
                [...user.transactions].reverse().map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        tx.type === 'DEPOSIT' || tx.type === 'MINING_REWARD' ? 'bg-emerald-900/50 text-emerald-400' :
                        tx.type === 'REFERRAL_BONUS' ? 'bg-indigo-900/50 text-indigo-400' :
                        tx.type === 'WITHDRAW' ? 'bg-amber-900/50 text-amber-400' :
                        'bg-blue-900/50 text-blue-400'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-white">
                        {tx.type === 'REFERRAL_BONUS' ? 'HashRate Boost' : `${tx.amount.toFixed(6)} ZEC`}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">{tx.currency || 'ZEC'}</td>
                    <td className="px-6 py-4">{new Date(tx.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4">
                       <span className={`flex items-center gap-1 ${tx.status === 'COMPLETED' ? 'text-emerald-400' : tx.status === 'FAILED' ? 'text-red-400' : 'text-amber-400'}`}>
                         {tx.status} {tx.status === 'PENDING' && tx.type === 'DEPOSIT' && <span className="text-[10px] ml-1">(Confirming)</span>}
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;