import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginUser, getUsers } from '../services/storage';
import { Wallet, ArrowRight, Pickaxe, Activity, Users, Zap, Server } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Footer from '../components/Footer';

const Login: React.FC = () => {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [networkData, setNetworkData] = useState<{time: string, rate: number}[]>([]);
  const [stats, setStats] = useState({ totalHash: 0, users: 0 });
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Initialize Network Stats & Graph
  useEffect(() => {
    const fetchStats = async () => {
      const users = await getUsers();
      const realTotal = users.reduce((acc, u) => acc + u.activeHashRate, 0);
      const userCount = users.length;
      // Simulated base pool hashrate (e.g. 150 GH/s)
      const basePoolHash = 150 * 1000 * 1000 * 1000; 
      const startValue = basePoolHash + realTotal;

      setStats({ totalHash: startValue, users: Math.max(userCount, 1245) });

      // Seed initial chart data
      const now = new Date();
      const initialData = Array.from({length: 20}).map((_, i) => ({
        time: new Date(now.getTime() - (19 - i) * 2000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'}),
        rate: startValue * (1 + (Math.random() * 0.05 - 0.025)) 
      }));
      setNetworkData(initialData);
    };

    fetchStats();

    const interval = setInterval(() => {
       setNetworkData(prev => {
          const newData = [...prev];
          if (newData.length > 20) newData.shift();
          
          const currentTotal = stats.totalHash || 150000000000;
          const variation = currentTotal * (1 + (Math.random() * 0.06 - 0.03)); 

          newData.push({
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'}),
            rate: variation
          });
          
          return newData;
       });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || address.length < 10) {
      setError('Please enter a valid ZEC address.');
      return;
    }
    
    setLoading(true);
    try {
      const refId = searchParams.get('ref');
      await loginUser(address, refId);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Login failed. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const formatHashrate = (hash: number) => {
    if (hash >= 1e12) return (hash / 1e12).toFixed(2) + ' TH/s';
    if (hash >= 1e9) return (hash / 1e9).toFixed(2) + ' GH/s';
    if (hash >= 1e6) return (hash / 1e6).toFixed(2) + ' MH/s';
    return (hash / 1e3).toFixed(2) + ' kH/s';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>
      </div>

      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-6xl z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Stats & Graph */}
          <div className="space-y-8 order-2 lg:order-1">
            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                 <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                 Live Network Status
               </div>
               <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                 Maximize Your <br/>
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Zcash Mining</span> Yields
               </h1>
               <p className="text-slate-400 text-lg max-w-md">
                 Join the fastest growing cloud mining pool. No hardware required. Start earning ZEC instantly.
               </p>
            </div>

            {/* Live Graph Card */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl overflow-hidden relative group">
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none"></div>
               
               <div className="flex justify-between items-end mb-6 relative z-10">
                 <div>
                   <p className="text-slate-400 text-sm font-medium mb-1 flex items-center gap-2"><Server size={14}/> Total Pool Power</p>
                   <h3 className="text-3xl font-mono font-bold text-white tracking-tight">{formatHashrate(stats.totalHash)}</h3>
                 </div>
                 <div className="text-right">
                   <p className="text-emerald-400 text-sm font-bold flex items-center justify-end gap-1">
                     <Activity size={14}/> +2.4%
                   </p>
                   <p className="text-slate-500 text-xs">last 24h</p>
                 </div>
               </div>

               <div className="h-48 w-full -mx-2">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={networkData}>
                      <defs>
                        <linearGradient id="colorHash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                        itemStyle={{ color: '#10b981' }}
                        formatter={(value: number) => [formatHashrate(value), "Hashrate"]}
                        labelFormatter={() => ''}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorHash)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
               
               <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-slate-800 relative z-10">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users size={18}/></div>
                     <div>
                        <p className="text-xs text-slate-500">Active Miners</p>
                        <p className="text-sm font-bold text-white">{stats.users.toLocaleString()}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Zap size={18}/></div>
                     <div>
                        <p className="text-xs text-slate-500">Uptime</p>
                        <p className="text-sm font-bold text-white">99.98%</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Right Column: Login Form */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 lg:left-8 lg:translate-x-0 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-xl">
                 <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl flex items-center justify-center shadow-inner">
                   <Pickaxe className="w-7 h-7 text-white" />
                 </div>
              </div>

              <div className="mt-8 text-center lg:text-left mb-8">
                <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                <p className="text-slate-400 text-sm">Enter your wallet address to access your mining dashboard.</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="address" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    ZEC Wallet Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Wallet className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <input
                      id="address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="block w-full pl-11 pr-4 py-4 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono text-sm shadow-inner"
                      placeholder="Enter your ZEC address..."
                    />
                  </div>
                  {error && <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><span className="w-1 h-1 bg-red-400 rounded-full"></span>{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 group disabled:opacity-70"
                >
                  {loading ? 'Connecting...' : 'Start Mining'}
                  {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-800 text-center lg:text-left">
                 <p className="text-xs text-slate-500 leading-relaxed">
                   By connecting your wallet, you agree to our <span className="text-emerald-400 hover:underline cursor-pointer">Terms of Service</span>.
                   Secure, encrypted connection.
                 </p>
                 <button onClick={() => navigate('/admin-login')} className="mt-4 text-xs font-medium text-slate-600 hover:text-emerald-400 transition-colors">Admin Access</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;