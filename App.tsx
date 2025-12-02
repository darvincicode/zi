import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from './services/storage';
import { User } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const u = await getCurrentUser();
        setUser(u);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Connecting to Network...</div>;

  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children?: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if admin session exists
    const adminSession = localStorage.getItem('zec_admin_session');
    setIsAuthenticated(adminSession === 'true');
    setChecking(false);
  }, []);

  if (checking) return <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white">Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }
  return <>{children}</>;
};

const Layout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/*" 
          element={
            <AdminRoute>
              <Layout>
                <AdminPanel />
              </Layout>
            </AdminRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;