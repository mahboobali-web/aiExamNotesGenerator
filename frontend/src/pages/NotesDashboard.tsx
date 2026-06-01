import { useState } from 'react';
import {
  PieChart,
  Zap,
  Image,
  ChevronDown,
  Sparkles,
  Target,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  LineChart as RechartsLine,
  Line
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// Resilient sequential Mermaid flowchart parser for premium visual roadmaps
const parseMermaid = (mermaidData: string) => {
  const nodes: { id: string; label: string }[] = [];
  if (!mermaidData) return nodes;

  const lines = mermaidData.split('\n');
  const nodesMap = new Map<string, string>();

  // Matches node definitions like ID[Label Text] or ID["Label Text"]
  const nodeRegex = /([a-zA-Z0-9_]+)\s*\["?(.*?)"?\]/g;

  for (const line of lines) {
    let match;
    nodeRegex.lastIndex = 0;
    while ((match = nodeRegex.exec(line)) !== null) {
      // Remove any trailing loose characters inside brackets if any
      let cleanLabel = match[2].trim();
      nodesMap.set(match[1], cleanLabel);
    }
  }

  for (const [id, label] of nodesMap.entries()) {
    nodes.push({ id, label });
  }

  return nodes;
};

interface NotesDashboardProps {
  content: string;
  topic: string;
  onDeeperDive?: (deeperTopic: string) => void;
}

export default function NotesDashboard({ content, topic, onDeeperDive }: NotesDashboardProps) {
  const [activeTab, setActiveTab] = useState('comprehensive');

  // Helper to safely render strings even if the AI accidentally generates objects
  const renderTextElement = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
      return item.title 
        ? `${item.title}${item.content ? `: ${item.content}` : ''}${item.description ? `: ${item.description}` : ''}`
        : JSON.stringify(item);
    }
    return String(item);
  };

  // Safe JSON Parsing with strict JSON keys fallback, markdown code fence stripping, and automatic syntax healing
  let parsed: any = null;
  try {
    if (content) {
      let cleanContent = content.trim();

      // Strip markdown code fences if present (e.g. ```json ... ```)
      if (cleanContent.startsWith('```')) {
        const lines = cleanContent.split('\n');
        if (lines[0].startsWith('```')) {
          lines.shift();
        }
        if (lines[lines.length - 1].startsWith('```')) {
          lines.pop();
        }
        cleanContent = lines.join('\n').trim();
      }

      // Automatic Syntax Healing for loose letters/typos before array/object closures (e.g. "Ethical Considerations" f])
      cleanContent = cleanContent
        .replace(/"\s+f\s*\]/g, '"]')       // heals loose "f]" array closure typos
        .replace(/"\s+[a-zA-Z]\s*\]/g, '"]') // heals general "letter]" typos
        .replace(/,\s*\]/g, ']')             // removes trailing commas in arrays
        .replace(/,\s*\}/g, '}');            // removes trailing commas in objects

      parsed = JSON.parse(cleanContent);
    }
  } catch (err) {
    console.error('Failed to parse notes content as JSON:', err);
  }

  // Populate formatted object matching buildPrompt specifications
  const data = parsed || {
    subTopics: {
      "⭐": ["Definitions & Core concepts", "Historical Context of " + topic],
      "⭐⭐": ["Core Methodologies", "Standard System Architecture"],
      "⭐⭐⭐": ["Practice Questions", "Formula Applications & Calculations"]
    },
    importance: "⭐⭐⭐",
    notes: content || `# ${topic}\n\nRevision notes content.`,
    revisionPoints: [
      `Definitions and foundational principles for ${topic}`,
      "Key formulas and structural components",
      "Core exam-oriented definitions and revision keywords"
    ],
    questions: {
      short: [`Explain the base significance of ${topic}.`, `List the primary parts of this topic.`],
      long: [`Provide a detailed architectural breakdown and process flow mapping for ${topic}.`],
      diagram: ""
    },
    diagram: {
      type: "flowchart",
      data: ""
    },
    charts: []
  };

  // Compute exam readiness dynamically or from importance stars
  const examReadiness = typeof data.readinessValue === 'number'
    ? data.readinessValue
    : (() => {
        const stars = ((data.importance || '⭐⭐⭐').match(/⭐/g) || []).length;
        if (stars >= 3) return 92;
        if (stars >= 2) return 78;
        return 65;
      })();

  // Collect core subtopics from highest priority tier
  const coreSubtopics = (
    data.subTopics['⭐⭐⭐'] || data.subTopics['⭐⭐'] || data.subTopics['⭐'] || []
  ).slice(0, 5);

  // Derive exam tip from revision points
  const examTip = data.revisionPoints?.[0]
    || `Focus on the key concepts, exam-oriented definitions, and critical distinctions for ${topic}.`;

  // SVG circular progress math
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - examReadiness / 100);

  const tabs = [
    { id: 'comprehensive', label: 'Comprehensive Notes' },
    { id: 'revision', label: 'Quick Revision' },
    { id: 'diagrams', label: 'Diagrams' },
    { id: 'charts', label: 'Interactive Charts' },
  ];

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-6" id="notes-content-container">

      {/* ─── Tab Navigation ─── */}
      <div className="flex items-center gap-1 sm:gap-5 border-b border-white/5 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3.5 pt-1 text-[13px] font-medium transition-all relative whitespace-nowrap px-1 ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ─── 2-Column Layout: Sidebar + Content ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

        {/* ──────── LEFT SIDEBAR ──────── */}
        <aside className="lg:col-span-1 space-y-5 lg:sticky lg:top-4">

          {/* Priority View Card */}
          <div className="rounded-2xl bg-[#131b2e] border border-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
                Priority View
              </span>
            </div>

            {/* Circular Progress Ring */}
            <div className="flex items-center justify-center py-3">
              <svg className="w-[120px] h-[120px]" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="7"
                />
                <circle
                  cx="50" cy="50" r={radius}
                  fill="none"
                  stroke="url(#progressGrad)"
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                />
                <defs>
                  <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4edea3" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <text
                  x="50" y="47"
                  textAnchor="middle"
                  fill="white"
                  style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Geist, sans-serif' }}
                >
                  {examReadiness}%
                </text>
                <text
                  x="50" y="62"
                  textAnchor="middle"
                  fill="#9ca3af"
                  style={{ fontSize: '8px', fontWeight: 500, letterSpacing: '0.06em' }}
                >
                  Exam Readiness
                </text>
              </svg>
            </div>

            {/* Confidence Level Bar */}
            <div className="space-y-2 mt-1">
              <span className="text-[11px] text-gray-500 font-medium">Confidence Level</span>
              <div className="w-full h-[5px] rounded-full bg-white/[0.04]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${examReadiness}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400"
                />
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-2.5 py-[5px] rounded-md bg-rose-500/10 text-rose-400 text-[9px] font-bold uppercase tracking-widest">
                High Recall
              </span>
              <span className="px-2.5 py-[5px] rounded-md bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase tracking-widest">
                AI Optimized
              </span>
            </div>
          </div>

          {/* Core Subtopics Card */}
          <div className="rounded-2xl bg-[#131b2e] border border-white/[0.06] p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-500" />
              Core Subtopics
            </h3>
            <div className="space-y-1">
              {coreSubtopics.map((subtopic: string, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 text-[10px] font-bold shrink-0 border border-teal-500/[0.08]">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <span className="text-[13px] text-gray-300 font-medium leading-snug">
                    {subtopic}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Exam Tips Card */}
          <div className="rounded-2xl bg-[#131b2e] border border-white/[0.06] p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-500" />
              Exam Tips
            </h3>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[13px] text-gray-400 italic leading-relaxed">
                &ldquo;{examTip}&rdquo;
              </p>
            </div>
          </div>
        </aside>

        {/* ──────── MAIN CONTENT AREA ──────── */}
        <main className="lg:col-span-3 min-w-0">
          <AnimatePresence mode="wait">

            {/* ━━━ COMPREHENSIVE NOTES TAB ━━━ */}
            {activeTab === 'comprehensive' && (
              <motion.div
                key="comprehensive"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-0"
              >
                {/* Dark-themed Markdown Renderer */}
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => (
                      <h1
                        className="text-[26px] font-bold text-white border-b border-white/[0.06] pb-4 mb-6 mt-10 first:mt-0 tracking-tight leading-tight"
                        {...props}
                      />
                    ),
                    h2: ({node, ...props}) => (
                      <h2
                        className="text-[20px] font-semibold text-white mb-4 mt-10 pb-2 leading-snug"
                        {...props}
                      />
                    ),
                    h3: ({node, ...props}) => (
                      <h3
                        className="text-base font-semibold text-gray-200 mb-3 mt-7"
                        {...props}
                      />
                    ),
                    p: ({node, ...props}) => (
                      <p
                        className="text-[15px] text-gray-400 leading-[1.8] mb-5"
                        {...props}
                      />
                    ),
                    ul: ({node, ...props}) => (
                      <ul
                        className="list-disc pl-5 mb-5 space-y-2 text-gray-400 text-[15px]"
                        {...props}
                      />
                    ),
                    ol: ({node, ...props}) => (
                      <ol
                        className="list-decimal pl-5 mb-5 space-y-2 text-gray-400 text-[15px]"
                        {...props}
                      />
                    ),
                    li: ({node, ...props}) => (
                      <li className="leading-relaxed pl-1" {...props} />
                    ),
                    code: ({node, inline, className, children, ...props}: any) => (
                      <code
                        className="bg-white/[0.04] text-indigo-400 font-mono text-[13px] px-1.5 py-0.5 rounded border border-white/[0.06]"
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                    blockquote: ({node, ...props}) => (
                      <blockquote
                        className="border-l-[3px] border-indigo-500/50 pl-5 py-3 my-6 text-gray-400 bg-indigo-500/[0.03] rounded-r-xl pr-5"
                        {...props}
                      />
                    ),
                    strong: ({node, ...props}) => (
                      <strong className="font-semibold text-gray-200" {...props} />
                    ),
                    em: ({node, ...props}) => (
                      <em className="text-gray-300" {...props} />
                    ),
                    a: ({node, ...props}) => (
                      <a
                        className="text-teal-400 hover:text-teal-300 transition-colors underline decoration-teal-500/30 underline-offset-2"
                        {...props}
                      />
                    ),
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-6 border border-white/[0.06] rounded-2xl">
                        <table className="min-w-full divide-y divide-white/[0.06]" {...props} />
                      </div>
                    ),
                    thead: ({node, ...props}) => (
                      <thead className="bg-white/[0.02]" {...props} />
                    ),
                    th: ({node, ...props}) => (
                      <th
                        className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider"
                        {...props}
                      />
                    ),
                    tbody: ({node, ...props}) => (
                      <tbody className="divide-y divide-white/[0.04]" {...props} />
                    ),
                    tr: ({node, ...props}) => (
                      <tr className="hover:bg-white/[0.02] transition-colors" {...props} />
                    ),
                    td: ({node, ...props}) => (
                      <td className="px-4 py-3 text-[13px] text-gray-400 font-medium" {...props} />
                    ),
                    hr: ({node, ...props}) => (
                      <hr className="my-10 border-white/[0.06]" {...props} />
                    ),
                  }}
                >
                  {data.notes}
                </ReactMarkdown>

                {/* AI-Generated Synthesis Card */}
                <div className="mt-10 p-6 rounded-2xl bg-[#131b2e] border border-violet-500/[0.12] relative overflow-hidden">
                  {/* Subtle shimmer glow */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[15px] font-bold text-violet-400">
                      AI-Generated Synthesis
                    </h4>
                    <Sparkles className="w-5 h-5 text-violet-400/30" />
                  </div>
                  <p className="text-[14px] text-gray-400 leading-relaxed">
                    {(data.revisionPoints && Array.isArray(data.revisionPoints))
                      ? data.revisionPoints.slice(0, 2).map(renderTextElement).join('. ')
                      : `Comprehensive synthesis of ${topic} covering key concepts, critical formulas, and exam-focused insights.`}
                  </p>
                  <button
                    onClick={() => {
                      const topicPhrase = topic.split(/[\s:,]+/).slice(0, 3).join(' ');
                      onDeeperDive?.(`Detailed deep dive on ${topicPhrase}`);
                    }}
                    className="mt-4 text-[14px] text-teal-400 font-medium flex items-center gap-1.5 hover:text-teal-300 transition-colors group bg-transparent border-0 cursor-pointer p-0"
                  >
                    Generate deeper dive on {topic.split(/[\s:,]+/).slice(0, 3).join(' ')}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ━━━ QUICK REVISION TAB ━━━ */}
            {activeTab === 'revision' && (
              <motion.div
                key="revision"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Revision Summary */}
                <div className="p-6 rounded-2xl bg-[#131b2e] border border-amber-500/[0.1] space-y-5">
                  <h4 className="font-bold text-base text-amber-400 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Quick Exam Summary
                  </h4>
                  <ul className="text-[15px] text-gray-300 leading-relaxed list-disc pl-5 space-y-4">
                    {Array.isArray(data.revisionPoints) && data.revisionPoints.map((point: any, i: number) => (
                      <li key={i} className="font-medium">{renderTextElement(point)}</li>
                    ))}
                  </ul>
                </div>

                {/* Important Questions */}
                {data.questions?.short && data.questions.short.length > 0 && (
                  <div className="p-5 rounded-2xl bg-[#131b2e] border border-white/[0.06] space-y-3">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
                      Short Questions
                    </span>
                    <ul className="text-[14px] text-gray-400 leading-relaxed list-disc pl-5 space-y-2.5">
                      {Array.isArray(data.questions.short) && data.questions.short.map((q: any, i: number) => (
                        <li key={i} className="font-medium">{renderTextElement(q)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.questions?.long && data.questions.long.length > 0 && (
                  <div className="p-5 rounded-2xl bg-[#131b2e] border border-white/[0.06] space-y-3">
                    <span className="text-[11px] font-bold text-violet-400 uppercase tracking-widest">
                      Long Questions
                    </span>
                    <ul className="text-[14px] text-gray-400 leading-relaxed list-disc pl-5 space-y-2.5">
                      {Array.isArray(data.questions.long) && data.questions.long.map((q: any, i: number) => (
                        <li key={i} className="font-medium">{renderTextElement(q)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sub Topics by Priority */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block px-1">
                    ⭐ Sub Topics by Priority
                  </span>

                  {data.subTopics["⭐"] && data.subTopics["⭐"].length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/[0.08]">
                      <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2.5">
                        ⭐ Standard Priority
                      </h4>
                      <ul className="text-[13px] text-gray-400 leading-relaxed list-disc pl-4 space-y-1.5">
                        {Array.isArray(data.subTopics["⭐"]) && data.subTopics["⭐"].map((item: any, i: number) => (
                          <li key={i}>{renderTextElement(item)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {data.subTopics["⭐⭐"] && data.subTopics["⭐⭐"].length > 0 && (
                    <div className="p-4 rounded-2xl bg-orange-500/[0.04] border border-orange-500/[0.08]">
                      <h4 className="text-xs font-bold text-orange-400 flex items-center gap-1.5 mb-2.5">
                        ⭐⭐ High Priority
                      </h4>
                      <ul className="text-[13px] text-gray-400 leading-relaxed list-disc pl-4 space-y-1.5">
                        {Array.isArray(data.subTopics["⭐⭐"]) && data.subTopics["⭐⭐"].map((item: any, i: number) => (
                          <li key={i}>{renderTextElement(item)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {data.subTopics["⭐⭐⭐"] && data.subTopics["⭐⭐⭐"].length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-500/[0.04] border border-rose-500/[0.08]">
                      <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 mb-2.5">
                        ⭐⭐⭐ Critical Priority
                      </h4>
                      <ul className="text-[13px] text-gray-400 leading-relaxed list-disc pl-4 space-y-1.5">
                        {Array.isArray(data.subTopics["⭐⭐⭐"]) && data.subTopics["⭐⭐⭐"].map((item: any, i: number) => (
                          <li key={i}>{renderTextElement(item)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ━━━ DIAGRAMS TAB ━━━ */}
            {activeTab === 'diagrams' && (
              <motion.div
                key="diagrams"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {data.diagram?.data ? (() => {
                  const flowchartNodes = parseMermaid(data.diagram.data);
                  return (
                    <div className="space-y-5">
                      <h4 className="font-bold text-base text-white flex items-center gap-2">
                        <Image className="w-5 h-5 text-sky-400" />
                        Process Flowchart
                      </h4>

                      {flowchartNodes.length > 0 ? (
                        <div className="p-6 rounded-2xl bg-[#131b2e] border border-white/[0.06] flex flex-col items-center gap-2 max-w-xl mx-auto">
                          {flowchartNodes.map((node, index) => (
                            <div key={node.id} className="w-full flex flex-col items-center">
                              <motion.div
                                whileHover={{ scale: 1.015, y: -1 }}
                                className="w-full bg-[#171f33] p-4 rounded-xl border border-white/[0.06] flex items-center gap-4 hover:border-indigo-500/20 hover:shadow-lg transition-all duration-200"
                              >
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 border border-indigo-500/[0.08]">
                                  {index + 1}
                                </div>
                                <div className="text-left">
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                    Step {index + 1}
                                  </p>
                                  <p className="text-sm font-medium text-gray-300 leading-snug">
                                    {node.label}
                                  </p>
                                </div>
                              </motion.div>

                              {index < flowchartNodes.length - 1 && (
                                <div className="py-2 flex flex-col items-center shrink-0">
                                  <div className="w-[2px] h-5 bg-gradient-to-b from-indigo-500/50 to-violet-500/50 rounded-full" />
                                  <ChevronDown className="w-4 h-4 text-indigo-400 -mt-1.5 animate-pulse" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-5 rounded-2xl bg-[#131b2e] border border-white/[0.06]">
                          <pre className="text-xs font-mono text-sky-400 bg-[#0b1326] p-4 rounded-xl border border-white/[0.06] w-full overflow-x-auto">
                            {data.diagram.data}
                          </pre>
                          <p className="text-[10px] text-gray-500 mt-2.5 font-medium text-center">
                            Rendered using valid exam-oriented Mermaid TD structures
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mb-4">
                      <Image className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-400 text-sm font-semibold">No diagrams available</p>
                    <p className="text-gray-600 text-xs mt-1.5 max-w-xs">
                      Enable diagrams when generating notes to see visual flowcharts and process maps
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ━━━ INTERACTIVE CHARTS TAB ━━━ */}
            {activeTab === 'charts' && (
              <motion.div
                key="charts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {data.charts && data.charts.length > 0 ? (
                  <div className="space-y-6">
                    <h4 className="font-bold text-base text-white flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-emerald-400" />
                      Statistical Weightage Distribution
                    </h4>

                    {data.charts.map((chart: any, cIdx: number) => {
                      const hasValidData = chart.data && chart.data.length > 0;
                      if (!hasValidData) return null;
                      return (
                        <div
                          key={cIdx}
                          className="p-5 rounded-2xl bg-[#131b2e] border border-white/[0.06] space-y-4"
                        >
                          <div className="text-center">
                            <h5 className="font-bold text-xs text-gray-400 uppercase tracking-wider">
                              {chart.title || "Topic Statistics"}
                            </h5>
                          </div>
                          <div className="h-[280px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              {chart.type === 'pie' ? (
                                <RechartsPie>
                                  <Pie
                                    data={chart.data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                  >
                                    {chart.data.map((_entry: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip
                                    contentStyle={{
                                      borderRadius: '12px',
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      background: '#171f33',
                                      color: '#dae2fd',
                                      fontSize: '12px',
                                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                                    }}
                                  />
                                  <Legend
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af' }}
                                  />
                                </RechartsPie>
                              ) : chart.type === 'line' ? (
                                <RechartsLine data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} />
                                  <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                                  <RechartsTooltip
                                    contentStyle={{
                                      borderRadius: '12px',
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      background: '#171f33',
                                      color: '#dae2fd',
                                      fontSize: '12px'
                                    }}
                                  />
                                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </RechartsLine>
                              ) : (
                                <RechartsBar data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} />
                                  <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                                  <RechartsTooltip
                                    contentStyle={{
                                      borderRadius: '12px',
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      background: '#171f33',
                                      color: '#dae2fd',
                                      fontSize: '12px'
                                    }}
                                  />
                                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {chart.data.map((_entry: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Bar>
                                </RechartsBar>
                              )}
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mb-4">
                      <PieChart className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-400 text-sm font-semibold">No charts available</p>
                    <p className="text-gray-600 text-xs mt-1.5 max-w-xs">
                      Enable charts when generating notes to see interactive statistical visualizations
                    </p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
