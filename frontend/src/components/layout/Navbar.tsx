import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { logout } from '../../lib/firebase';
import { BookOpen, LogOut, Coins, Bell } from 'lucide-react';

export default function Navbar({ user, credits }: { user: any; credits: number | null }) {
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Library', path: '/notes' },
    { name: 'Doc Tools', path: '/tools' },
    { name: 'Billing', path: '/billing' },
    { name: 'Purchase History', path: '/history' },
  ];

  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="h-16 glass-nav flex items-center justify-between px-8 sticky top-0 z-[60] select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl shadow-md shadow-indigo-500/10 border border-white/10">
          <BookOpen className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="font-extrabold text-base tracking-tight text-white font-sans">
          ExamNotes AI
        </span>
      </div>

      {/* Centered Navigation Links */}
      <div className="hidden md:flex items-center gap-6">
        {navLinks.map((link) => {
          const isActive = location.pathname.startsWith(link.path) && !(link.name === 'Doc Tools' && location.pathname === '/notes');
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`relative text-xs font-semibold tracking-wide py-5 px-1 transition-all duration-200 ${
                isActive
                  ? 'text-white border-b-2 border-primary-container'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Right Actions Block */}
      <div className="flex items-center gap-6">
        {/* Credits Badge */}
        <div className="flex items-center gap-2 bg-[#131b2e] border border-white/5 px-4 py-2 rounded-full shadow-inner shadow-black/30">
          <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-[11px] font-extrabold text-white tracking-wide">
            {credits !== null ? credits : '...'} Credits
          </span>
        </div>

        {/* Notifications Icon (Removed) */}

        {/* User Profile Avatar with Online Status Indicator */}
        <div className="flex items-center gap-3 border-l border-white/10 pl-6 relative">
          <div className="relative group cursor-pointer" onClick={() => setShowDropdown(!showDropdown)}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-extrabold shadow-sm border border-white/10 group-hover:scale-105 transition-all">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0b1326]" />
          </div>
          
          <div className="hidden xl:flex flex-col text-left cursor-pointer" onClick={() => setShowDropdown(!showDropdown)}>
            <span className="text-[11px] font-bold text-white max-w-[100px] truncate">
              {user.displayName || user.email?.split('@')[0] || 'User'}
            </span>
            <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest mt-0.5">
              Online
            </span>
          </div>

          {/* Profile Dropdown */}
          {showDropdown && (
            <div className="absolute top-12 right-0 w-56 bg-[#131b2e] border border-white/10 rounded-2xl shadow-2xl py-2 flex flex-col z-[100]">
              <div className="px-4 py-3 border-b border-white/5 mb-1 bg-[#1a233a]/50">
                <p className="text-sm font-bold text-white truncate">{user.displayName || 'User'}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
              </div>
              <div className="px-2 py-1">
                <Link to="/settings" onClick={() => setShowDropdown(false)} className="px-3 py-2 text-xs font-bold text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Account Settings
                </Link>
              </div>
              <div className="border-t border-white/5 mt-1 px-2 py-2">
                <button onClick={logout} className="w-full px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left flex items-center gap-2">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
