import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Hexagon, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { logout } from '../services/storage';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    if (isAdmin) {
      localStorage.removeItem('zec_admin_session');
    } else {
      logout();
    }
    navigate(isAdmin ? '/admin-login' : '/');
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors">
          <Hexagon className="w-8 h-8 fill-emerald-900/50" />
          <span className="text-xl font-bold tracking-tight text-white">ZEC<span className="text-emerald-500">Miner</span></span>
          {isAdmin && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full ml-2">ADMIN</span>}
        </Link>

        <div className="flex items-center gap-6">
          {!isAdmin && (
            <Link to="/dashboard" className={`flex items-center gap-2 text-sm font-medium transition-colors ${location.pathname === '/dashboard' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}>
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          )}
           {isAdmin && (
            <Link to="/admin" className={`flex items-center gap-2 text-sm font-medium transition-colors ${location.pathname === '/admin' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}>
              <ShieldCheck className="w-4 h-4" />
              Panel
            </Link>
          )}

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;