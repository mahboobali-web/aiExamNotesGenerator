import { motion } from 'framer-motion';
import { Mail, MessageCircle } from 'lucide-react';

export default function ContactSupport() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto py-12 px-8 select-none">
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Contact Support</h1>
      <div className="text-gray-400 space-y-6">
        <p className="leading-relaxed">Need help with ExamNotes AI? Our support team is here for you.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-[#131b2e] border border-white/10 p-6 rounded-xl transition-all hover:border-white/20">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Email Support</h3>
            <p className="mb-4 text-sm leading-relaxed">Get in touch with us via email for any inquiries.</p>
            <a href="mailto:support@examnotes.ai" className="text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors">
              support@examnotes.ai
            </a>
          </div>
          
          <div className="bg-[#131b2e] border border-white/10 p-6 rounded-xl transition-all hover:border-white/20">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Live Chat</h3>
            <p className="mb-4 text-sm leading-relaxed">Chat with our support agents during business hours.</p>
            <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors active:scale-95 shadow-lg shadow-indigo-500/20">
              Start Chat
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
