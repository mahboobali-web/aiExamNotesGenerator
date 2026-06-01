import { motion } from 'framer-motion';
import { Sparkles, Brain, FileText, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';

const steps = [
  { icon: Brain, text: "Analyzing your topic...", color: "text-purple-500" },
  { icon: Sparkles, text: "Gathering academic resources...", color: "text-violet-500" },
  { icon: BookOpen, text: "Structuring key concepts...", color: "text-indigo-500" },
  { icon: FileText, text: "Formatting final notes...", color: "text-purple-600" }
];

export default function LoadingAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2000);
    
    const progressTimer = setInterval(() => {
      setProgress((prev) => (prev < 95 ? prev + Math.random() * 3 : prev));
    }, 200);
    
    return () => {
      clearInterval(stepTimer);
      clearInterval(progressTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-10">
      {/* Spinner */}
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-28 h-28 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent, #8b5cf6, transparent)',
            padding: '3px',
          }}
        >
          <div className="w-full h-full rounded-full bg-white" />
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Brain className="w-10 h-10 text-purple-500" />
          </motion.div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex flex-col items-center gap-3 w-72">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0.3 }}
              animate={{ 
                opacity: isActive ? 1 : isDone ? 0.6 : 0.3,
                scale: isActive ? 1.05 : 1,
              }}
              className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl transition-colors ${
                isActive ? 'bg-purple-50 border border-purple-100' : ''
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? step.color : isDone ? 'text-emerald-500' : 'text-gray-300'}`} />
              <span className={`text-sm font-medium ${isActive ? 'text-gray-800' : isDone ? 'text-gray-500' : 'text-gray-400'}`}>
                {step.text}
              </span>
              {isDone && <span className="ml-auto text-emerald-500 text-xs">✓</span>}
            </motion.div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-72">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">Generating... {Math.round(progress)}%</p>
      </div>
    </div>
  );
}
