import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import {
  User as UserIcon,
  Shield,
  CreditCard,
  Laptop,
  LogOut,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Plus,
  Fingerprint,
  Phone,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, logout } from '../lib/firebase';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(auth.currentUser);
    fetchDbUserProfile();
    fetchSessions();
  }, []);

  const fetchDbUserProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setDbUser(response.data.user);
      setEditName(response.data.user.displayName || '');
    } catch (err) {
      console.error('Error fetching DB user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const res = await api.put('/auth/me', { displayName: editName });
      if (res.data.success) {
        setDbUser(res.data.user);
        setIsEditingProfile(false);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await api.get('/sessions');
      if (res.data.success) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      console.error('Error fetching active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string, isCurrent: boolean) => {
    try {
      const res = await api.delete(`/sessions/${sessionId}`);
      if (res.data.success) {
        if (isCurrent) {
          handleLogout();
        } else {
          fetchSessions();
        }
      }
    } catch (err) {
      console.error('Error revoking device session:', err);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      const res = await api.post('/sessions/revoke-all');
      if (res.data.success) {
        fetchSessions();
      }
    } catch (err) {
      console.error('Error revoking all other sessions:', err);
    }
  };

  const formatLastActive = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const sidebarLinks = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Credits & Billing', icon: CreditCard },
    { id: 'sessions', label: 'Active Sessions', icon: Laptop },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-[1200px] mx-auto py-4 pb-8 select-none"
    >
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* ─── LEFT COLUMN: Navigation Sidebar ─── */}
        <div className="w-full lg:w-[260px] shrink-0 space-y-6 text-left">
          <div className="px-3">
            <h2 className="text-[14px] font-bold text-gray-400 uppercase tracking-widest">
              Account
            </h2>
          </div>
          
          <nav className="flex flex-col gap-1 w-full">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setActiveTab(link.id);
                    // Smooth scroll to the corresponding card on desktop
                    const cardElement = document.getElementById(link.id);
                    if (cardElement) {
                      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all w-full ${
                    isActive
                      ? 'bg-[#1e253e] text-white shadow-md shadow-black/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                  {link.label}
                </button>
              );
            })}
            
            <div className="h-[1px] bg-white/[0.04] my-4" />
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold text-rose-455 hover:bg-rose-500/5 transition-all w-full"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              Sign Out
            </button>
          </nav>
        </div>

        {/* ─── RIGHT COLUMN: Settings Cards Stack ─── */}
        <div className="flex-1 w-full space-y-6">
          
          {/* CARD 1: Profile */}
          <div
            id="profile"
            className="bg-[#131b2e] rounded-[24px] border border-white/[0.06] p-6 md:p-8 space-y-6 text-left"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-white tracking-tight" style={{ fontFamily: 'Geist, sans-serif' }}>
                Profile
              </h3>
              {!isEditingProfile ? (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="text-xs font-bold text-gray-500 hover:text-white transition-colors"
                >
                  Edit Info
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="text-xs font-bold text-gray-500 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {savingProfile ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {/* Profile Info Container */}
            <div className="border border-white/[0.04] bg-[#0c1324]/40 p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-5">
              <img
                src="/profile_avatar.png"
                alt="Felix Anderson"
                className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
              />
              <div className="text-center sm:text-left space-y-2 min-w-0 w-full">
                <div>
                  {isEditingProfile ? (
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-[#1e253e] text-white text-base font-bold rounded-lg px-3 py-1 w-full max-w-xs border border-white/10 focus:border-indigo-400 focus:outline-none"
                    />
                  ) : (
                    <h4 className="text-base font-bold text-white truncate">
                      {dbUser?.displayName || user?.displayName || 'Felix Anderson'}
                    </h4>
                  )}
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {dbUser?.email || user?.email || 'felix.a@example.com'}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-0.5">
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                    Pro Student
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Authentication */}
          <div
            id="security"
            className="bg-[#131b2e] rounded-[24px] border border-white/[0.06] p-6 md:p-8 space-y-6 text-left"
          >
            <h3 className="text-[17px] font-bold text-white tracking-tight" style={{ fontFamily: 'Geist, sans-serif' }}>
              Authentication
            </h3>

            <div className="space-y-4">
              {/* Row 1: Account ID */}
              <div className="border border-white/[0.04] bg-[#0c1324]/40 p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center shrink-0 border border-white/[0.04]">
                    <Fingerprint className="w-4.5 h-4.5 text-gray-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-gray-500 font-extrabold uppercase tracking-wider">
                      Account ID
                    </span>
                    <span className="text-xs font-mono text-gray-300 truncate mt-0.5">
                      {user?.uid || 'EA-4921-X992-B001'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopyId(user?.uid || 'EA-4921-X992-B001')}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-white transition-all active:scale-95 border border-transparent"
                  title="Copy Account ID"
                >
                  {copiedId ? (
                    <Check className="w-4 h-4 text-emerald-400 animate-scale" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Row 2: Google Link Status */}
              <div className="border border-white/[0.04] bg-[#0c1324]/40 p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-gray-500 font-extrabold uppercase tracking-wider">
                      Google Status
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 truncate mt-0.5">
                      Connected as {user?.email || 'felix.a@gmail.com'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: Credits Available */}
          <div
            id="billing"
            className="bg-[#131b2e] rounded-[24px] border border-white/[0.06] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-left"
          >
            <div className="space-y-2 max-w-lg">
              <h3 className="text-[17px] font-bold text-white tracking-tight" style={{ fontFamily: 'Geist, sans-serif' }}>
                Credits Available
              </h3>
              <p className="text-[13px] text-gray-400 leading-relaxed font-medium">
                Credits are used for AI analysis and document generation.
              </p>
              
              <div className="flex gap-3.5 pt-4">
                <Button
                  onClick={() => navigate('/billing')}
                  className="h-10 px-5 rounded-xl text-[12px] font-bold bg-[#c0c1ff] hover:brightness-110 text-[#1000a9] border-0 flex items-center gap-1.5 shadow-md shadow-indigo-500/5"
                >
                  <Plus className="w-4 h-4" />
                  Add Credits
                </Button>
                <Button
                  onClick={() => navigate('/history')}
                  variant="ghost"
                  className="h-10 px-5 rounded-xl text-[12px] font-bold text-white border border-white/[0.08] hover:bg-white/5"
                >
                  View Usage
                </Button>
              </div>
            </div>

            <div className="flex flex-col text-left md:text-right shrink-0">
              <span className="text-[54px] font-black text-white leading-none tracking-tight">
                {loading ? '...' : (dbUser?.freeCredits ?? 0)}
              </span>
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mt-2">
                Remaining
              </span>
            </div>
          </div>

          {/* CARD 4: Security & Sessions */}
          <div
            id="sessions"
            className="bg-[#131b2e] rounded-[24px] border border-white/[0.06] p-6 md:p-8 space-y-6 text-left"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-white tracking-tight" style={{ fontFamily: 'Geist, sans-serif' }}>
                Security & Sessions
              </h3>
              <span className="px-2.5 py-0.5 rounded bg-white/5 text-gray-400 text-[10px] font-extrabold uppercase tracking-wider">
                {sessions.length} {sessions.length === 1 ? 'Device' : 'Devices'} Active
              </span>
            </div>

            <div className="space-y-4">
              {loadingSessions ? (
                <div className="py-8 text-center text-xs text-gray-500 font-semibold">
                  Loading active device sessions...
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500 font-semibold">
                  No active sessions found.
                </div>
              ) : (
                sessions.map((session) => {
                  const isLaptop = session.device.toLowerCase().includes('mac') ||
                    session.device.toLowerCase().includes('pc') ||
                    session.device.toLowerCase().includes('desktop') ||
                    session.device.toLowerCase().includes('windows');
                  
                  return (
                    <div
                      key={session._id}
                      className="border border-white/[0.04] bg-[#0c1324]/40 p-4 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          session.isCurrent 
                            ? 'bg-indigo-500/10 border-indigo-500/15 text-indigo-400' 
                            : 'bg-violet-500/10 border-violet-500/15 text-violet-400'
                        }`}>
                          {isLaptop ? (
                            <Laptop className="w-4.5 h-4.5" />
                          ) : (
                            <Smartphone className="w-4.5 h-4.5" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{session.device}</span>
                            {session.isCurrent && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 font-semibold mt-1">
                            {session.browser} • {session.os} • {session.isCurrent ? 'Active now' : formatLastActive(session.lastActive)} • {session.location} • {session.ipAddress}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRevokeSession(session._id, session.isCurrent)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors px-2 py-1 shrink-0"
                      >
                        {session.isCurrent ? 'Logout Device' : 'Revoke'}
                      </button>
                    </div>
                  );
                })
              )}

              {/* Box 3: Revoke All button */}
              {sessions.filter(s => !s.isCurrent).length > 0 && (
                <button
                  onClick={handleRevokeAllOtherSessions}
                  className="w-full text-center py-3 border border-dashed border-white/[0.08] rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:border-white/[0.16] hover:bg-white/[0.01] transition-all active:scale-[0.98]"
                >
                  Revoke all other sessions
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="mt-16 pt-8 border-t border-white/[0.04] select-none">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <span className="font-bold text-white text-sm tracking-tight font-sans">ExamNotes AI</span>
            <span className="text-gray-600 text-xs">© 2026 ExamNotes AI. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <a href="/privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Terms of Service</a>
            <a href="/support" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Contact Support</a>
            <a href="/api-docs" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">API Documentation</a>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
