import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Sparkles, BookOpen, Clock, TrendingUp, CheckCircle2, AlertTriangle, ArrowRight, Bell, ChevronDown, Upload, FileText, Settings2, BarChart2, LayoutTemplate, Lightbulb, Layers, Languages, Zap, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import NotesDashboard from './NotesDashboard';
import LoadingAnimation from '../components/dashboard/LoadingAnimation';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Dashboard() {
  const [topic, setTopic] = useState('');
  const [revisionMode, setRevisionMode] = useState(false);
  const [includeDiagram, setIncludeDiagram] = useState(false);
  const [includeChart, setIncludeChart] = useState(false);
  const [quickSheet, setQuickSheet] = useState(false);
  
  // Advanced Settings
  const [outputLength, setOutputLength] = useState('Medium');
  const [language, setLanguage] = useState('English');
  const [learningStyle, setLearningStyle] = useState('Academic');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // File Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<{content: string, topic: string} | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [diagramsCount, setDiagramsCount] = useState<number>(0);
  const [docsCount, setDocsCount] = useState<number>(0);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.deeperTopic) {
      setTopic(location.state.deeperTopic);
      // Clear the state so reloading doesn't re-trigger
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const loadingMessages = [
    "Analyzing Topic...",
    "Building Study Material...",
    "Generating Notes...",
    "Creating Formatting..."
  ];

  useEffect(() => {
    fetchDashboardStats();
    
    // Check Stripe payment session redirect parameters
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const sessionId = params.get('session_id');
      if (sessionId) {
        verifyStripeSession(sessionId);
      } else {
        setShowSuccessBanner(true);
        window.dispatchEvent(new Event('credits-updated'));
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => setShowSuccessBanner(false), 6000);
      }
    }
  }, []);

  const verifyStripeSession = async (sessionId: string) => {
    try {
      const response = await api.post('/checkout/verify-session', { sessionId });
      if (response.data.success) {
        setShowSuccessBanner(true);
        fetchDashboardStats();
        window.dispatchEvent(new Event('credits-updated'));
      }
    } catch (error) {
      console.error('Failed to verify Stripe session:', error);
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setShowSuccessBanner(false), 6000);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const userRes = await api.get('/auth/me');
      setCredits(userRes.data.user.freeCredits);
      setStreak(userRes.data.user.currentStreak || 0);
      
      const notesRes = await api.get('/notes');
      const fetchedNotes = notesRes.data.notes || [];
      
      setNotesCount(fetchedNotes.length);
      setRecentNotes(fetchedNotes.slice(0, 3)); // Store 3 most recent notes
      
      // Calculate actual diagrams generated from notes
      const noteDiagrams = fetchedNotes.filter((n: any) => n.includeDiagram).length;
      setDiagramsCount(noteDiagrams);
      
      // Calculate docs converted: notes generated + localStorage tool conversions
      const toolsCount = parseInt(localStorage.getItem('docs_converted_count') || '0', 10);
      setDocsCount(fetchedNotes.length + toolsCount);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || credits === null || credits <= 0) return;

    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      let data: FormData | any = null;
      let config = {};

      if (file) {
        data = new FormData();
        data.append('file', file);
        data.append('topic', topic);
        data.append('outputLength', outputLength);
        data.append('language', language);
        data.append('learningStyle', learningStyle);
        data.append('revisionMode', String(revisionMode));
        data.append('includeDiagram', String(includeDiagram));
        data.append('includeChart', String(includeChart));
        data.append('quickSheet', String(quickSheet));
        config = { };
      } else {
        data = {
          topic, 
          outputLength,
          language,
          learningStyle,
          revisionMode, 
          includeDiagram, 
          includeChart,
          quickSheet
        };
      }

      const response = await api.post('/generate', data, config);
      setResult({ content: response.data.note.content, topic: topic });
      setCredits(response.data.remainingCredits);
      
      // Update stats dynamically on successful generation
      setNotesCount(prev => prev + 1);
      if (includeDiagram) {
        setDiagramsCount(prev => prev + 1);
      }
      setDocsCount(prev => prev + 1);
      
      setLoading(false);
      window.dispatchEvent(new Event('credits-updated'));
    } catch (err: any) {
      console.error('Generation failed:', err);
      setLoading(false);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to generate notes. Please try again.';
      setError(errorMessage);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;
    
    const fileType = uploadedFile.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(fileType || '')) {
      alert('Unsupported file format. Please upload PDF, DOCX, or TXT.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    
    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => {
    setFile(null);
    setFileName(null);
  };

  // High-fidelity pre-populated default mock templates to ensure dashboard always looks full and visual
  const defaultRecentNotes = [
    {
      _id: 'default-1',
      topic: 'Cognitive Psychology',
      academicLevel: '8 Modules',
      classLevel: '8 Modules',
      examType: 'Full Diagrams',
      timeLabel: '12m ago',
      desc: 'Focusing on memory systems, neural pathways, and perception theories.',
      gradient: 'from-purple-900/60 via-indigo-900/40 to-fuchsia-950/60',
      content: JSON.stringify({
        subTopics: {
          "⭐": ["Memory Encoding & Retrieval", "Neural Pathways & Perception"],
          "⭐⭐": ["Perception Theories", "Attention Span Limiters"],
          "⭐⭐⭐": ["Working Memory Models", "Sensory Registers"]
        },
        importance: "⭐⭐⭐",
        notes: `# Cognitive Psychology\n\nCognitive psychology is the scientific study of mental processes, including perception, thought, memory, and reasoning. It explores how people acquire, process, and store information.\n\n## ⭐⭐⭐ Key Concept: Working Memory Model\n* **Definition**: A multi-component system responsible for active maintenance and manipulation of information in short-term storage.\n* **Explanation**: Proposed by Baddeley and Hitch, it replaces the concept of a unitary short-term memory with a system containing a central executive, phonological loop, visuospatial sketchpad, and episodic buffer.\n\n## ⭐⭐ Sensory Registers\n* **Definition**: Initial structural components that hold sensory information for extremely brief durations.\n* **Explanation**: Includes iconic memory (visual stimuli, <1s) and echoic memory (auditory stimuli, 3-4s).`,
        revisionPoints: [
          "Working Memory: Active system that manipulates and retains information during tasks.",
          "Central Executive: Controls attention allocation and coordinates sub-systems.",
          "Phonological Loop: Processes auditory and spoken language elements.",
          "Visuospatial Sketchpad: Handles visual imagery and spatial layout details."
        ],
        questions: {
          short: ["Differentiate between iconic and echoic memory.", "State the capacity limits of short-term storage."],
          long: ["Explain Baddeley's Working Memory Model in detail, drawing the functional links between all four components."],
          diagram: ""
        },
        diagram: {
          type: "flowchart",
          data: "graph TD\n A[Central Executive] --> B[Phonological Loop]\n A --> C[Episodic Buffer]\n A --> D[Visuospatial Sketchpad]\n B --> E[Long-Term Memory]\n C --> E\n D --> E"
        },
        charts: [
          {
            type: "bar",
            title: "Memory System Durations",
            data: [
              { name: "Iconic", value: 1 },
              { name: "Echoic", value: 4 },
              { name: "Short-Term", value: 30 },
              { name: "Long-Term", value: 100 }
            ]
          }
        ]
      })
    },
    {
      _id: 'default-2',
      topic: 'Constitutional Law',
      academicLevel: '15 Cases',
      classLevel: '15 Cases',
      examType: 'Case Study',
      timeLabel: '2h ago',
      desc: 'Detailed analysis of separation of powers and civil liberties cases.',
      gradient: 'from-amber-950/60 via-orange-950/40 to-yellow-900/60',
      content: JSON.stringify({
        subTopics: {
          "⭐": ["Separation of Powers Principles", "Supreme Court Mandates"],
          "⭐⭐": ["First Amendment Rulings", "Due Process Foundations"],
          "⭐⭐⭐": ["Federalism & State Sovereignty", "Executive Privileges & Checks"]
        },
        importance: "⭐⭐",
        notes: `# Constitutional Law\n\nConstitutional law represents the fundamental framework of governance, balancing state power, individual civil liberties, and statutory checks across executive and judicial branches.\n\n## ⭐⭐⭐ Core Principle: Separation of Powers\n* **Definition**: The division of governmental responsibilities into distinct branches to limit any branch from exercising the core functions of another.\n* **Explanation**: System of checks and balances where Executive (enforces), Legislative (creates), and Judicial (interprets) branches remain separate but mutually accountable.`,
        revisionPoints: [
          "Judicial Review: The power of courts to declare legislative or executive actions unconstitutional.",
          "Marbury v. Madison (1803): Established the legal principle of judicial review in the United States.",
          "Federalism: Separation of authority between national (federal) and local state governments."
        ],
        questions: {
          short: ["What was the primary constitutional precedent in Marbury v. Madison?"],
          long: ["Discuss separation of powers under the constitutional checks and balances model, citing historical case law precedents."],
          diagram: ""
        },
        diagram: {
          type: "process",
          data: "graph TD\n A[Legislative: Enacts Bills] --> B[Executive: Signs or Vetoes]\n B --> C[Judicial: Reviews Constitutional Validity]\n C --> A"
        },
        charts: []
      })
    },
    {
      _id: 'default-3',
      topic: 'Quantum Mechanics',
      academicLevel: '22 Equations',
      classLevel: '22 Equations',
      examType: 'Notes',
      timeLabel: 'Yesterday',
      desc: 'Probability densities, wave functions, and the Schrödinger equation.',
      gradient: 'from-blue-950/60 via-cyan-950/40 to-emerald-950/60',
      content: JSON.stringify({
        subTopics: {
          "⭐": ["Schrödinger Wave Equation", "Wave-Particle Duality"],
          "⭐⭐": ["Probability Densities", "Quantum Tunneling Models"],
          "⭐⭐⭐": ["Heisenberg Uncertainty Principle", "Hilbert Vector Spaces"]
        },
        importance: "⭐⭐⭐",
        notes: `# Quantum Mechanics\n\nQuantum mechanics is the branch of physics that describes the behavior of matter and light at the atomic and subatomic scale, where classical Newtonian physics ceases to operate.\n\n## ⭐⭐⭐ Key Formulation: Schrödinger Equation\n* **Definition**: A mathematical equation that describes the changes over time of a physical system in which quantum effects are significant.\n* **Explanation**: The wave function represents the probability amplitude for the state of a subatomic system, and its absolute square yields the physical probability density.`,
        revisionPoints: [
          "Uncertainty Principle: It is impossible to simultaneously measure position and momentum with absolute precision.",
          "Wave-Particle Duality: Light and subatomic particles display both wave-like and particle-like characteristics.",
          "Quantum Superposition: A system resides in multiple states simultaneously until a physical measurement occurs."
        ],
        questions: {
          short: ["State the Heisenberg Uncertainty Principle."],
          long: ["Derive the Schrödinger wave function and discuss its physical interpretation under the Born rule."],
          diagram: ""
        },
        diagram: {
          type: "graph",
          data: "graph TD\n A[Schrödinger Wave Equation] --> B[Wave Function Solutions]\n B --> C[Absolute Square Born Rule]\n C --> D[Physical Probability Density Map]"
        },
        charts: [
          {
            type: "line",
            title: "Probability Distribution (n=1 State)",
            data: [
              { name: "Node x=0", value: 0 },
              { name: "Midpoint", value: 100 },
              { name: "Node x=L", value: 0 }
            ]
          }
        ]
      })
    }
  ];

  // Merge live generated notes with mock templates to guarantee a gorgeous dashboard populate
  const mergedRecentNotes = [
    ...recentNotes.map((n, idx) => ({
      _id: n._id,
      topic: n.topic,
      academicLevel: n.academicLevel || 'General',
      classLevel: n.classLevel || 'Undergraduate',
      examType: n.examType || 'Final Term',
      timeLabel: idx === 0 ? '12m ago' : idx === 1 ? '1h ago' : 'Recently',
      desc: `Comprehensive AI study notes compiled for ${n.topic}.`,
      gradient: idx % 3 === 0 
        ? 'from-purple-900/60 via-indigo-900/40 to-fuchsia-950/60'
        : idx % 3 === 1
          ? 'from-amber-950/60 via-orange-950/40 to-yellow-900/60'
          : 'from-blue-950/60 via-cyan-950/40 to-emerald-950/60',
      content: n.content
    })),
    ...defaultRecentNotes
  ].slice(0, 3);

  if (loading) {
    return <LoadingAnimation />;
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setResult(null)} className="mb-2 text-gray-400 hover:text-white flex items-center gap-2">
          &larr; Generate another topic
        </Button>
        <NotesDashboard
          content={result.content}
          topic={result.topic}
          onDeeperDive={(deeperTopic) => {
            setResult(null);
            setTopic(deeperTopic);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 pb-16 font-sans">
      {/* Stripe Payment Success Banner */}
      <AnimatePresence>
        {showSuccessBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="bg-emerald-950/60 border border-emerald-500/25 rounded-2xl p-4 flex items-center gap-4 text-emerald-350 shadow-md shadow-emerald-900/10 overflow-hidden"
          >
            <div className="bg-emerald-500 p-2 rounded-xl text-white shrink-0 shadow">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Payment Successful!</p>
              <p className="text-xs text-emerald-450 font-semibold mt-0.5">Your credit balance has been topped up successfully. Start generating notes now!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generation Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="bg-rose-950/60 border border-rose-500/25 rounded-2xl p-4.5 flex items-center gap-4 text-rose-355 shadow-md shadow-rose-900/10 overflow-hidden"
          >
            <div className="bg-rose-500 p-2 rounded-xl text-white shrink-0 shadow">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Action Blocked</p>
              <p className="text-xs text-rose-450 font-semibold mt-0.5">{error}</p>
            </div>
            <Button 
              variant="ghost" 
              className="text-rose-400 hover:bg-rose-900/30 hover:text-rose-300 h-8 rounded-lg text-xs" 
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Welcome Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Welcome back, Mahboob <span className="inline-block animate-waveOrigin">👋</span>
          </h1>
          <p className="text-gray-400 text-xs md:text-sm mt-2 font-medium">
            Ready to transform your study materials today?
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${streak > 0 ? 'bg-[#2b161c] border-[#f43f5e]/25 text-[#f43f5e]' : 'bg-[#1e2332] border-white/5 text-gray-400'} border rounded-xl px-4 py-2 text-xs md:text-sm font-extrabold flex items-center gap-2 shadow-sm shrink-0`}
        >
          <span>{streak} day streak {streak > 0 ? '🔥' : '🧊'}</span>
        </motion.div>
      </div>

      {/* 4-Column Stats Row */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'NOTES GENERATED', value: notesCount.toString(), color: 'text-white' },
          { label: 'CREDITS REMAINING', value: credits !== null ? credits.toString() : '...', color: 'text-[#c0c1ff]' },
          { label: 'DIAGRAMS GENERATED', value: diagramsCount.toString(), color: 'text-[#4edea3]' },
          { label: 'DOCS CONVERTED', value: docsCount.toString(), color: 'text-[#8083ff]' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#131b2e] border border-white/5 shadow-sm rounded-2xl p-5 text-center flex flex-col justify-center items-center h-28">
            <span className="text-[9px] font-extrabold text-[#908fa0] uppercase tracking-widest block select-none">
              {stat.label}
            </span>
            <span className={`text-3xl font-extrabold mt-1.5 leading-none ${stat.color}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Main Generation Workspace Center Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="glass-container rounded-3xl p-6 md:p-10 relative overflow-hidden shadow-2xl">
          {/* Subtle neon glowing orb */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />
          
          <div className="flex flex-col items-center text-center">
            {/* Engine v4.0 Badge */}
            {/* Engine v4.0 Badge */}
            <span className="bg-[#222a3d] border border-white/5 text-[#c0c1ff] text-[9px] font-extrabold uppercase tracking-widest py-1.5 px-4 rounded-full mb-4 shadow flex items-center gap-1.5 w-max mx-auto select-none">
              <Sparkles className="w-3 h-3 text-indigo-400" /> AI Notes Generator
            </span>
            
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-3">
              What do you want to learn today?
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl mx-auto mb-8 font-medium">
              Describe any topic, concept, chapter, subject, skill, exam preparation goal, or learning objective and AI will create personalized study notes.
            </p>

            {/* Empty State Examples (Visible only when topic is empty) */}
            {!topic && (
              <div className="w-full max-w-4xl mb-6 flex flex-wrap justify-center gap-2">
                {[
                  "Create final exam notes on Human Resource Management",
                  "Explain Object Oriented Programming with examples",
                  "Generate revision notes for Operating Systems",
                  "Teach me React Hooks from beginner to advanced",
                  "Create study notes for Data Structures"
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setTopic(example)}
                    className="text-[10px] text-gray-500 bg-[#171f33]/40 hover:bg-[#171f33] hover:text-gray-300 border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleGenerate} className="w-full max-w-4xl space-y-6 text-left relative">
              
              {/* Textarea Area */}
              <div className="relative group">
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Create complete final exam notes on Human Resource Management..."
                  disabled={credits !== null && credits <= 0 || loading}
                  className="w-full h-36 md:h-44 bg-[#0b1326]/80 backdrop-blur-xl border border-white/10 text-white placeholder-gray-500 focus:bg-[#0b1326] focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all rounded-2xl p-5 text-sm md:text-base font-medium resize-none shadow-inner leading-relaxed"
                />
                
                {/* Upload Section */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".pdf,.docx,.txt" 
                    className="hidden" 
                  />
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Study Material
                    </button>
                    {fileName && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md flex items-center gap-1 border border-indigo-500/30">
                        <FileText className="w-3 h-3" />
                        {fileName}
                        <button type="button" onClick={removeFile} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium hidden md:block uppercase tracking-wider">
                    Optional: PDF, DOCX, TXT
                  </div>
                </div>
              </div>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { icon: "🔥", label: "Final Exam Notes" },
                  { icon: "⚡", label: "Quick Revision" },
                  { icon: "📚", label: "Detailed Notes" },
                  { icon: "🎯", label: "Important Questions" },
                  { icon: "🧠", label: "Concept Explanation" },
                  { icon: "📋", label: "Study Guide" },
                  { icon: "📖", label: "Beginner Friendly" },
                  { icon: "🚀", label: "Advanced Learning" },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!topic.includes(chip.label)) {
                        setTopic(prev => prev ? `${prev.trim()} (${chip.label})` : `Create ${chip.label.toLowerCase()} about `);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-[#171f33]/40 hover:bg-[#1f2940] hover:border-indigo-500/30 transition-colors text-xs font-semibold text-gray-400 hover:text-white shadow-sm"
                  >
                    <span>{chip.icon}</span>
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Advanced Settings Collapsible */}
              <div className="border border-white/5 rounded-2xl bg-[#0b1326]/50 overflow-hidden transition-all duration-300">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors focus:outline-none"
                >
                  <span className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-indigo-400" />
                    Advanced Settings <span className="text-[10px] text-gray-500 font-medium ml-1 tracking-wider uppercase">(Optional)</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isSettingsOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isSettingsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Output Length</label>
                          <select value={outputLength} onChange={(e) => setOutputLength(e.target.value)} className="w-full h-11 bg-[#171f33] border border-white/10 text-white rounded-xl px-4 text-xs font-semibold focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all outline-none appearance-none cursor-pointer">
                            <option value="Short">Short (Summary)</option>
                            <option value="Medium">Medium (Standard)</option>
                            <option value="Detailed">Detailed (Comprehensive)</option>
                          </select>
                        </div>
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Language</label>
                          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full h-11 bg-[#171f33] border border-white/10 text-white rounded-xl px-4 text-xs font-semibold focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all outline-none appearance-none cursor-pointer">
                            <option value="English">English</option>
                            <option value="Urdu">Urdu</option>
                            <option value="Mixed">Mixed (English/Urdu)</option>
                          </select>
                        </div>
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Learning Style</label>
                          <select value={learningStyle} onChange={(e) => setLearningStyle(e.target.value)} className="w-full h-11 bg-[#171f33] border border-white/10 text-white rounded-xl px-4 text-xs font-semibold focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all outline-none appearance-none cursor-pointer">
                            <option value="Academic">Academic / Formal</option>
                            <option value="Practical">Practical / Applied</option>
                            <option value="Beginner Friendly">Beginner Friendly / Simple</option>
                            <option value="Exam Focused">Exam Focused / Cramming</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generation Modes (Cards) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div onClick={() => setRevisionMode(!revisionMode)} className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col gap-3 ${revisionMode ? 'bg-indigo-500/10 border-indigo-500/50 shadow-inner' : 'bg-[#171f33]/40 border-white/5 hover:border-white/10 hover:bg-[#171f33]/60'}`}>
                  <div className="flex items-center justify-between">
                    <Zap className={`w-5 h-5 ${revisionMode ? 'text-indigo-400' : 'text-gray-500'}`} />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${revisionMode ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                      {revisionMode && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${revisionMode ? 'text-white' : 'text-gray-300'}`}>Revision Mode</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-tight font-medium">Create concise exam-focused notes.</p>
                  </div>
                </div>

                <div onClick={() => setIncludeDiagram(!includeDiagram)} className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col gap-3 ${includeDiagram ? 'bg-indigo-500/10 border-indigo-500/50 shadow-inner' : 'bg-[#171f33]/40 border-white/5 hover:border-white/10 hover:bg-[#171f33]/60'}`}>
                  <div className="flex items-center justify-between">
                    <LayoutTemplate className={`w-5 h-5 ${includeDiagram ? 'text-indigo-400' : 'text-gray-500'}`} />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${includeDiagram ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                      {includeDiagram && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${includeDiagram ? 'text-white' : 'text-gray-300'}`}>Include Diagrams</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-tight font-medium">Generate visual diagrams and flowcharts.</p>
                  </div>
                </div>

                <div onClick={() => setIncludeChart(!includeChart)} className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col gap-3 ${includeChart ? 'bg-indigo-500/10 border-indigo-500/50 shadow-inner' : 'bg-[#171f33]/40 border-white/5 hover:border-white/10 hover:bg-[#171f33]/60'}`}>
                  <div className="flex items-center justify-between">
                    <BarChart2 className={`w-5 h-5 ${includeChart ? 'text-indigo-400' : 'text-gray-500'}`} />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${includeChart ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                      {includeChart && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${includeChart ? 'text-white' : 'text-gray-300'}`}>Include Charts</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-tight font-medium">Generate charts and visual learning aids.</p>
                  </div>
                </div>

                <div onClick={() => setQuickSheet(!quickSheet)} className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col gap-3 ${quickSheet ? 'bg-indigo-500/10 border-indigo-500/50 shadow-inner' : 'bg-[#171f33]/40 border-white/5 hover:border-white/10 hover:bg-[#171f33]/60'}`}>
                  <div className="flex items-center justify-between">
                    <FileText className={`w-5 h-5 ${quickSheet ? 'text-indigo-400' : 'text-gray-500'}`} />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${quickSheet ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                      {quickSheet && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${quickSheet ? 'text-white' : 'text-gray-300'}`}>Quick Sheet</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-tight font-medium">Generate a one-page revision summary.</p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={!topic || (credits !== null && credits <= 0) || loading} 
                className="w-full h-14 text-sm font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all duration-200 rounded-2xl mt-4 flex items-center justify-center gap-2 text-white border-0"
              >
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                    {loadingMessages[loadingStep]}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Notes
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </motion.div>

      {/* Recent Topics Grid Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 select-none">
            Recent Topics
          </h2>
          <span 
            onClick={() => navigate('/notes')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            View All Library
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {mergedRecentNotes.map((note) => (
            <div 
              key={note._id} 
              onClick={() => setResult({ content: note.content, topic: note.topic })}
              className="border border-white/5 bg-[#131b2e] rounded-2xl overflow-hidden hover:border-indigo-500/35 hover:shadow-lg hover:shadow-indigo-500/2 transition-all duration-300 cursor-pointer flex flex-col justify-between group h-80"
            >
              {/* Top half: Abstract mesh gradient header */}
              <div className={`h-[155px] w-full bg-gradient-to-tr ${note.gradient} flex items-center justify-center relative shadow-inner`}>
                {/* Glowing neon sphere overlay */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <BookOpen className="w-10 h-10 text-white/20 group-hover:scale-110 transition-transform duration-300" />
                
                {/* Relative timestamp badge */}
                <span className="absolute top-3.5 right-3.5 px-2.5 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest shadow">
                  {note.timeLabel}
                </span>
              </div>

              {/* Bottom half: Topic content */}
              <div className="p-5 flex-1 flex flex-col justify-between text-left">
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-sm text-white leading-tight truncate group-hover:text-indigo-350 transition-colors">
                    {note.topic}
                  </h3>
                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed leading-normal">
                    {note.desc}
                  </p>
                </div>

                {/* Badge tags at the bottom */}
                <div className="flex gap-2 items-center mt-3">
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-[9px] font-extrabold uppercase tracking-widest">
                    {note.classLevel}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[9px] font-extrabold uppercase tracking-widest">
                    {note.examType}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-500 font-semibold gap-4 select-none">
        <div>
          <span>© 2026 ExamNotes AI. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap gap-5">
          <a href="/privacy" className="hover:text-gray-300 cursor-pointer transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-gray-300 cursor-pointer transition-colors">Terms of Service</a>
          <a href="/support" className="hover:text-gray-300 cursor-pointer transition-colors">Contact Support</a>
          <a href="/api-docs" className="hover:text-gray-300 cursor-pointer transition-colors">API Documentation</a>
        </div>
      </footer>
    </div>
  );
}
