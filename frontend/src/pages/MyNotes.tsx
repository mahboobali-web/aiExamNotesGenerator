import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Search,
  Plus,
  BookOpen,
  ArrowLeft,
  Share2,
  Upload,
  Download,
  MoreVertical,
  ArrowRight,
  Calendar,
  GraduationCap,
  ChevronDown,
  Sparkles,
  Star,
  BarChart3,
  GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import NotesDashboard from './NotesDashboard';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Note {
  _id: string;
  topic: string;
  academicLevel: string;
  classLevel: string;
  examType: string;
  revisionMode: boolean;
  includeDiagram: boolean;
  includeChart: boolean;
  content: string;
  createdAt: string;
}

export default function MyNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotes();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
      const target = e.target as HTMLElement;
      if (!target.closest('.card-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await api.get('/notes');
      const fetchedNotes = response.data.notes;
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id: string, topic: string) => {
    if (window.confirm(`Are you sure you want to delete your notes for "${topic}"?`)) {
      try {
        await api.delete(`/notes/${id}`);
        setNotes((prev) => prev.filter((n) => n._id !== id));
      } catch (err) {
        console.error('Error deleting note:', err);
        alert('Failed to delete the study material. Please try again.');
      }
    }
  };

  // ─── Filtering & Sorting ───
  const filteredNotes = notes
    .filter((note) => note.topic.toLowerCase().includes(search.toLowerCase()))
    .filter((note) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'revision') return note.revisionMode;
      if (activeFilter === 'diagrams') return note.includeDiagram;
      if (activeFilter === 'charts') return note.includeChart;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'name') return a.topic.localeCompare(b.topic);
      return 0;
    });

  // ─── Helper Functions ───
  const getNoteDescription = (note: Note) => {
    try {
      const parsed = JSON.parse(note.content);
      if (parsed.notes) {
        const plain = parsed.notes
          .replace(/[#*`_]/g, '')
          .replace(/\[!.*?\]/g, '')
          .trim();
        return plain.slice(0, 100) + (plain.length > 100 ? '...' : '');
      }
    } catch (e) {
      // ignore
    }
    return `A comprehensive breakdown of ${note.topic.toLowerCase()}, covering key concepts and exam-critical insights...`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMins < 60) return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    } catch {
      return 'Generated';
    }
  };

  const getNoteTags = (note: Note) => {
    const tags: { label: string; variant: 'feature' | 'subject' }[] = [];
    if (note.revisionMode) tags.push({ label: 'Revision', variant: 'feature' });
    if (note.includeDiagram) tags.push({ label: 'Diagrams', variant: 'feature' });
    if (note.includeChart) tags.push({ label: 'Charts', variant: 'feature' });
    if (tags.length === 0) tags.push({ label: 'Notes', variant: 'feature' });
    if (note.examType) tags.push({ label: note.examType, variant: 'subject' });
    else if (note.classLevel) tags.push({ label: note.classLevel, variant: 'subject' });
    return tags;
  };

  const getNotePriority = (note: Note): 'high' | 'medium' | null => {
    try {
      const parsed = JSON.parse(note.content);
      if (parsed.importance) {
        const stars = (parsed.importance.match(/⭐/g) || []).length;
        if (stars >= 3) return 'high';
        if (stars >= 2) return 'medium';
      }
    } catch {}
    return null;
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('notes-content-container');
    if (!element || !selectedNote) return;
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0b1326' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${selectedNote.topic.replace(/\s+/g, '_')}_Notes.pdf`);
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'revision', label: 'Revision' },
    { id: 'diagrams', label: 'Diagrams' },
    { id: 'charts', label: 'Charts' },
  ];

  const sortOptions = [
    { id: 'recent', label: 'Recent' },
    { id: 'oldest', label: 'Oldest' },
    { id: 'name', label: 'Name' },
  ];

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 max-w-5xl mx-auto select-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-full border-4 border-white/5 border-t-indigo-500"
        />
        <p className="text-gray-400 text-sm font-semibold tracking-wide animate-pulse">
          Opening your study library...
        </p>
      </div>
    );
  }

  // ─── Empty State ───
  if (notes.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto space-y-8 py-6 pb-12 select-none">
        <div>
          <h1 className="text-[42px] font-extrabold tracking-tight text-white mb-2 leading-none" style={{ fontFamily: 'Geist, sans-serif' }}>
            My Library
          </h1>
          <p className="text-gray-400 text-[15px] font-medium mt-2">
            Manage and review your AI-enhanced study materials.
          </p>
        </div>
        <div className="border border-white/5 shadow-2xl p-16 text-center bg-[#131b2e]/60 backdrop-blur-md rounded-[20px]">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-extrabold text-white">No study notes found</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto mt-2.5 leading-relaxed font-medium">
            You haven't generated any study notes yet. Head over to the dashboard, type in any topic, and let the AI generate your first master notes!
          </p>
          <Button
            className="mt-8 bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 text-white font-bold rounded-xl h-12 px-8 shadow-lg shadow-indigo-500/10 active:scale-95 transition-all border-0"
            onClick={() => navigate('/dashboard')}
          >
            Generate First Notes ✨
          </Button>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MAIN RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="max-w-[1200px] mx-auto py-4 pb-8">
      <AnimatePresence mode="wait">

        {/* ━━━━━━ LIBRARY LIST VIEW ━━━━━━ */}
        {!selectedNote ? (
          <motion.div
            key="library-list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            {/* ─── Header ─── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 select-none">
              <div>
                <h1
                  className="text-[42px] font-extrabold text-white tracking-tight leading-none"
                  style={{ fontFamily: 'Geist, sans-serif' }}
                >
                  My Library
                </h1>
                <p className="text-gray-400 text-[15px] font-medium mt-3">
                  Manage and review your AI-enhanced study materials.
                </p>
              </div>
              <Button
                onClick={() => navigate('/dashboard')}
                className="h-12 px-6 bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/10 flex items-center gap-2 border-0 shrink-0 active:scale-[0.97] transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                New Note
              </Button>
            </div>

            {/* ─── Filter Bar ─── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
              {/* Search */}
              <div className="relative w-full sm:w-[340px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search your library..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-11 h-11 bg-[#131b2e] border-white/[0.06] text-white placeholder-gray-500 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm"
                />
              </div>

              {/* Filter Pills + Sort */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                        activeFilter === filter.id
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'text-gray-400 border border-white/[0.06] hover:border-white/[0.12] hover:text-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium text-gray-400 border border-white/[0.06] hover:border-white/[0.12] hover:text-gray-200 transition-all"
                  >
                    Sort by: {sortOptions.find((s) => s.id === sortBy)?.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showSortMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-0 mt-2 w-40 bg-[#171f33] border border-white/[0.08] rounded-xl shadow-xl shadow-black/30 z-20 overflow-hidden"
                    >
                      {sortOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setSortBy(option.id);
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors ${
                            sortBy === option.id
                              ? 'text-indigo-400 bg-indigo-500/5'
                              : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Notes Card Grid ─── */}
            {filteredNotes.length === 0 ? (
              <div className="text-center py-20 border border-white/5 bg-[#131b2e]/30 rounded-[20px] text-gray-400 text-sm font-medium select-none">
                No matching study materials found. Try refining your search or filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredNotes.map((note, index) => {
                  const tags = getNoteTags(note);
                  const description = getNoteDescription(note);
                  const priority = getNotePriority(note);
                  const dateStr = formatDate(note.createdAt);
                  const hasDiagramPreview = note.includeDiagram && !note.includeChart;
                  const hasChartPreview = note.includeChart;

                  return (
                    <motion.div
                      key={note._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.04 }}
                      onClick={() => setSelectedNote(note)}
                      className="bg-[#131b2e] rounded-[20px] border border-white/[0.06] p-6 flex flex-col hover:border-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/[0.03] transition-all duration-300 cursor-pointer group relative"
                    >
                      {/* Tags Row + Menu */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, ti) => (
                            <span
                              key={ti}
                              className={`px-3 py-[5px] rounded-md text-[11px] font-semibold ${
                                tag.variant === 'feature'
                                  ? 'bg-teal-500/10 text-teal-400'
                                  : 'bg-indigo-500/10 text-indigo-400'
                              }`}
                            >
                              {tag.label}
                            </span>
                          ))}
                        </div>
                        <div className="relative card-menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === note._id ? null : note._id);
                            }}
                            className="text-gray-600 hover:text-gray-300 transition-colors p-1 -mr-1 -mt-1"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {activeMenuId === note._id && (
                            <div className="absolute right-0 mt-1 w-32 bg-[#171f33] border border-white/[0.08] rounded-xl shadow-xl shadow-black/40 z-30 overflow-hidden">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleDeleteNote(note._id, note.topic);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-rose-455 hover:bg-rose-500/5 transition-colors border-0 bg-transparent cursor-pointer"
                              >
                                Delete Note
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-[17px] font-bold text-white mb-2 leading-snug group-hover:text-indigo-200 transition-colors">
                        {note.topic}
                      </h3>

                      {/* Description */}
                      <p className="text-[13px] text-gray-400 leading-relaxed line-clamp-2 mb-4">
                        {description}
                      </p>

                      {/* Optional Diagram/Chart Preview Placeholder */}
                      {hasDiagramPreview && (
                        <div className="w-full h-[120px] rounded-xl bg-gradient-to-br from-[#0f1b2e] via-[#0d2233] to-[#0f1b2e] border border-white/[0.04] mb-4 flex items-center justify-center overflow-hidden relative">
                          <div className="absolute inset-0 opacity-20">
                            <svg viewBox="0 0 300 120" className="w-full h-full">
                              <polyline
                                fill="none"
                                stroke="#4edea3"
                                strokeWidth="2"
                                points="0,100 30,85 60,90 90,60 120,65 150,40 180,50 210,30 240,35 270,20 300,25"
                              />
                              <polyline
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="2"
                                points="0,110 30,100 60,105 90,80 120,85 150,70 180,75 210,55 240,60 270,45 300,50"
                              />
                            </svg>
                          </div>
                          <GitBranch className="w-6 h-6 text-teal-500/30 relative z-10" />
                        </div>
                      )}

                      {hasChartPreview && !hasDiagramPreview && (
                        <div className="w-full h-[120px] rounded-xl bg-gradient-to-br from-[#0f1b2e] via-[#1a0f2e] to-[#0f1b2e] border border-white/[0.04] mb-4 flex items-center justify-center overflow-hidden relative">
                          <div className="absolute inset-0 opacity-20 flex items-end justify-center gap-2 p-4">
                            {[40, 65, 50, 80, 55, 70, 90, 60].map((h, i) => (
                              <div
                                key={i}
                                className="w-4 bg-gradient-to-t from-indigo-500 to-violet-500 rounded-t"
                                style={{ height: `${h}%` }}
                              />
                            ))}
                          </div>
                          <BarChart3 className="w-6 h-6 text-violet-500/30 relative z-10" />
                        </div>
                      )}

                      {/* Spacer to push metadata to bottom */}
                      <div className="mt-auto" />

                      {/* Metadata Row */}
                      <div className="flex items-center gap-4 text-[12px] text-gray-500 mt-4 flex-wrap">
                        {note.classLevel && (
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-gray-500" />
                            {note.classLevel}
                          </span>
                        )}
                        {note.examType && (
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                            {note.examType}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          {dateStr}
                        </span>
                      </div>

                      {/* Action Row */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          {priority === 'high' && (
                            <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              High Priority
                            </span>
                          )}
                          {!priority && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                              <Sparkles className="w-3 h-3" />
                              AI
                            </span>
                          )}
                        </div>

                        {hasDiagramPreview ? (
                          <span className="text-teal-400 text-[13px] font-medium flex items-center gap-1.5 group-hover:gap-2 transition-all">
                            View Diagram
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-teal-400 text-[13px] font-medium flex items-center gap-1.5 group-hover:gap-2 transition-all">
                            Open Note
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* ─── Create New Note Card ─── */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: filteredNotes.length * 0.04 }}
                  onClick={() => navigate('/dashboard')}
                  className="rounded-[20px] border-2 border-dashed border-white/[0.08] p-6 flex flex-col items-center justify-center min-h-[280px] hover:border-indigo-500/20 hover:bg-white/[0.01] transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-indigo-500/5 group-hover:border-indigo-500/10 transition-all">
                    <Plus className="w-6 h-6 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <h3 className="text-base font-bold text-gray-300 group-hover:text-white transition-colors">
                    Create New Note
                  </h3>
                  <p className="text-sm text-gray-500 mt-1.5">
                    Upload PDF or start typing
                  </p>
                </motion.div>
              </div>
            )}

            {/* ─── Footer ─── */}
            <footer className="mt-12 pt-8 border-t border-white/[0.04]">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-center md:text-left">
                  <span className="font-bold text-white text-sm tracking-tight">ExamNotes AI</span>
                  <span className="text-gray-600 text-xs">© 2024 ExamNotes AI. All rights reserved.</span>
                </div>
                <div className="flex items-center gap-6 flex-wrap justify-center">
                  <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</a>
                  <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Terms of Service</a>
                  <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Contact Support</a>
                  <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">API Documentation</a>
                </div>
              </div>
            </footer>
          </motion.div>
        ) : (

          /* ━━━━━━ NOTE DETAIL VIEW ━━━━━━ */
          <motion.div
            key="note-viewer"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="space-y-0"
          >
            {/* ─── Header Bar ─── */}
            <div className="flex flex-col gap-4 mb-6">
              {/* Row 1: Back Button + Action Buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedNote(null)}
                  className="h-9 px-4 rounded-xl text-[13px] font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-white/[0.08] hover:border-white/[0.12] transition-all flex items-center gap-2 bg-[#131b2e]/60 backdrop-blur-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Library
                </Button>
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="ghost"
                    className="h-9 px-4 rounded-xl text-[13px] font-medium text-gray-400 hover:text-white hover:bg-white/5 border border-white/[0.06] transition-all flex items-center gap-2"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9 px-4 rounded-xl text-[13px] font-medium text-gray-400 hover:text-white hover:bg-white/5 border border-white/[0.06] transition-all flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Export
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    className="h-9 px-5 rounded-xl text-[13px] font-bold bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 text-white shadow-md shadow-indigo-500/10 flex items-center gap-2 border-0 active:scale-[0.97] transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </Button>
                </div>
              </div>
              {/* Row 2: Title + Subtitle */}
              <div className="mt-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                  {selectedNote.topic}
                </h1>
                <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-2 flex-wrap">
                  <span>Generated {formatRelativeTime(selectedNote.createdAt)}</span>
                  {selectedNote.classLevel && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span>{selectedNote.classLevel}</span>
                    </>
                  )}
                  {selectedNote.examType && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span>{selectedNote.examType}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <NotesDashboard
              content={selectedNote.content}
              topic={selectedNote.topic}
              onDeeperDive={(deeperTopic) => {
                setSelectedNote(null);
                navigate('/dashboard', { state: { deeperTopic } });
              }}
            />

            {/* ─── Footer ─── */}
            <footer className="mt-16 pt-8 border-t border-white/[0.04]">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-center md:text-left">
                  <span className="font-bold text-white text-sm tracking-tight">ExamNotes AI</span>
                  <span className="text-gray-600 text-xs">© 2024 ExamNotes AI. All rights reserved.</span>
                </div>
                <div className="flex items-center gap-6 flex-wrap justify-center">
                  <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</a>
                  <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Terms of Service</a>
                  <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Contact Support</a>
                  <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">API Documentation</a>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
