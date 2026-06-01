import { loginWithGoogle } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { BookOpen, Sparkles, Zap, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0b1326]">
      {/* Premium organic blurred neon glow spheres */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[450px] h-[450px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[250px] h-[250px] bg-fuchsia-500/5 rounded-full blur-[80px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md mx-4 z-10"
      >
        <div className="border border-white/5 bg-[#131b2e]/70 backdrop-blur-xl rounded-[24px] shadow-2xl p-8 md:p-10 text-center space-y-8 select-none">
          {/* Brand Logo Container */}
          <div className="space-y-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-white/10"
            >
              <BookOpen className="w-10 h-10 text-white animate-pulse" />
            </motion.div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-white leading-tight font-sans">
                ExamNotes AI
              </h1>
              <p className="text-xs text-gray-400 max-w-[280px] mx-auto leading-relaxed font-semibold">
                Generate perfectly structured revision notes instantly with AI.
              </p>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Sparkles, label: 'AI Powered', color: 'text-indigo-400' },
              { icon: Zap, label: 'Instant', color: 'text-amber-400' },
              { icon: Shield, label: 'Secure', color: 'text-emerald-400' },
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#0b1326]/50 border border-white/5 hover:border-white/10 transition-colors"
              >
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{item.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Social Signin Action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <Button 
              onClick={handleLogin} 
              size="lg" 
              className="w-full h-13 text-sm font-extrabold bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 shadow-lg shadow-indigo-500/10 active:scale-95 transition-all duration-300 rounded-xl border-0 text-white flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
            
            <p className="text-center text-[11px] text-gray-500 font-semibold">
              Join <span className="text-indigo-400 font-extrabold">10,000+</span> top students saving hours of review.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
