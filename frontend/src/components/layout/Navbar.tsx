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
    { name: 'Settings', path: '/settings' },
  ];

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
      <div className="flex items-center gap-4.5">
        {/* Credits Badge */}
        <div className="flex items-center gap-2 bg-[#131b2e] border border-white/5 px-4.5 py-2 rounded-full shadow-inner shadow-black/30">
          <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-[11px] font-extrabold text-white tracking-wide">
            {credits !== null ? credits : '...'} Credits
          </span>
        </div>

        {/* Notifications Icon */}
        <button className="relative p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95 border border-transparent hover:border-white/5">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
        </button>

        {/* User Profile Avatar with Online Status Indicator */}
        <div className="flex items-center gap-2.5 border-l border-white/5 pl-4.5">
          <div className="relative group cursor-pointer" onClick={logout} title="Click to Logout">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-extrabold shadow-sm border border-white/10 group-hover:scale-105 transition-all">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0b1326]" />
          </div>
          
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-[11px] font-bold text-white max-w-[100px] truncate">
              {user.displayName || user.email?.split('@')[0] || 'User'}
            </span>
            <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest mt-0.5">
              Online
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
