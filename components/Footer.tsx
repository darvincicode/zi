import React, { useEffect, useState } from 'react';
import { getSettings } from '../services/storage';
import { Mail } from 'lucide-react';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Fetch setting on mount. In a real app this might use context.
    const s = getSettings();
    setEmail(s.supportEmail);
  }, []);
  
  return (
    <footer className="w-full py-6 mt-8 border-t border-slate-800 bg-slate-900/30 text-center z-10 relative">
        <div className="container mx-auto px-4">
             <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
                Contact us: <a href={`mailto:${email}`} className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors flex items-center gap-1"><Mail size={14}/> {email}</a>
            </p>
             <p className="text-slate-600 text-xs mt-2">© {new Date().getFullYear()} ZecMiner Pro. All rights reserved.</p>
        </div>
    </footer>
  );
};

export default Footer;