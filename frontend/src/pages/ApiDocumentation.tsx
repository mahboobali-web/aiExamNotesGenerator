import { motion } from 'framer-motion';

export default function ApiDocumentation() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto py-12 px-8 select-none">
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">API Documentation</h1>
      <div className="text-gray-400 space-y-6">
        <p className="leading-relaxed">Welcome to the ExamNotes AI API documentation. Build powerful integrations with our study tools.</p>
        
        <div className="bg-[#131b2e] border border-white/10 p-6 rounded-xl mt-6">
          <h3 className="text-lg font-semibold text-white mb-2">Authentication</h3>
          <p className="mb-4">All API requests require an API key in the header:</p>
          <code className="bg-[#0b1120] border border-white/5 px-4 py-3 rounded-lg text-indigo-400 block font-mono text-sm">
            Authorization: Bearer YOUR_API_KEY
          </code>
        </div>
        
        <div className="bg-[#131b2e] border border-white/10 p-6 rounded-xl mt-6">
          <h3 className="text-lg font-semibold text-white mb-2">Generate Notes Endpoint</h3>
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">POST</span>
            <code className="text-sm font-mono text-white">/api/v1/generate</code>
          </div>
          <p className="leading-relaxed">Generates study notes from a provided topic or document text.</p>
        </div>
      </div>
    </motion.div>
  );
}
