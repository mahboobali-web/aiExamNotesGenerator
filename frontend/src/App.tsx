import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyNotes from './pages/MyNotes';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import PurchaseHistory from './pages/PurchaseHistory';
import DocTools from './pages/DocTools';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import api from './lib/api';

function App() {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCredits = async () => {
    if (auth.currentUser) {
      try {
        const res = await api.post('/auth/sync', { refreshToken: auth.currentUser.refreshToken });
        setCredits(res.data.user.freeCredits);
      } catch (err) {
        console.error('Error refreshing credits:', err);
      }
    }
  };

  useEffect(() => {
    const handleCreditsUpdate = () => {
      refreshCredits();
    };
    window.addEventListener('credits-updated', handleCreditsUpdate);
    return () => window.removeEventListener('credits-updated', handleCreditsUpdate);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Sync user on initial load or refresh
          const res = await api.post('/auth/sync', { refreshToken: currentUser.refreshToken });
          setCredits(res.data.user.freeCredits);
        } catch (err) {
          console.error('Failed to sync user on load:', err);
        }
      } else {
        setCredits(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-violet-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600"
        />
      </div>
    );
  }

  return (
    <Router>
      <AnimatePresence mode="wait">
        {user ? (
          <div className="h-screen bg-[#0b1326] flex flex-col font-sans overflow-hidden">
            <Navbar user={user} credits={credits} />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0b1326]">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/notes" element={<MyNotes />} />
                  <Route path="/tools" element={<DocTools />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/history" element={<PurchaseHistory />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </main>
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </AnimatePresence>
    </Router>
  );
}

export default App;
