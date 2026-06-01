import { motion } from 'framer-motion';

export default function PrivacyPolicy() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto py-12 px-8 select-none">
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Privacy Policy</h1>
      <div className="text-gray-400 space-y-6">
        <p className="text-sm font-medium">Last updated: June 2026</p>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
          <p className="leading-relaxed">At ExamNotes AI, we collect information you provide directly to us when you create an account, generate notes, or contact support.</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">2. How We Use Information</h2>
          <p className="leading-relaxed">We use the information we collect to provide, maintain, and improve our services, as well as to personalize your learning experience.</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">3. Data Security</h2>
          <p className="leading-relaxed">We implement appropriate technical and organizational measures to protect the security of your personal information.</p>
        </div>
      </div>
    </motion.div>
  );
}
