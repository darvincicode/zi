import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Hardcoded credentials as per request
    if (username === 'admin' && password === '123456') {
      localStorage.setItem('zec_admin_session', 'true');
      navigate('/admin');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="bg-red-500/10 p-4 rounded-full">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-6">Admin Panel</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 focus:border-red-500 focus:outline-none pr-10"
              />
              <Lock className="absolute right-3 top-2.5 w-4 h-4 text-slate-500" />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors mt-2"
          >
            Access Panel
          </button>
        </form>
        <button onClick={() => navigate('/')} className="w-full text-center text-slate-600 text-xs mt-6 hover:text-slate-400">Back to Main Site</button>
      </div>
    </div>
  );
};

export default AdminLogin;