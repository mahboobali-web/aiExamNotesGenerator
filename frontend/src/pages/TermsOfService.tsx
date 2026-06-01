import { motion } from 'framer-motion';

export default function TermsOfService() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto py-12 px-8 select-none">
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Terms of Service</h1>
      <div className="text-gray-400 space-y-6">
        <p className="text-sm font-medium">Last updated: June 2026</p>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p className="leading-relaxed">By accessing or using ExamNotes AI, you agree to be bound by these Terms of Service.</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">2. Use of Service</h2>
          <p className="leading-relaxed">You agree to use our AI generation tools responsibly and not for any unlawful purposes or academic dishonesty.</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">3. Credits and Billing</h2>
          <p className="leading-relaxed">Credits purchased are non-refundable and must be used in accordance with our fair use policy.</p>
        </div>
      </div>
    </motion.div>
  );
}
