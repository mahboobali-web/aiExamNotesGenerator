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
  Sparkles,
  Star,
  BarChart3,
  GitBranch,
  FileText,
  FileCheck,
  Check,
  CheckCircle2,
  Scissors,
  Layers,
  Cloud,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Trash2,
  FileArchive,
  X,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function DocTools() {
  // Tool 1: PDF to Word actual functional state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfState, setPdfState] = useState<'idle' | 'converting' | 'complete'>('idle');
  const [pdfStatusText, setPdfStatusText] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfConversions, setPdfConversions] = useState<{ originalName: string; filename: string; downloadUrl: string }[]>([]);
  const [pdfZipUrl, setPdfZipUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File validation and select
  const processFiles = (filesList: FileList) => {
    setPdfError(null);
    const newFiles: File[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (ext !== '.pdf') {
        setPdfError(`Invalid file format: "${file.name}" is not a PDF file. Only .pdf is allowed.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setPdfError(`File size limit exceeded: "${file.name}" is larger than 10MB.`);
        return;
      }
      newFiles.push(file);
    }
    // Limit to max 5 files total
    if (pdfFiles.length + newFiles.length > 5) {
      setPdfError("Maximum limit exceeded: You can convert up to 5 PDFs at once.");
      return;
    }
    setPdfFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index));
    setPdfError(null);
  };

  const handleResetPdfConverter = () => {
    setPdfFiles([]);
    setPdfProgress(0);
    setPdfState('idle');
    setPdfStatusText('');
    setPdfError(null);
    setPdfConversions([]);
    setPdfZipUrl(null);
  };

  const handleConvertToWord = async () => {
    if (pdfFiles.length === 0) return;
    
    setPdfState('converting');
    setPdfProgress(10);
    setPdfStatusText('Uploading document files...');
    setPdfError(null);

    // Simulated progress ticks during api wait
    const progressInterval = setInterval(() => {
      setPdfProgress((prev) => {
        if (prev >= 90) return 90;
        if (prev === 30) setPdfStatusText('Extracting layout grids...');
        if (prev === 60) setPdfStatusText('Synthesizing editable paragraph text...');
        if (prev === 80) setPdfStatusText('Constructing output DOCX elements...');
        return prev + 5;
      });
    }, 400);

    const formData = new FormData();
    pdfFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await api.post('/tools/pdf-to-word', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setPdfProgress(100);
      setPdfStatusText('Conversion completed!');
      setPdfConversions(response.data.conversions);
      setPdfZipUrl(response.data.zipUrl);
      setPdfState('complete');

      // Update credit usage statistics in localStorage
      try {
        const current = parseInt(localStorage.getItem('docs_converted_count') || '0', 10);
        localStorage.setItem('docs_converted_count', (current + pdfFiles.length).toString());
        window.dispatchEvent(new Event('credits-updated'));
      } catch (err) {
        console.warn('Failed to update stats count in localStorage', err);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setPdfState('idle');
      const msg = err.response?.data?.error || err.message || 'Server conversion failed. Please try again.';
      setPdfError(msg);
    }
  };

  const triggerDownload = (downloadUrl: string) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const serverUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    window.open(`${serverUrl}${downloadUrl}`, '_blank');
  };

  // Tool 2: Merge PDF real state declarations
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeState, setMergeState] = useState<'idle' | 'merging' | 'complete'>('idle');
  const [mergeStatusText, setMergeStatusText] = useState('');
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeOutputName, setMergeOutputName] = useState('');
  const [mergeOutputUrl, setMergeOutputUrl] = useState<string | null>(null);
  const [isMergeDragOver, setIsMergeDragOver] = useState(false);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);

  // Tool 3: AI Image Gen states
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('A highly detailed, photorealistic 3D scientific visualization of a biological cell structure under a microscope. Glowing neon mitochondria, a glowing nucleus in the center, and a beautiful blue plasma membrane.');
  const [imageStyle, setImageStyle] = useState<'Educational' | 'Diagram' | 'Infographic' | 'Illustration'>('Educational');
  const [imageSize, setImageSize] = useState<'Square' | 'Portrait' | 'Landscape'>('Square');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<any | null>(null);
  const [imageHistory, setImageHistory] = useState<any[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenUrl, setFullscreenUrl] = useState('');
  const [imageProgress, setImageProgress] = useState(0);
  const [imageStatusText, setImageStatusText] = useState('');

  // Tool 4: AI Diagram Gen states
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [diagramPrompt, setDiagramPrompt] = useState('');
  const [diagramType, setDiagramType] = useState<'Auto Detect' | 'Flowchart' | 'Mind Map' | 'Class Diagram' | 'ER Diagram' | 'Sequence Diagram' | 'Roadmap'>('Auto Detect');
  const [diagramFormat, setDiagramFormat] = useState<'SVG' | 'PNG'>('SVG');
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  const [generatedDiagram, setGeneratedDiagram] = useState<any | null>(null);
  const [diagramHistory, setDiagramHistory] = useState<any[]>([]);
  const [diagramError, setDiagramError] = useState<string | null>(null);
  const [diagramProgress, setDiagramProgress] = useState(0);
  const [diagramStatusText, setDiagramStatusText] = useState('');
  const [diagramActiveTab, setDiagramActiveTab] = useState<'Rendered' | 'Code'>('Rendered');

  // Tool 5: Premium AI Presentation Generator states
  const [isPptModalOpen, setIsPptModalOpen] = useState(false);
  const [pptSourceTab, setPptSourceTab] = useState<'docx' | 'library' | 'text'>('docx');
  const [pptUploadFile, setPptUploadFile] = useState<File | null>(null);
  const [libraryNotes, setLibraryNotes] = useState<any[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [pptRawText, setPptRawText] = useState<string>('');
  const [pptStyle, setPptStyle] = useState<string>('Professional');
  const [pptTheme, setPptTheme] = useState<string>('Light');
  const [pptSlideCount, setPptSlideCount] = useState<string>('Auto');
  const [pptIncludeCharts, setPptIncludeCharts] = useState(true);
  const [pptIncludeDiagrams, setPptIncludeDiagrams] = useState(true);
  const [pptIncludeSpeakerNotes, setPptIncludeSpeakerNotes] = useState(true);
  const [pptIncludeSummary, setPptIncludeSummary] = useState(true);
  const [isGeneratingPpt, setIsGeneratingPpt] = useState(false);
  const [pptProgress, setPptProgress] = useState(0);
  const [pptStatusText, setPptStatusText] = useState('');
  const [pptError, setPptError] = useState<string | null>(null);
  const [generatedPpt, setGeneratedPpt] = useState<any | null>(null);
  const [pptHistory, setPptHistory] = useState<any[]>([]);
  const [isPptDragOver, setIsPptDragOver] = useState(false);
  const pptFileInputRef = useRef<HTMLInputElement>(null);

  // Tool 6: Split PDF functional state declarations
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitUploadFile, setSplitUploadFile] = useState<File | null>(null);
  const [splitPdfPageCount, setSplitPdfPageCount] = useState<number>(0);
  const [splitMethod, setSplitMethod] = useState<'extract' | 'range' | 'everyN' | 'individual'>('extract');
  const [splitPageRanges, setSplitPageRanges] = useState<string>('');
  const [splitPagesPerFile, setSplitPagesPerFile] = useState<string>('5');
  const [isGeneratingSplit, setIsGeneratingSplit] = useState(false);
  const [splitProgress, setSplitProgress] = useState(0);
  const [splitStatusText, setSplitStatusText] = useState('');
  const [splitError, setSplitError] = useState<string | null>(null);
  const [splitHistory, setSplitHistory] = useState<any[]>([]);
  const [isSplitDragOver, setIsSplitDragOver] = useState(false);
  const [splitFilesGenerated, setSplitFilesGenerated] = useState(0);
  const [splitDownloadUrls, setSplitDownloadUrls] = useState<string[]>([]);
  const [splitZipUrl, setSplitZipUrl] = useState<string | null>(null);
  const [splitState, setSplitState] = useState<'idle' | 'splitting' | 'complete'>('idle');
  const splitFileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to resolve absolute URL path of generated asset files
  const getAssetUrl = (url: string) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const serverUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    return `${serverUrl}${url}`;
  };

  // AI Diagram Generation Handlers
  const fetchDiagramHistory = async () => {
    try {
      const response = await api.get('/tools/diagram/history');
      setDiagramHistory(response.data.history || []);
    } catch (err) {
      console.warn('Failed to load diagram history logs', err);
    }
  };

  useEffect(() => {
    if (isDiagramModalOpen) {
      fetchDiagramHistory();
    }
  }, [isDiagramModalOpen]);

  const handleGenerateDiagram = async (customPrompt?: string) => {
    const activePrompt = customPrompt || diagramPrompt;
    if (!activePrompt || activePrompt.trim().length < 3) {
      setDiagramError("Prompt must be at least 3 characters long.");
      return;
    }

    setIsGeneratingDiagram(true);
    setDiagramProgress(10);
    setDiagramStatusText('Analyzing visualization requirements...');
    setDiagramError(null);

    // Simulated progress steps
    const progressInterval = setInterval(() => {
      setDiagramProgress((prev) => {
        if (prev >= 90) return 90;
        if (prev === 25) setDiagramStatusText('Synthesizing Mermaid syntax structure...');
        if (prev === 50) setDiagramStatusText('Validating Mermaid layout syntax...');
        if (prev === 70) setDiagramStatusText('Compiling high-resolution vector nodes...');
        if (prev === 85) setDiagramStatusText('Generating diagram download assets...');
        return prev + 5;
      });
    }, 450);

    try {
      const response = await api.post('/tools/diagram/generate', {
        prompt: activePrompt,
        diagramType
      });

      clearInterval(progressInterval);
      setDiagramProgress(100);
      setDiagramStatusText('Diagram generated successfully!');
      setGeneratedDiagram(response.data.diagram);
      setIsGeneratingDiagram(false);

      // Refresh history list
      fetchDiagramHistory();

      // Update credit usage statistics in localStorage
      try {
        const current = parseInt(localStorage.getItem('docs_converted_count') || '0', 10);
        localStorage.setItem('docs_converted_count', (current + 1).toString());
        window.dispatchEvent(new Event('credits-updated'));
      } catch (err) {
        console.warn('Failed to update stats in localStorage', err);
      }

    } catch (err: any) {
      clearInterval(progressInterval);
      setIsGeneratingDiagram(false);
      const msg = err.response?.data?.error || err.message || 'Diagram generation failed. Please try again.';
      setDiagramError(msg);
    }
  };

  const handleDeleteDiagram = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/tools/diagram/history/${id}`);
      if (generatedDiagram && generatedDiagram._id === id) {
        setGeneratedDiagram(null);
      }
      fetchDiagramHistory();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete diagram.';
      setDiagramError(msg);
    }
  };

  const handleDownloadDiagramFile = (downloadUrl: string, promptText: string, ext: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const serverUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    
    // Trigger download using hidden anchor
    const link = document.createElement('a');
    link.href = `${serverUrl}${downloadUrl}`;
    const sanitizedName = promptText.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'Diagram';
    link.setAttribute('download', `${sanitizedName}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyMermaidCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Copied Mermaid syntax to clipboard!');
  };

  const handleResetDiagramWorkspace = () => {
    setDiagramPrompt('');
    setDiagramType('Auto Detect');
    setDiagramFormat('SVG');
    setGeneratedDiagram(null);
    setDiagramError(null);
    setIsGeneratingDiagram(false);
    setDiagramProgress(0);
    setDiagramStatusText('');
  };

  // Premium AI Presentation Generator Handlers
  const fetchLibraryNotes = async () => {
    try {
      const response = await api.get('/notes');
      setLibraryNotes(response.data.notes || []);
    } catch (err) {
      console.warn('Failed to load notes library list', err);
    }
  };

  const fetchPptHistory = async () => {
    try {
      const response = await api.get('/tools/presentation/history');
      setPptHistory(response.data.history || []);
    } catch (err) {
      console.warn('Failed to load presentation history list', err);
    }
  };

  useEffect(() => {
    if (isPptModalOpen) {
      fetchLibraryNotes();
      fetchPptHistory();
    }
  }, [isPptModalOpen]);

  const handleGeneratePpt = async () => {
    setPptError(null);
    setIsGeneratingPpt(true);
    setPptProgress(10);
    setPptStatusText('Reading input document source...');

    // Progress bar simulation ticks
    const progressInterval = setInterval(() => {
      setPptProgress((prev) => {
        if (prev >= 95) return 95;
        if (prev === 25) setPptStatusText('Gemini parsing content schema outline...');
        if (prev === 50) setPptStatusText('Synthesizing slide design themes...');
        if (prev === 70) setPptStatusText('Compiling vector slide shapes...');
        if (prev === 85) setPptStatusText('Adding native quantitative charts...');
        return prev + 5;
      });
    }, 550);

    try {
      const formData = new FormData();
      formData.append('presentationStyle', pptStyle);
      formData.append('theme', pptTheme);
      formData.append('slideCount', pptSlideCount);
      formData.append('includeCharts', pptIncludeCharts.toString());
      formData.append('includeDiagrams', pptIncludeDiagrams.toString());

      if (pptSourceTab === 'docx') {
        if (!pptUploadFile) {
          throw new Error('Please select a valid Word Document (.docx) to proceed.');
        }
        formData.append('file', pptUploadFile);
      } else if (pptSourceTab === 'library') {
        if (!selectedNoteId) {
          throw new Error('Please select notes from your library.');
        }
        formData.append('noteId', selectedNoteId);
      } else {
        if (!pptRawText || pptRawText.trim().length < 10) {
          throw new Error('Content is too short. Please paste at least a paragraph of text.');
        }
        formData.append('rawText', pptRawText);
      }

      const response = await api.post('/tools/presentation/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setPptProgress(100);
      setPptStatusText('Presentation compiled successfully!');
      setGeneratedPpt(response.data.presentation);
      setIsGeneratingPpt(false);

      // Refresh history list
      fetchPptHistory();

      // Update credit statistics in localStorage
      try {
        const current = parseInt(localStorage.getItem('docs_converted_count') || '0', 10);
        localStorage.setItem('docs_converted_count', (current + 1).toString());
        window.dispatchEvent(new Event('credits-updated'));
      } catch (err) {
        console.warn('Failed to update stats in localStorage', err);
      }

    } catch (err: any) {
      clearInterval(progressInterval);
      setIsGeneratingPpt(false);
      const msg = err.response?.data?.error || err.message || 'Presentation generation failed. Please try again.';
      setPptError(msg);
    }
  };

  const handleDeletePpt = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/tools/presentation/history/${id}`);
      if (generatedPpt && generatedPpt._id === id) {
        setGeneratedPpt(null);
      }
      fetchPptHistory();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete presentation.';
      setPptError(msg);
    }
  };

  const handleDownloadPptFile = (downloadUrl: string, titleText: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const serverUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

    const link = document.createElement('a');
    link.href = `${serverUrl}${downloadUrl}`;
    const sanitizedName = titleText.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'Presentation';
    link.setAttribute('download', `${sanitizedName}.pptx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetPptWorkspace = () => {
    setPptUploadFile(null);
    setSelectedNoteId('');
    setPptRawText('');
    setPptStyle('Professional');
    setPptTheme('Light');
    setPptSlideCount('Auto');
    setGeneratedPpt(null);
    setPptError(null);
    setIsGeneratingPpt(false);
    setPptProgress(0);
    setPptStatusText('');
  };

  // Pure client-side PDF page counter without npm libraries
  const getPdfPageCount = async (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const arr = new Uint8Array(reader.result as ArrayBuffer);
          const decoder = new TextDecoder('ascii');
          let text = '';
          const chunkSize = 1024 * 1024; // Read in 1MB chunks to avoid memory bottlenecks
          for (let i = 0; i < arr.length; i += chunkSize) {
            text += decoder.decode(arr.subarray(i, Math.min(i + chunkSize, arr.length)));
          }
          
          // Method A: Look for /Type /Page
          const typePageMatches = text.match(/\/Type\s*\/Page\b/g);
          if (typePageMatches && typePageMatches.length > 0) {
            resolve(typePageMatches.length);
            return;
          }

          // Method B: Look for /Count in /Pages catalog
          const pagesRegex = /\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/g;
          let match;
          let maxCount = 0;
          while ((match = pagesRegex.exec(text)) !== null) {
            const countVal = parseInt(match[1], 10);
            if (countVal > maxCount) maxCount = countVal;
          }
          if (maxCount > 0) {
            resolve(maxCount);
            return;
          }
          
          // Method C: Look for /Count anywhere
          const simpleCountRegex = /\/Count\s+(\d+)/g;
          let countVal = 0;
          while ((match = simpleCountRegex.exec(text)) !== null) {
            const parsed = parseInt(match[1], 10);
            if (parsed > countVal) countVal = parsed;
          }
          if (countVal > 0) {
            resolve(countVal);
            return;
          }
        } catch (err) {
          console.warn('PDF parsing error', err);
        }
        resolve(1);
      };
      reader.onerror = () => resolve(1);
      reader.readAsArrayBuffer(file);
    });
  };

  const fetchSplitHistory = async () => {
    try {
      const response = await api.get('/tools/split-pdf/history');
      setSplitHistory(response.data.history || []);
    } catch (err) {
      console.warn('Failed to load split PDF history logs', err);
    }
  };

  useEffect(() => {
    if (isSplitModalOpen) {
      fetchSplitHistory();
    }
  }, [isSplitModalOpen]);

  const processSplitFile = async (file: File) => {
    setSplitError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setSplitError('Invalid format: Only PDF documents (.pdf) are allowed.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setSplitError('File size limit exceeded: Maximum size allowed is 30MB.');
      return;
    }

    setSplitUploadFile(file);
    setSplitStatusText('Reading page count...');
    const pages = await getPdfPageCount(file);
    setSplitPdfPageCount(pages);
  };

  const handleSplitFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSplitFile(e.target.files[0]);
    }
  };

  const handleSplitDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSplitDragOver(true);
  };

  const handleSplitDragLeave = () => {
    setIsSplitDragOver(false);
  };

  const handleSplitDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSplitDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSplitFile(e.dataTransfer.files[0]);
    }
  };

  const handleSplitPDF = async () => {
    if (!splitUploadFile) {
      setSplitError("Please choose a PDF file first.");
      return;
    }

    // Front-end validations
    if (splitMethod === 'extract') {
      if (!splitPageRanges.trim()) {
        setSplitError("Please specify pages to extract (e.g. 1, 3, 5).");
        return;
      }
    } else if (splitMethod === 'range') {
      if (!splitPageRanges.trim()) {
        setSplitError("Please specify range groups (e.g. 1-10, 11-20).");
        return;
      }
    } else if (splitMethod === 'everyN') {
      const n = parseInt(splitPagesPerFile, 10);
      if (isNaN(n) || n < 1) {
        setSplitError("Please specify a valid positive page count.");
        return;
      }
    }

    setIsGeneratingSplit(true);
    setSplitState('splitting');
    setSplitProgress(10);
    setSplitStatusText("Parsing document bytes...");
    setSplitError(null);

    const progressInterval = setInterval(() => {
      setSplitProgress((prev) => {
        if (prev < 90) return prev + 8;
        return prev;
      });
    }, 450);

    try {
      const formData = new FormData();
      formData.append('file', splitUploadFile);
      formData.append('splitMethod', splitMethod);
      formData.append('pageRanges', splitPageRanges);
      formData.append('pagesPerFile', splitPagesPerFile);

      setSplitStatusText("Uploading and splitting PDF locally...");
      const response = await api.post('/tools/split-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(progressInterval);
      setSplitProgress(100);
      setSplitStatusText("Collation Complete!");

      const data = response.data;
      setSplitFilesGenerated(data.filesGenerated || 1);
      setSplitDownloadUrls(data.downloadUrls || []);
      setSplitZipUrl(data.zipUrl || null);
      setSplitState('complete');

      const current = parseInt(localStorage.getItem('docs_converted_count') || '0', 10);
      localStorage.setItem('docs_converted_count', (current + 1).toString());

      fetchSplitHistory();

    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('[SPLIT-PDF] Error executing split:', err);
      const errMsg = err.response?.data?.error || err.message || 'Operation failed.';
      setSplitError(errMsg);
      setSplitState('idle');
      setIsGeneratingSplit(false);
    } finally {
      setIsGeneratingSplit(false);
    }
  };

  const handleDeleteSplitRecord = async (id: string) => {
    try {
      await api.delete(`/tools/split-pdf/history/${id}`);
      fetchSplitHistory();
    } catch (err: any) {
      console.error('Failed to delete split history record', err);
      alert('Failed to delete split history record.');
    }
  };

  const handleResetSplit = () => {
    setSplitUploadFile(null);
    setSplitPdfPageCount(0);
    setSplitPageRanges('');
    setSplitPagesPerFile('5');
    setSplitProgress(0);
    setSplitStatusText('');
    setSplitError(null);
    setSplitState('idle');
    setSplitDownloadUrls([]);
    setSplitZipUrl(null);
    setIsGeneratingSplit(false);
  };

  // File validations and operations for Merge PDF
  const processMergeFiles = (filesList: FileList) => {
    setMergeError(null);
    const newFiles: File[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (ext !== '.pdf') {
        setMergeError(`Invalid file format: "${file.name}" is not a PDF file. Only .pdf is allowed.`);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setMergeError(`File size limit exceeded: "${file.name}" is larger than 50MB.`);
        return;
      }
      newFiles.push(file);
    }
    // Limit to max 50 files total
    if (mergeFiles.length + newFiles.length > 50) {
      setMergeError("Maximum limit exceeded: You can merge up to 50 PDFs at once.");
      return;
    }
    setMergeFiles((prev) => [...prev, ...newFiles]);
  };

  const handleMergeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processMergeFiles(e.target.files);
    }
  };

  const handleMergeDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsMergeDragOver(true);
  };

  const handleMergeDragLeave = () => {
    setIsMergeDragOver(false);
  };

  const handleMergeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsMergeDragOver(false);
    if (e.dataTransfer.files) {
      processMergeFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveMergeFile = (index: number) => {
    setMergeFiles((prev) => prev.filter((_, i) => i !== index));
    setMergeError(null);
  };

  const handleMoveMergeFile = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= mergeFiles.length) return;
    const updated = [...mergeFiles];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setMergeFiles(updated);
  };

  const handleResetMergeConverter = () => {
    setMergeFiles([]);
    setMergeProgress(0);
    setMergeState('idle');
    setMergeStatusText('');
    setMergeError(null);
    setMergeOutputName('');
    setMergeOutputUrl(null);
  };

  const handleMergePDFs = async () => {
    if (mergeFiles.length === 0) return;
    if (mergeFiles.length < 2) {
      setMergeError("At least 2 PDF files are required to perform a merge.");
      return;
    }

    setMergeState('merging');
    setMergeProgress(15);
    setMergeStatusText('Uploading PDF files...');
    setMergeError(null);

    // Simulated progress ticks during api call wait
    const progressInterval = setInterval(() => {
      setMergeProgress((prev) => {
        if (prev >= 90) return 90;
        if (prev === 30) setMergeStatusText('Parsing document catalog entries...');
        if (prev === 55) setMergeStatusText('Extracting page structures and fonts...');
        if (prev === 75) setMergeStatusText('Collating pages in order...');
        if (prev === 85) setMergeStatusText('Finalizing merged document buffer...');
        return prev + 5;
      });
    }, 450);

    const formData = new FormData();
    mergeFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await api.post('/tools/merge-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setMergeProgress(100);
      setMergeStatusText('Merge completed successfully!');
      setMergeOutputName(response.data.fileName);
      setMergeOutputUrl(response.data.downloadUrl);
      setMergeState('complete');

      // Update credit/statistics in localStorage
      try {
        const current = parseInt(localStorage.getItem('docs_converted_count') || '0', 10);
        localStorage.setItem('docs_converted_count', (current + 1).toString());
        window.dispatchEvent(new Event('credits-updated'));
      } catch (err) {
        console.warn('Failed to update stats in localStorage', err);
      }

    } catch (err: any) {
      clearInterval(progressInterval);
      setMergeState('idle');
      const msg = err.response?.data?.error || err.message || 'PDF Merge failed. Please verify files are not corrupted.';
      setMergeError(msg);
    }
  };

  // AI Image Generation handlers & hooks
  const fetchImageHistory = async () => {
    try {
      const response = await api.get('/tools/image/history');
      setImageHistory(response.data.history || []);
    } catch (err) {
      console.warn('Failed to load image history logs', err);
    }
  };

  useEffect(() => {
    if (isImageModalOpen) {
      fetchImageHistory();
    }
  }, [isImageModalOpen]);

  const handleGenerateImage = async (customPrompt?: string) => {
    const activePrompt = customPrompt || imagePrompt;
    if (!activePrompt || activePrompt.trim().length < 3) {
      setImageError("Prompt must be at least 3 characters long.");
      return;
    }

    setIsGeneratingImage(true);
    setImageProgress(15);
    setImageStatusText('Allocating GPU cluster slots...');
    setImageError(null);

    // Simulated progress ticks during api call wait
    const progressInterval = setInterval(() => {
      setImageProgress((prev) => {
        if (prev >= 90) return 90;
        if (prev === 30) setImageStatusText('Connecting to Pollinations AI cluster...');
        if (prev === 55) setImageStatusText('Synthesizing image pixels...');
        if (prev === 75) setImageStatusText('Refining detail passes and resolution...');
        if (prev === 85) setImageStatusText('Finalizing layout schema...');
        return prev + 5;
      });
    }, 450);

    try {
      const response = await api.post('/tools/image/generate', {
        prompt: activePrompt,
        style: imageStyle,
        size: imageSize
      });

      clearInterval(progressInterval);
      setImageProgress(100);
      setImageStatusText('Image generated successfully!');
      setGeneratedImage(response.data.image);
      setIsGeneratingImage(false);

      // Refresh chronological history list
      fetchImageHistory();

      // Update credit usage statistics in localStorage
      try {
        const current = parseInt(localStorage.getItem('docs_converted_count') || '0', 10);
        localStorage.setItem('docs_converted_count', (current + 1).toString());
        window.dispatchEvent(new Event('credits-updated'));
      } catch (err) {
        console.warn('Failed to update stats in localStorage', err);
      }

    } catch (err: any) {
      clearInterval(progressInterval);
      setIsGeneratingImage(false);
      const msg = err.response?.data?.error || err.message || 'Image generation failed. Please try again.';
      setImageError(msg);
    }
  };

  const handleDeleteImage = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/tools/image/history/${id}`);
      if (generatedImage && generatedImage._id === id) {
        setGeneratedImage(null);
      }
      fetchImageHistory();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete image record.';
      setImageError(msg);
    }
  };

  const handleDownloadImage = async (url: string, promptText: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const sanitizedName = promptText.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'AI_Image';
      link.setAttribute('download', `${sanitizedName}.jpg`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Direct blob download failed, fallback to direct open', err);
      window.open(url, '_blank');
    }
  };

  const handleResetImageWorkspace = () => {
    setImagePrompt('A highly detailed, photorealistic 3D scientific visualization of a biological cell structure under a microscope. Glowing neon mitochondria, a glowing nucleus in the center, and a beautiful blue plasma membrane.');
    setImageStyle('Educational');
    setImageSize('Square');
    setGeneratedImage(null);
    setImageError(null);
    setIsGeneratingImage(false);
    setImageProgress(0);
    setImageStatusText('');
  };

  return (
    <div className="max-w-[1200px] mx-auto py-4 pb-8 space-y-8 select-none">
      
      {/* ─── Header Section ─── */}
      <div>
        <h1
          className="text-[32px] sm:text-[40px] font-extrabold text-white tracking-tight leading-none"
          style={{ fontFamily: 'Geist, sans-serif' }}
        >
          Document Tools
        </h1>
        <p className="text-gray-400 text-[15px] font-medium mt-3 max-w-3xl leading-relaxed">
          High-utility AI tools designed to transform, merge, and generate academic content with precision and speed.
        </p>
      </div>

      {/* ─── Cards Grid Layout (3 Columns) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* CARD 1: PDF to Word */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => setIsPdfModalOpen(true)}
          className="bg-[#131b2e] rounded-[24px] border border-white/[0.06] p-6 flex flex-col hover:border-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/[0.02] transition-all duration-300 relative overflow-hidden group cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="text-gray-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Est. 3s
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-2 tracking-tight">PDF to Word</h3>
          <p className="text-[13px] text-gray-400 leading-relaxed mb-6">
            Convert multiple PDF documents into editable Word files with perfect layout retention.
          </p>

          <div className="mt-auto">
            <div className="w-full h-32 rounded-[20px] border border-dashed border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.01] transition-all duration-300 flex flex-col items-center justify-center gap-3 p-4 group-hover:border-indigo-500/30">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center group-hover:scale-105 transition-all bg-indigo-500/5 group-hover:bg-indigo-500/10">
                <Cloud className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-[13px] text-gray-400 font-medium group-hover:text-white transition-colors">
                Drop PDF files or <span className="text-indigo-400 underline decoration-indigo-400/40 font-bold">browse</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* CARD 2: Merge PDF */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => setIsMergeModalOpen(true)}
          className="bg-[#131b2e] rounded-[24px] border border-white/[0.06] p-6 flex flex-col hover:border-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/[0.02] transition-all duration-300 relative overflow-hidden group cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
              <Layers className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-gray-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Est. 4s
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Merge PDF</h3>
          <p className="text-[13px] text-gray-400 leading-relaxed mb-6">
            Combine multiple PDF files into a single, organized document in the exact order you need.
          </p>

          <div className="mt-auto">
            <div className="w-full h-32 rounded-[20px] border border-dashed border-white/[0.08] hover:border-emerald-500/40 hover:bg-white/[0.01] transition-all duration-300 flex flex-col items-center justify-center gap-3 p-4 group-hover:border-emerald-500/30">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center group-hover:scale-105 transition-all bg-emerald-500/5 group-hover:bg-emerald-500/10">
                <Cloud className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[13px] text-gray-400 font-medium group-hover:text-white transition-colors">
                Drop multiple PDFs or <span className="text-emerald-400 underline decoration-emerald-400/40 font-bold">browse</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* CARD 3: AI Image Gen */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => setIsImageModalOpen(true)}
          className="bg-[#131b2e] rounded-[24px] border border-white/[0.06] p-6 flex flex-col hover:border-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/[0.02] transition-all duration-300 relative overflow-hidden group cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="text-gray-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Est. 5s
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-2 tracking-tight">AI Image Gen</h3>
          <p className="text-[13px] text-gray-400 leading-relaxed mb-6">
            Generate photorealistic diagrams, infographics, and conceptual educational visuals.
          </p>

          <div className="mt-auto">
            <div className="w-full h-32 rounded-[20px] border border-white/[0.04] overflow-hidden relative group/img">
              <img
                src="/microscopic_cell.png"
                alt="Microscopic cell structure"
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500 brightness-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3.5 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300">
                <span className="text-[11px] text-white font-medium truncate max-w-[70%]">Generate Custom Visuals ✨</span>
                <div className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 transition-all backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CARD 4: AI Diagram & Flowchart Generator */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => setIsDiagramModalOpen(true)}
          className="bg-[#131b2e] rounded-[24px] border border-white/[0.06] p-6 flex flex-col hover:border-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/[0.02] transition-all duration-300 relative overflow-hidden group cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20">
              <GitBranch className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="text-gray-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Est. 5s
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-2 tracking-tight">AI Diagrams & Flowcharts</h3>
          <p className="text-[13px] text-gray-400 leading-relaxed mb-6">
            Describe any process, topic, workflow, system, roadmap, or concept and AI will automatically create professional diagrams.
          </p>

          <div className="mt-auto">
            <div className="w-full h-32 rounded-[20px] border border-dashed border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.01] transition-all duration-300 flex flex-col items-center justify-center gap-3 p-4 group-hover:border-indigo-500/30">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center group-hover:scale-105 transition-all bg-indigo-500/5 group-hover:bg-indigo-500/10">
                <Cloud className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-[13px] text-gray-400 font-medium group-hover:text-white transition-colors">
                Describe structure or <span className="text-indigo-400 underline decoration-indigo-400/40 font-bold">generate</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* CARD 5: AI Presentation Generator */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => setIsPptModalOpen(true)}
          className="bg-[#131b2e] rounded-[24px] border border-white/[0.06] p-6 flex flex-col hover:border-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/[0.02] transition-all duration-300 relative overflow-hidden group cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="text-gray-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Est. 12s
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-2 tracking-tight">AI Presentation Generator</h3>
          <p className="text-[13px] text-gray-400 leading-relaxed mb-6">
            Turn your notes, documents, or pasted content into professional, gorgeous presentation decks instantly.
          </p>

          <div className="mt-auto">
            <div className="w-full h-32 rounded-[20px] border border-dashed border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.01] transition-all duration-300 flex flex-col items-center justify-center gap-3 p-4 group-hover:border-indigo-500/30">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center group-hover:scale-105 transition-all bg-indigo-500/5 group-hover:bg-indigo-500/10">
                <Cloud className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-[13px] text-gray-400 font-medium group-hover:text-white transition-colors">
                Select notes or <span className="text-indigo-400 underline decoration-indigo-400/40 font-bold">generate deck</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* CARD 6: Split PDF */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => setIsSplitModalOpen(true)}
          className="bg-[#131b2e] rounded-[24px] border border-white/[0.06] p-6 flex flex-col hover:border-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/[0.02] transition-all duration-300 relative overflow-hidden group cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20">
              <Scissors className="w-6 h-6 text-indigo-400" />
            </div>
            {splitState === 'complete' ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                <Check className="w-3.5 h-3.5" />
                Split Ready
              </span>
            ) : (
              <span className="text-gray-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Local & Fast
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Split PDF Document</h3>
          <p className="text-[13px] text-gray-400 leading-relaxed mb-6">
            Extract selected pages, split by page ranges, or divide large PDFs into smaller documents.
          </p>

          <div className="mt-auto">
            {splitState === 'complete' ? (
              <div className="w-full h-24 rounded-[20px] bg-emerald-500/5 border border-emerald-500/10 p-4 flex flex-col justify-center gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-white truncate">{splitUploadFile?.name || 'document_split.zip'}</span>
                    <span className="text-[9px] text-emerald-400/80 font-semibold">{splitFilesGenerated} files generated</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-24 rounded-[20px] border border-dashed border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.01] transition-all duration-300 flex flex-col items-center justify-center gap-2 p-4">
                <div className="w-8 h-8 rounded-full bg-white/[0.03] flex items-center justify-center group-hover:scale-105 transition-all">
                  <Cloud className="w-4 h-4 text-gray-400" />
                </div>
                <span className="text-[12px] text-gray-400 font-medium">
                  Open Workspace
                </span>
              </div>
            )}
          </div>
        </motion.div>

      </div>

      {/* ─── PDF to Word Modal Workspace ─── */}
      <AnimatePresence>
        {isPdfModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with elegant heavy blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleResetPdfConverter} // Reset and close on backdrop click
              className="absolute inset-0 bg-[#070b19]/80 backdrop-blur-xl"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl bg-[#101827]/90 border border-white/[0.08] rounded-[32px] shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh]"
            >
              {/* Top border ambient glow */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

              {/* Modal Header */}
              <div className="p-6 pb-4 flex items-center justify-between border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">PDF to Word Workspace</h2>
                    <p className="text-[12px] text-gray-400 mt-0.5">Convert up to 5 PDFs at once (Max 10MB each)</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* 1. Errors Boundary */}
                {pdfError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 text-[13px] text-rose-400 font-medium leading-relaxed">
                      {pdfError}
                    </div>
                    <button
                      onClick={() => setPdfError(null)}
                      className="text-rose-400/60 hover:text-rose-400 text-xs font-bold transition-colors ml-2"
                    >
                      Dismiss
                    </button>
                  </motion.div>
                )}

                {/* 2. IDLE STATE: Upload / Selection */}
                {pdfState === 'idle' && (
                  <>
                    {/* Drag-and-drop Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative rounded-[24px] border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center gap-4 cursor-pointer select-none group min-h-[180px] ${
                        isDragOver
                          ? 'border-indigo-500 bg-indigo-500/[0.04] scale-[0.99]'
                          : 'border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.01]'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        multiple
                        accept=".pdf"
                        className="hidden"
                      />
                      
                      <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:scale-105 transition-all duration-300 group-hover:bg-indigo-500/5 group-hover:border-indigo-500/20">
                        <Cloud className="w-6 h-6 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                      </div>

                      <div className="text-center space-y-1">
                        <span className="text-[14px] text-gray-300 font-semibold block group-hover:text-white transition-colors">
                          Drag & drop PDF files here
                        </span>
                        <span className="text-[12px] text-gray-500 block">
                          or <span className="text-indigo-400 underline font-bold group-hover:text-indigo-300 transition-colors">browse files</span> from your computer
                        </span>
                      </div>
                    </div>

                    {/* Selected Files List */}
                    {pdfFiles.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                          <span className="font-semibold uppercase tracking-wider">Selected Files ({pdfFiles.length})</span>
                          <button
                            onClick={() => setPdfFiles([])}
                            className="text-indigo-400 hover:text-indigo-300 transition-colors font-bold"
                          >
                            Clear All
                          </button>
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {pdfFiles.map((file, idx) => (
                            <motion.div
                              key={`${file.name}-${idx}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.03] transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="bg-indigo-500/10 p-2 rounded-lg flex-shrink-0">
                                  <FileText className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] text-gray-200 font-bold truncate max-w-[340px]">{file.name}</p>
                                  <p className="text-[11px] text-gray-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveFile(idx)}
                                className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 transition-all flex items-center justify-center text-gray-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 3. CONVERTING STATE: Sequential ticks and progress bar */}
                {pdfState === 'converting' && (
                  <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
                    {/* Pulsing Gradient Orb */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                      <div className="w-16 h-16 rounded-full border-2 border-indigo-500/10 border-t-indigo-400 animate-spin flex items-center justify-center">
                        <FileText className="w-6 h-6 text-indigo-400 animate-bounce" />
                      </div>
                    </div>

                    <div className="w-full max-w-md space-y-3">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-400 font-medium truncate max-w-[70%]">Converting {pdfFiles.length} {pdfFiles.length === 1 ? 'document' : 'documents'}...</span>
                        <span className="text-indigo-400 font-extrabold">{pdfProgress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-full"
                          animate={{ width: `${pdfProgress}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                      <span className="text-[12px] text-gray-500 font-semibold block animate-pulse mt-1.5">{pdfStatusText}</span>
                    </div>
                  </div>
                )}

                {/* 4. COMPLETE STATE: Checkmarks and action triggers */}
                {pdfState === 'complete' && (
                  <div className="space-y-6 py-2">
                    {/* Completion Alert Header */}
                    <div className="flex flex-col items-center justify-center text-center space-y-3 pb-2">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Conversion Completed!</h3>
                        <p className="text-[12px] text-emerald-400/80 font-bold mt-0.5">Your Word documents are ready to download</p>
                      </div>
                    </div>

                    {/* Results Table */}
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {pdfConversions.map((conv, idx) => (
                        <div
                          key={`${conv.filename}-${idx}`}
                          className="flex items-center justify-between p-3.5 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl hover:bg-emerald-500/[0.04] transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-emerald-500/10 p-2 rounded-lg flex-shrink-0">
                              <FileCheck className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] text-gray-200 font-bold truncate max-w-[340px]">
                                {conv.originalName.replace(/\.pdf$/i, '.docx')}
                              </p>
                              <p className="text-[11px] text-emerald-400/80 font-semibold mt-0.5">Editable Word File</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => triggerDownload(conv.downloadUrl)}
                            size="sm"
                            className="h-8 rounded-xl text-[11px] font-bold bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] text-white flex items-center gap-1.5"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* ZIP Option if multiple files converted */}
                    {pdfZipUrl && (
                      <div className="p-4 bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-500/10 p-2.5 rounded-xl flex-shrink-0">
                            <FileArchive className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-gray-200">Archive Package (.zip)</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Contains all converted Word files</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => triggerDownload(pdfZipUrl)}
                          className="h-9 rounded-xl text-[12px] font-extrabold bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/10 hover:brightness-110 flex items-center gap-2 border-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download All as ZIP
                        </Button>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-6 pt-4 border-t border-white/[0.06] bg-[#0c121e]/85 flex gap-3">
                {pdfState === 'idle' && (
                  <>
                    <Button
                      onClick={() => setIsPdfModalOpen(false)}
                      variant="ghost"
                      className="flex-1 h-11 rounded-2xl text-[13px] font-bold text-gray-400 hover:text-white hover:bg-white/5 border border-white/[0.06]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConvertToWord}
                      disabled={pdfFiles.length === 0}
                      className="flex-1 h-11 rounded-2xl text-[13px] font-extrabold bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/10 hover:brightness-110 flex items-center justify-center gap-2 border-0 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin-slow" />
                      Convert to Word
                    </Button>
                  </>
                )}

                {pdfState === 'complete' && (
                  <Button
                    onClick={handleResetPdfConverter}
                    className="w-full h-11 rounded-2xl text-[13px] font-extrabold bg-[#1a253a] hover:bg-[#202d46] border border-white/[0.06] text-white flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Convert Another Batch
                  </Button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── PDF Split Modal Workspace ─── */}
      <AnimatePresence>
        {isSplitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with elegant heavy blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleResetSplit}
              className="absolute inset-0 bg-[#070b19]/80 backdrop-blur-xl"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl bg-[#101827]/90 border border-white/[0.08] rounded-[32px] shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh]"
            >
              {/* Top decoration glow border */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

              {/* Modal Header */}
              <div className="p-6 pb-4 flex items-center justify-between border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                    <Scissors className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Split PDF Document</h2>
                    <p className="text-[12px] text-gray-400 mt-0.5">Extract specific pages, split by page ranges, or divide large PDFs.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleResetSplit();
                    setIsSplitModalOpen(false);
                  }}
                  className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* Method Pill Chips */}
                {splitState === 'idle' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">Split Method:</span>
                    {[
                      { id: 'extract', label: 'Extract Pages' },
                      { id: 'range', label: 'Split By Range' },
                      { id: 'everyN', label: 'Split Every N Pages' },
                      { id: 'individual', label: 'Individual Pages' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSplitMethod(m.id as any);
                          setSplitError(null);
                        }}
                        className={`text-[12px] font-bold px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                          splitMethod === m.id
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-md shadow-indigo-500/[0.05]'
                            : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                    <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-indigo-500/5 text-indigo-400/80 border border-indigo-500/10 select-none">
                      Create Multiple PDFs
                    </span>
                  </div>
                )}

                {/* Error Banner */}
                {splitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 text-[13px] text-rose-400 font-medium leading-relaxed">
                      {splitError}
                    </div>
                    <button
                      onClick={() => setSplitError(null)}
                      className="text-rose-400/60 hover:text-rose-400 text-xs font-bold transition-colors ml-2"
                    >
                      Dismiss
                    </button>
                  </motion.div>
                )}

                {/* IDLE STATE 1: Choose File */}
                {splitState === 'idle' && !splitUploadFile && (
                  <div
                    onDragOver={handleSplitDragOver}
                    onDragLeave={handleSplitDragLeave}
                    onDrop={handleSplitDrop}
                    onClick={() => splitFileInputRef.current?.click()}
                    className={`h-48 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 group ${
                      isSplitDragOver
                        ? 'border-indigo-500 bg-indigo-500/5 shadow-inner'
                        : 'border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.01]'
                    }`}
                  >
                    <input
                      type="file"
                      ref={splitFileInputRef}
                      onChange={handleSplitFileSelect}
                      accept=".pdf"
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3 group-hover:scale-105 transition-all duration-300 bg-indigo-500/5 border-indigo-500/20">
                      <Cloud className="w-6 h-6 text-indigo-400" />
                    </div>
                    <p className="text-[14px] font-bold text-white tracking-tight">Drop PDF here or browse</p>
                    <p className="text-[11px] text-gray-500 mt-1">Accepts PDF documents up to 30MB</p>
                  </div>
                )}

                {/* IDLE STATE 2: File Uploaded & Configuration */}
                {splitState === 'idle' && splitUploadFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Metadata Header card */}
                    <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 flex-shrink-0">
                          <FileText className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-white truncate max-w-[280px]">
                            {splitUploadFile.name}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {(splitUploadFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-extrabold px-3 py-1 bg-white/[0.04] border border-white/[0.08] text-indigo-400 rounded-full">
                          {splitPdfPageCount > 0 ? `${splitPdfPageCount} Pages` : 'Calculating...'}
                        </span>
                      </div>
                    </div>

                    {/* Method Config panel */}
                    <div className="p-5 bg-white/[0.01] border border-white/[0.04] rounded-2xl space-y-4">
                      {splitMethod === 'extract' && (
                        <div className="space-y-2">
                          <label className="text-[12px] font-bold text-gray-300">Extract Specific Pages</label>
                          <Input
                            type="text"
                            placeholder="e.g. 1, 3, 5, 10"
                            value={splitPageRanges}
                            onChange={(e) => setSplitPageRanges(e.target.value)}
                            className="bg-white/[0.02] border-white/[0.08] focus:border-indigo-500/40 text-[13px] h-10 rounded-xl"
                          />
                          <p className="text-[11px] text-gray-500 leading-relaxed">
                            Comma-separated list of page numbers to copy. Generates a combined single PDF containing only these pages.
                          </p>
                        </div>
                      )}

                      {splitMethod === 'range' && (
                        <div className="space-y-2">
                          <label className="text-[12px] font-bold text-gray-300">Split By Range</label>
                          <Input
                            type="text"
                            placeholder="e.g. 1-10, 11-20, 21-30"
                            value={splitPageRanges}
                            onChange={(e) => setSplitPageRanges(e.target.value)}
                            className="bg-white/[0.02] border-white/[0.08] focus:border-indigo-500/40 text-[13px] h-10 rounded-xl"
                          />
                          <p className="text-[11px] text-gray-500 leading-relaxed">
                            Specify pages ranges. Generates a separate PDF document for each range specified (e.g. pages 1-10 will become one PDF, 11-20 another PDF).
                          </p>
                        </div>
                      )}

                      {splitMethod === 'everyN' && (
                        <div className="space-y-3">
                          <label className="text-[12px] font-bold text-gray-300">Split Every N Pages</label>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              {['2', '5', '10'].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setSplitPagesPerFile(val)}
                                  className={`text-[12px] font-extrabold px-3 py-1.5 rounded-xl border transition-all ${
                                    splitPagesPerFile === val
                                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                      : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white'
                                  }`}
                                >
                                  {val} Pages
                                </button>
                              ))}
                            </div>
                            <div className="flex-1">
                              <Input
                                type="number"
                                min="1"
                                placeholder="Custom number"
                                value={splitPagesPerFile}
                                onChange={(e) => setSplitPagesPerFile(e.target.value)}
                                className="bg-white/[0.02] border-white/[0.08] focus:border-indigo-500/40 text-[13px] h-9 rounded-xl"
                              />
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-500 leading-relaxed">
                            Automatically splits the document sequentially into files containing at most {splitPagesPerFile} pages each.
                          </p>
                        </div>
                      )}

                      {splitMethod === 'individual' && (
                        <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center gap-3">
                          <Scissors className="w-4 h-4 text-indigo-400" />
                          <p className="text-[12px] text-gray-300 font-medium">
                            Generate one PDF per page. A total of <span className="text-indigo-400 font-bold">{splitPdfPageCount > 0 ? splitPdfPageCount : '?'}</span> separate PDF files will be created in a ZIP archive.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Split action controls */}
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={handleResetSplit}
                        variant="ghost"
                        className="h-11 rounded-2xl text-[13px] font-bold text-gray-400 hover:text-white border border-white/[0.06] hover:bg-white/5 flex-1"
                      >
                        Reset PDF
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSplitPDF}
                        disabled={isGeneratingSplit}
                        className="h-11 rounded-2xl text-[13px] font-extrabold bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 text-white shadow-lg shadow-indigo-500/10 flex-[2]"
                      >
                        Split PDF
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* SPLITTING STATE: Spinner Progress bar */}
                {splitState === 'splitting' && (
                  <div className="h-56 flex flex-col items-center justify-center gap-5">
                    {/* Glowing spinner orb */}
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                      <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
                      <div className="absolute inset-2 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <Scissors className="w-5 h-5 text-indigo-400 animate-pulse" />
                      </div>
                    </div>

                    <div className="w-full max-w-sm space-y-2 text-center">
                      <div className="flex items-center justify-between text-[12px] font-semibold text-indigo-400 px-1">
                        <span>{splitStatusText}</span>
                        <span>{splitProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-300"
                          style={{ width: `${splitProgress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 animate-pulse">Running pure local offline PDF slicing...</p>
                    </div>
                  </div>
                )}

                {/* COMPLETE STATE: Success Overlay */}
                {splitState === 'complete' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-3xl space-y-6 text-center"
                  >
                    <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Check className="w-7 h-7 text-emerald-400" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">PDF Split Successfully!</h3>
                      <p className="text-[12px] text-emerald-400/80 font-medium mt-1">
                        Generated {splitFilesGenerated} separate document{splitFilesGenerated > 1 ? 's' : ''}.
                      </p>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-2xl text-left max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Generated PDF Files:</p>
                      {splitDownloadUrls.map((url, i) => {
                        const filename = url.substring(url.lastIndexOf('/') + 1);
                        return (
                          <div key={i} className="flex items-center justify-between gap-3 text-[12px] bg-white/[0.02] border border-white/[0.04] px-3 py-2 rounded-xl">
                            <span className="text-white truncate flex-1 pr-4">{filename}</span>
                            <button
                              onClick={() => window.open(getAssetUrl(url), '_blank')}
                              className="text-indigo-400 hover:text-indigo-300 font-bold text-xs flex items-center gap-1 bg-indigo-500/5 hover:bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/15"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleResetSplit}
                        variant="ghost"
                        className="flex-1 h-11 rounded-2xl text-[13px] font-bold text-gray-400 border border-white/[0.06] hover:text-white hover:bg-white/5"
                      >
                        Split Another PDF
                      </Button>

                      {splitZipUrl && (
                        <Button
                          onClick={() => window.open(getAssetUrl(splitZipUrl), '_blank')}
                          className="flex-1 h-11 rounded-2xl text-[13px] font-bold bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 text-white shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download ZIP
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Chronological History Section */}
                {splitState === 'idle' && (
                  <div className="border-t border-white/[0.06] pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-extrabold text-white tracking-wide">Chronological Splits Ledger</p>
                      <span className="text-[10px] text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded-md">
                        {splitHistory.length} Record{splitHistory.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {splitHistory.length === 0 ? (
                      <div className="p-8 text-center bg-white/[0.01] border border-dashed border-white/[0.06] rounded-2xl">
                        <Clock className="w-7 h-7 text-gray-600 mx-auto mb-2" />
                        <p className="text-[12px] text-gray-500">No prior split sessions logged.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {splitHistory.map((item) => {
                          const dateString = new Date(item.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          // Determine download file target (Zip if multiple, otherwise single PDF)
                          const zipFile = item.generatedFiles.find((f: string) => f.endsWith('.zip'));
                          const pdfFilesOnly = item.generatedFiles.filter((f: string) => f.endsWith('.pdf'));
                          const isZip = !!zipFile;
                          const targetDownloadFile = zipFile || pdfFilesOnly[0];

                          return (
                            <div
                              key={item._id}
                              className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between gap-3 text-[12px] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-white truncate max-w-[280px]">
                                  {item.fileName}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 font-bold">
                                  <span className="text-indigo-400 capitalize">Method: {item.splitMethod}</span>
                                  <span>•</span>
                                  <span>{pdfFilesOnly.length} file{pdfFilesOnly.length !== 1 ? 's' : ''} generated</span>
                                  <span>•</span>
                                  <span>{dateString}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {targetDownloadFile && (
                                  <button
                                    onClick={() => window.open(getAssetUrl(`/tools/download/${targetDownloadFile}`), '_blank')}
                                    className="p-2 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 hover:text-indigo-300 transition-all"
                                    title={isZip ? 'Download ZIP Archive' : 'Download PDF Document'}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteSplitRecord(item._id)}
                                  className="p-2 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 text-rose-400 hover:text-rose-300 transition-all"
                                  title="Delete Record & Disk Assets"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── PDF Merge Modal Workspace ─── */}
      <AnimatePresence>
        {isMergeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with heavy blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleResetMergeConverter}
              className="absolute inset-0 bg-[#070b19]/80 backdrop-blur-xl"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl bg-[#101827]/90 border border-white/[0.08] rounded-[32px] shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh]"
            >
              {/* Glow border */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-60" />

              {/* Modal Header */}
              <div className="p-6 pb-4 flex items-center justify-between border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                    <Layers className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Merge PDF Workspace</h2>
                    <p className="text-[12px] text-gray-400 mt-0.5">Combine up to 50 PDFs (Max 50MB each). Order matters!</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMergeModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* Error Banner */}
                {mergeError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 text-[13px] text-rose-400 font-medium leading-relaxed">
                      {mergeError}
                    </div>
                    <button
                      onClick={() => setMergeError(null)}
                      className="text-rose-400/60 hover:text-rose-400 text-xs font-bold transition-colors ml-2"
                    >
                      Dismiss
                    </button>
                  </motion.div>
                )}

                {/* IDLE STATE: Selection & Upload */}
                {mergeState === 'idle' && (
                  <>
                    <div
                      onDragOver={handleMergeDragOver}
                      onDragLeave={handleMergeDragLeave}
                      onDrop={handleMergeDrop}
                      onClick={() => mergeFileInputRef.current?.click()}
                      className={`relative rounded-[24px] border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center gap-4 cursor-pointer select-none group min-h-[180px] ${
                        isMergeDragOver
                          ? 'border-emerald-500 bg-emerald-500/[0.04] scale-[0.99]'
                          : 'border-white/[0.08] hover:border-emerald-500/40 hover:bg-white/[0.01]'
                      }`}
                    >
                      <input
                        type="file"
                        ref={mergeFileInputRef}
                        onChange={handleMergeFileSelect}
                        multiple
                        accept=".pdf"
                        className="hidden"
                      />
                      
                      <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:scale-105 transition-all duration-300 group-hover:bg-emerald-500/5 group-hover:border-emerald-500/20">
                        <Cloud className="w-6 h-6 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                      </div>

                      <div className="text-center space-y-1">
                        <span className="text-[14px] text-gray-300 font-semibold block group-hover:text-white transition-colors">
                          Drag & drop PDF files here
                        </span>
                        <span className="text-[12px] text-gray-500 block">
                          or <span className="text-emerald-400 underline font-bold group-hover:text-emerald-300 transition-colors">browse files</span> from your computer
                        </span>
                      </div>
                    </div>

                    {/* Selected files with Up/Down sorting and Grip Handles */}
                    {mergeFiles.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                          <span className="font-semibold uppercase tracking-wider">PDFs to Merge ({mergeFiles.length})</span>
                          <button
                            onClick={() => setMergeFiles([])}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors font-bold"
                          >
                            Clear All
                          </button>
                        </div>

                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                          {mergeFiles.map((file, idx) => (
                            <motion.div
                              key={`${file.name}-${idx}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.03] transition-all"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 flex-row">
                                {/* Grip/Drag Handle visual */}
                                <div className="text-gray-600 flex-shrink-0 cursor-grab px-1">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="bg-emerald-500/10 p-2 rounded-lg flex-shrink-0">
                                  <FileText className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="min-w-0 flex-1 ml-2">
                                  <p className="text-[13px] text-gray-200 font-bold truncate max-w-[260px] sm:max-w-[320px]">{file.name}</p>
                                  <p className="text-[11px] text-gray-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                {/* Reordering buttons */}
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveMergeFile(idx, idx - 1);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] transition-all flex items-center justify-center text-gray-400 disabled:opacity-20 disabled:pointer-events-none"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === mergeFiles.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveMergeFile(idx, idx + 1);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] transition-all flex items-center justify-center text-gray-400 disabled:opacity-20 disabled:pointer-events-none"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMergeFile(idx);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 transition-all flex items-center justify-center text-gray-500 ml-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* MERGING STATE */}
                {mergeState === 'merging' && (
                  <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
                    {/* Glowing spinner */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                      <div className="w-16 h-16 rounded-full border-2 border-emerald-500/10 border-t-emerald-400 animate-spin flex items-center justify-center">
                        <Layers className="w-6 h-6 text-emerald-400 animate-bounce" />
                      </div>
                    </div>

                    <div className="w-full max-w-md space-y-3">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-400 font-medium">Merging {mergeFiles.length} PDFs...</span>
                        <span className="text-emerald-400 font-extrabold">{mergeProgress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-full"
                          animate={{ width: `${mergeProgress}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                      <span className="text-[12px] text-gray-500 font-semibold block animate-pulse mt-1.5">{mergeStatusText}</span>
                    </div>
                  </div>
                )}

                {/* COMPLETE STATE */}
                {mergeState === 'complete' && (
                  <div className="space-y-6 py-2">
                    <div className="flex flex-col items-center justify-center text-center space-y-3 pb-2">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Merged Successfully!</h3>
                        <p className="text-[12px] text-emerald-400/80 font-bold mt-0.5">Your combined document is ready to download</p>
                      </div>
                    </div>

                    {/* Merged Document Card */}
                    <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-emerald-500/10 p-2.5 rounded-xl flex-shrink-0">
                          <FileCheck className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-gray-200 truncate max-w-[280px] sm:max-w-[360px]">{mergeOutputName}</p>
                          <p className="text-[11px] text-emerald-400/80 font-semibold mt-0.5">Unified PDF Document</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => triggerDownload(mergeOutputUrl || '')}
                        className="h-9 rounded-xl text-[12px] font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/10 hover:brightness-110 flex items-center gap-2 border-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-6 pt-4 border-t border-white/[0.06] bg-[#0c121e]/85 flex gap-3">
                {mergeState === 'idle' && (
                  <>
                    <Button
                      onClick={() => setIsMergeModalOpen(false)}
                      variant="ghost"
                      className="flex-1 h-11 rounded-2xl text-[13px] font-bold text-gray-400 hover:text-white hover:bg-white/5 border border-white/[0.06]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleMergePDFs}
                      disabled={mergeFiles.length < 2}
                      className="flex-1 h-11 rounded-2xl text-[13px] font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/10 hover:brightness-110 flex items-center justify-center gap-2 border-0 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Merge PDFs
                    </Button>
                  </>
                )}

                {mergeState === 'complete' && (
                  <Button
                    onClick={handleResetMergeConverter}
                    className="w-full h-11 rounded-2xl text-[13px] font-extrabold bg-[#1a253a] hover:bg-[#202d46] border border-white/[0.06] text-white flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Merge Again
                  </Button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── AI Image Generation Modal Workspace ─── */}
      <AnimatePresence>
        {isImageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleResetImageWorkspace}
              className="absolute inset-0 bg-[#070b19]/80 backdrop-blur-xl"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-4xl bg-[#101827]/90 border border-white/[0.08] rounded-[32px] shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh]"
            >
              {/* Top ambient glow */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

              {/* Modal Header */}
              <div className="p-6 pb-4 flex items-center justify-between border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">AI Image Workspace</h2>
                    <p className="text-[12px] text-gray-400 mt-0.5">Generate high-fidelity concept schemas locally using Pollinations AI</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsImageModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* Error Banner */}
                {imageError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 text-[13px] text-rose-400 font-medium leading-relaxed">
                      {imageError}
                    </div>
                    <button
                      onClick={() => setImageError(null)}
                      className="text-rose-400/60 hover:text-rose-400 text-xs font-bold transition-colors ml-2"
                    >
                      Dismiss
                    </button>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Form Parameters */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Prompt input */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Enter Prompt</label>
                      <textarea
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="e.g. detailed diagram of a human heart..."
                        className="w-full min-h-[100px] text-[13px] bg-[#0c1324] border border-white/[0.06] text-white placeholder-gray-600 rounded-2xl p-4 focus:border-indigo-500 focus:ring-0 custom-scrollbar resize-none font-medium"
                      />
                    </div>

                    {/* Example prompts carousel */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block">Try Examples</label>
                      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/5 pr-1">
                        {[
                          { text: "biology heart diagram", label: "Heart Diagram" },
                          { text: "software architecture diagram", label: "Software Arch" },
                          { text: "chemistry molecule infographic", label: "Molecule Info" },
                          { text: "World War II timeline infographic", label: "WWII Timeline" },
                          { text: "human digestive system diagram", label: "Digestive System" }
                        ].map((ex) => (
                          <button
                            key={ex.label}
                            type="button"
                            onClick={() => setImagePrompt(`A highly detailed, professional educational diagram showing the ${ex.text}`)}
                            className="bg-white/[0.02] border border-white/[0.04] hover:bg-indigo-500/10 hover:border-indigo-500/20 text-gray-400 hover:text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all"
                          >
                            {ex.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Options Style Grid */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Image Style</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Educational', 'Diagram', 'Infographic', 'Illustration'].map((styleOpt) => (
                          <button
                            key={styleOpt}
                            type="button"
                            onClick={() => setImageStyle(styleOpt as any)}
                            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                              imageStyle === styleOpt
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                : 'bg-[#0c1324] border-white/[0.06] text-gray-400 hover:bg-white/[0.02]'
                            }`}
                          >
                            {styleOpt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Options Size Row */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Image Size</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Square', 'Portrait', 'Landscape'].map((sizeOpt) => (
                          <button
                            key={sizeOpt}
                            type="button"
                            onClick={() => setImageSize(sizeOpt as any)}
                            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                              imageSize === sizeOpt
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                : 'bg-[#0c1324] border-white/[0.06] text-gray-400 hover:bg-white/[0.02]'
                            }`}
                          >
                            {sizeOpt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => handleGenerateImage()}
                      disabled={isGeneratingImage || imagePrompt.trim().length < 3}
                      className="w-full h-11 rounded-2xl text-[13px] font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md border-0 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 mt-4"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Visual
                    </Button>
                  </div>

                  {/* Right Column: Previews & Loading */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Main Workspace Frame */}
                    <div className="w-full rounded-[24px] bg-[#0c1324]/60 border border-white/[0.06] p-4 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
                      
                      {/* 1. IDLE / NO IMAGE STATE */}
                      {!isGeneratingImage && !generatedImage && (
                        <div className="text-center p-8 space-y-3">
                          <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto text-gray-500">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-300">Ready to Generate</p>
                            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">Enter a description, choose options, and let Pollinations compile your educational art.</p>
                          </div>
                        </div>
                      )}

                      {/* 2. LOADING STATE */}
                      {isGeneratingImage && (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
                          <div className="relative w-20 h-20 flex items-center justify-center">
                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                            <div className="w-16 h-16 rounded-full border-2 border-indigo-500/10 border-t-indigo-400 animate-spin flex items-center justify-center">
                              <Sparkles className="w-6 h-6 text-indigo-400 animate-bounce" />
                            </div>
                          </div>

                          <div className="w-full max-w-xs space-y-3 px-4">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400 font-medium">Generating Visual...</span>
                              <span className="text-indigo-400 font-extrabold">{imageProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all"
                                style={{ width: `${imageProgress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-500 font-semibold block animate-pulse">{imageStatusText}</span>
                          </div>
                        </div>
                      )}

                      {/* 3. GENERATED IMAGE PREVIEW STATE */}
                      {!isGeneratingImage && generatedImage && (
                        <div className="w-full space-y-4">
                          {/* Image view block */}
                          <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-black/40 flex items-center justify-center group/img">
                            <img
                              src={generatedImage.imageUrl}
                              alt={generatedImage.prompt}
                              className={`object-contain max-h-[300px] w-full ${
                                generatedImage.size === 'Portrait'
                                  ? 'aspect-[3/4]'
                                  : generatedImage.size === 'Landscape'
                                  ? 'aspect-[4/3]'
                                  : 'aspect-square'
                              }`}
                            />
                            
                            {/* Actions overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end justify-between p-4 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                              <div className="min-w-0 flex-1 mr-4">
                                <p className="text-[11px] text-gray-400 uppercase tracking-widest font-extrabold">Prompt Query</p>
                                <p className="text-xs text-white font-bold truncate">{generatedImage.prompt}</p>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setFullscreenUrl(generatedImage.imageUrl);
                                    setIsFullscreenOpen(true);
                                  }}
                                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center backdrop-blur-md border border-white/10"
                                  title="Fullscreen Lightbox"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleDownloadImage(generatedImage.imageUrl, generatedImage.prompt, e)}
                                  className="w-8 h-8 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 transition-all flex items-center justify-center backdrop-blur-md border border-indigo-500/20"
                                  title="Download Image"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteImage(generatedImage._id, e)}
                                  className="w-8 h-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/45 text-rose-400 transition-all flex items-center justify-center backdrop-blur-md border border-rose-500/20"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Image metadata card */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
                            <div>
                              <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-extrabold">{generatedImage.style} Style</p>
                              <p className="text-[12px] text-gray-300 font-bold mt-0.5 truncate max-w-[280px] sm:max-w-[340px] italic">"{generatedImage.prompt}"</p>
                            </div>
                            <Button
                              onClick={() => handleGenerateImage(generatedImage.prompt)}
                              size="sm"
                              className="h-8 rounded-xl text-[11px] font-bold bg-[#1a253a] hover:bg-[#202d46] border border-white/[0.06] text-white flex items-center gap-1.5 flex-shrink-0"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Regenerate
                            </Button>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                </div>

                {/* IMAGE HISTORY GRID */}
                {imageHistory.length > 0 && (
                  <div className="pt-6 border-t border-white/[0.06] space-y-3">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block px-1">Visual Generation History ({imageHistory.length})</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {imageHistory.map((item) => (
                        <div
                          key={item._id}
                          onClick={() => setGeneratedImage(item)}
                          className={`relative rounded-2xl overflow-hidden border transition-all cursor-pointer aspect-square bg-[#0c1324] group/history ${
                            generatedImage && generatedImage._id === item._id
                              ? 'border-indigo-500 shadow-md shadow-indigo-500/10'
                              : 'border-white/[0.06] hover:border-white/20'
                          }`}
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.prompt}
                            className="w-full h-full object-cover group-hover/history:scale-105 transition-all"
                          />
                          
                          {/* Mini hover actions */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/history:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFullscreenUrl(item.imageUrl);
                                setIsFullscreenOpen(true);
                              }}
                              className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-all"
                            >
                              <Maximize2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDownloadImage(item.imageUrl, item.prompt, e)}
                              className="p-1 rounded-md bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 transition-all"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteImage(item._id, e)}
                              className="p-1 rounded-md bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-6 pt-4 border-t border-white/[0.06] bg-[#0c121e]/85 flex">
                <Button
                  onClick={handleResetImageWorkspace}
                  className="w-full h-11 rounded-2xl text-[13px] font-extrabold bg-[#1a253a] hover:bg-[#202d46] border border-white/[0.06] text-white flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Reset Workspace
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── AI Diagram & Flowchart Generator Modal Workspace ─── */}
      <AnimatePresence>
        {isDiagramModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleResetDiagramWorkspace}
              className="absolute inset-0 bg-[#070b19]/80 backdrop-blur-xl"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-5xl bg-[#101827]/90 border border-white/[0.08] rounded-[32px] shadow-2xl overflow-hidden flex flex-col z-10 max-h-[92vh]"
            >
              {/* Top ambient glow */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

              {/* Modal Header */}
              <div className="p-6 pb-4 flex items-start justify-between border-b border-white/[0.06]">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20 mt-1">
                    <GitBranch className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">AI Diagram & Flowchart Generator</h2>
                    <p className="text-[13px] text-gray-400 mt-1 max-w-2xl leading-relaxed">
                      Describe any process, topic, workflow, system, roadmap, or concept and AI will automatically create professional diagrams.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDiagramModalOpen(false)}
                  className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Supported Diagrams Chips Row */}
              <div className="px-6 py-3 bg-[#0a0f1d]/40 border-b border-white/[0.04] flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold flex-shrink-0">Supported Layouts:</span>
                {[
                  "Flowchart",
                  "Mind Map",
                  "Class Diagram",
                  "ER Diagram",
                  "Sequence Diagram",
                  "State Diagram",
                  "Process Map",
                  "Learning Roadmap"
                ].map((chip) => (
                  <span
                    key={chip}
                    className="text-[11px] font-semibold bg-indigo-500/5 border border-indigo-500/10 text-indigo-300/80 px-2.5 py-0.5 rounded-full whitespace-nowrap"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* Error Banner */}
                {diagramError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 text-[13px] text-rose-400 font-medium leading-relaxed">
                      {diagramError}
                    </div>
                    <button
                      onClick={() => setDiagramError(null)}
                      className="text-rose-400/60 hover:text-rose-400 text-xs font-bold transition-colors ml-2"
                    >
                      Dismiss
                    </button>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Input Form (span 5) */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Prompt text area */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Describe What You Want to Visualize</label>
                      <textarea
                        value={diagramPrompt}
                        onChange={(e) => setDiagramPrompt(e.target.value)}
                        placeholder="Describe what you want to visualize..."
                        className="w-full min-h-[120px] text-[13px] bg-[#0c1324] border border-white/[0.06] text-white placeholder-gray-600 rounded-2xl p-4 focus:border-indigo-500 focus:ring-0 custom-scrollbar resize-none font-medium leading-relaxed"
                      />
                    </div>

                    {/* Try Examples */}
                    <div className="space-y-2">
                      <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block">Try Examples</label>
                      <div className="flex flex-col gap-1.5">
                        {[
                          { text: "Create a flowchart for online shopping checkout.", label: "Shopping Checkout Flow" },
                          { text: "Show the water cycle using a mindmap.", label: "Water Cycle" },
                          { text: "Create a React learning roadmap.", label: "React Learning Roadmap" },
                          { text: "Generate a class diagram for a library management system.", label: "Library Class Diagram" },
                          { text: "Create an ER diagram for an e-commerce database.", label: "E-Commerce ER Diagram" }
                        ].map((ex) => (
                          <button
                            key={ex.label}
                            type="button"
                            onClick={() => setDiagramPrompt(ex.text)}
                            className="bg-white/[0.02] border border-white/[0.04] hover:bg-indigo-500/10 hover:border-indigo-500/20 text-gray-400 hover:text-indigo-300 text-left text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                          >
                            {ex.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Diagram Type selection */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Diagram Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Auto Detect', 'Flowchart', 'Mind Map', 'Class Diagram', 'ER Diagram', 'Sequence Diagram', 'Roadmap'].map((typeOpt) => (
                          <button
                            key={typeOpt}
                            type="button"
                            onClick={() => setDiagramType(typeOpt as any)}
                            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                              diagramType === typeOpt
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                : 'bg-[#0c1324] border-white/[0.06] text-gray-400 hover:bg-white/[0.02]'
                            }`}
                          >
                            {typeOpt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Output format selection */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Preferred Output Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['SVG', 'PNG'].map((formatOpt) => (
                          <button
                            key={formatOpt}
                            type="button"
                            onClick={() => setDiagramFormat(formatOpt as any)}
                            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                              diagramFormat === formatOpt
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                : 'bg-[#0c1324] border-white/[0.06] text-gray-400 hover:bg-white/[0.02]'
                            }`}
                          >
                            {formatOpt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* CTA Generation Trigger */}
                    <Button
                      onClick={() => handleGenerateDiagram()}
                      disabled={isGeneratingDiagram || diagramPrompt.trim().length < 3}
                      className="w-full h-12 rounded-2xl text-[13px] font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md border-0 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 mt-4"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Diagram
                    </Button>
                  </div>

                  {/* Right Column: Previews, Code tabs & Loaders (span 7) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="w-full rounded-[24px] bg-[#0c1324]/60 border border-white/[0.06] p-5 min-h-[380px] flex flex-col relative overflow-hidden">
                      
                      {/* 1. IDLE STATE */}
                      {!isGeneratingDiagram && !generatedDiagram && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                          <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-gray-500">
                            <GitBranch className="w-7 h-7" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-300">Ready to Visualize</p>
                            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                              Explain your process or concepts. The Gemini AI will synthesize structural architecture and compile full-resolution vector flows instantly.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 2. LOADING STATE */}
                      {isGeneratingDiagram && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
                          <div className="relative w-20 h-20 flex items-center justify-center">
                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                            <div className="w-16 h-16 rounded-full border-2 border-indigo-500/10 border-t-indigo-400 animate-spin flex items-center justify-center">
                              <GitBranch className="w-6 h-6 text-indigo-400 animate-bounce" />
                            </div>
                          </div>

                          <div className="w-full max-w-sm space-y-3 px-4">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400 font-bold">Synthesizing Diagram Assets...</span>
                              <span className="text-indigo-400 font-extrabold">{diagramProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all"
                                style={{ width: `${diagramProgress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-500 font-semibold block animate-pulse">{diagramStatusText}</span>
                          </div>
                        </div>
                      )}

                      {/* 3. DIAGRAM RESULT RENDER WORKSPACE */}
                      {!isGeneratingDiagram && generatedDiagram && (
                        <div className="flex-1 flex flex-col space-y-4">
                          {/* Render & Code Tabs */}
                          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <div className="flex gap-2">
                              {['Rendered', 'Code'].map((tabOpt) => (
                                <button
                                  key={tabOpt}
                                  onClick={() => setDiagramActiveTab(tabOpt as any)}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                                    diagramActiveTab === tabOpt
                                      ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                      : 'bg-[#0c1324]/40 border-transparent text-gray-400 hover:text-white'
                                  }`}
                                >
                                  {tabOpt === 'Rendered' ? 'Rendered Diagram' : 'Mermaid Code'}
                                </button>
                              ))}
                            </div>
                            
                            <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-extrabold bg-indigo-500/5 border border-indigo-500/10 px-2 py-0.5 rounded-md">
                              {generatedDiagram.diagramType}
                            </span>
                          </div>

                          {/* Rendered Diagram tab content */}
                          {diagramActiveTab === 'Rendered' && (
                            <div className="flex-1 min-h-[300px] flex items-center justify-center relative bg-black/35 rounded-2xl overflow-hidden border border-white/[0.04] p-4">
                              <img
                                src={getAssetUrl(generatedDiagram.svgUrl)}
                                alt={generatedDiagram.prompt}
                                className="max-w-full max-h-[340px] object-contain select-none"
                              />
                            </div>
                          )}

                          {/* Mermaid Code tab content */}
                          {diagramActiveTab === 'Code' && (
                            <div className="flex-1 min-h-[300px] flex flex-col bg-black/40 border border-white/[0.04] rounded-2xl overflow-hidden relative">
                              <pre className="flex-1 overflow-auto p-4 text-[12px] text-indigo-300 font-mono custom-scrollbar text-left max-h-[320px]">
                                {generatedDiagram.mermaidCode}
                              </pre>
                              <button
                                onClick={() => handleCopyMermaidCode(generatedDiagram.mermaidCode)}
                                className="absolute top-3 right-3 text-[11px] font-bold text-gray-400 hover:text-white bg-[#101827]/80 hover:bg-[#1a253a] border border-white/[0.06] px-2.5 py-1.5 rounded-xl transition-all"
                              >
                                Copy Syntax
                              </button>
                            </div>
                          )}

                          {/* Action Button Row */}
                          <div className="flex flex-wrap gap-2.5 pt-2">
                            <Button
                              onClick={(e) => handleDownloadDiagramFile(generatedDiagram.svgUrl, generatedDiagram.prompt, 'svg', e)}
                              className="h-10 rounded-xl text-xs font-bold bg-[#1a253a] hover:bg-[#202d46] border border-white/[0.06] text-white flex items-center gap-1.5 flex-1 justify-center"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download SVG
                            </Button>
                            <Button
                              onClick={(e) => handleDownloadDiagramFile(generatedDiagram.pngUrl, generatedDiagram.prompt, 'png', e)}
                              className="h-10 rounded-xl text-xs font-bold bg-[#1a253a] hover:bg-[#202d46] border border-white/[0.06] text-white flex items-center gap-1.5 flex-1 justify-center"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download PNG
                            </Button>
                            <Button
                              onClick={() => handleCopyMermaidCode(generatedDiagram.mermaidCode)}
                              className="h-10 rounded-xl text-xs font-bold bg-[#1a253a] hover:bg-[#202d46] border border-white/[0.06] text-white flex items-center gap-1.5 flex-1 justify-center"
                            >
                              Copy Mermaid Code
                            </Button>
                            <Button
                              onClick={() => handleGenerateDiagram(generatedDiagram.prompt)}
                              className="h-10 rounded-xl text-xs font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-md flex-1 flex items-center gap-1.5 justify-center"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Generate Again
                            </Button>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                </div>

                {/* DIAGRAM HISTORY GRID */}
                {diagramHistory.length > 0 && (
                  <div className="pt-6 border-t border-white/[0.06] space-y-3">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block px-1">Visual Diagram History ({diagramHistory.length})</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[220px] overflow-y-auto pr-1">
                      {diagramHistory.map((item) => (
                        <div
                          key={item._id}
                          onClick={() => setGeneratedDiagram(item)}
                          className={`relative rounded-2xl overflow-hidden border transition-all cursor-pointer aspect-[4/3] bg-[#0c1324] flex items-center justify-center p-3 group/history ${
                            generatedDiagram && generatedDiagram._id === item._id
                              ? 'border-indigo-500 shadow-md shadow-indigo-500/10'
                              : 'border-white/[0.06] hover:border-white/20'
                          }`}
                        >
                          {/* Mini SVG Preview */}
                          <img
                            src={getAssetUrl(item.svgUrl)}
                            alt={item.prompt}
                            className="max-w-full max-h-full object-contain brightness-95 group-hover/history:scale-105 transition-all select-none"
                          />
                          
                          {/* Hover action mask overlay */}
                          <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/history:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5">
                            <span className="text-[10px] text-white font-bold truncate block w-full mb-1">"{item.prompt}"</span>
                            <span className="text-[9px] text-indigo-400 font-extrabold block mb-2">{item.diagramType}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => handleDownloadDiagramFile(item.svgUrl, item.prompt, 'svg', e)}
                                className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-all flex-1 flex justify-center"
                                title="Download SVG"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyMermaidCode(item.mermaidCode);
                                }}
                                className="p-1 rounded-md bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 transition-all flex-1 flex justify-center font-bold text-[9px]"
                                title="Copy Mermaid Syntax"
                              >
                                Code
                              </button>
                              <button
                                onClick={(e) => handleDeleteDiagram(item._id, e)}
                                className="p-1 rounded-md bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 transition-all flex-1 flex justify-center"
                                title="Delete Log"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-6 pt-4 border-t border-white/[0.06] bg-[#0c121e]/85 flex">
                <Button
                  onClick={handleResetDiagramWorkspace}
                  className="w-full h-11 rounded-2xl text-[13px] font-extrabold bg-[#1a253a] hover:bg-[#202d46] border border-white/[0.06] text-white flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Reset Workspace
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── AI Presentation Generator Modal Workspace ─── */}
      <AnimatePresence>
        {isPptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with heavy blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleResetPptWorkspace} // Reset and close
              className="absolute inset-0 bg-[#070b19]/80 backdrop-blur-xl"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-4xl bg-[#101827]/90 border border-white/[0.08] rounded-[32px] shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh]"
            >
              {/* Top ambient glow line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

              {/* Modal Header */}
              <div className="p-6 pb-4 flex items-center justify-between border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                    <BarChart3 className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">AI Presentation Workspace</h2>
                    <p className="text-[12px] text-gray-400 mt-0.5">Turn raw notes or documents into professional presentation slide decks</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPptModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* 1. Error boundary banner */}
                {pptError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 text-[13px] text-rose-400 font-medium leading-relaxed">
                      {pptError}
                    </div>
                    <button
                      onClick={() => setPptError(null)}
                      className="text-rose-400/60 hover:text-rose-400 text-xs font-bold transition-colors ml-2"
                    >
                      Dismiss
                    </button>
                  </motion.div>
                )}

                {/* 2. IDLE STATE: Parameter Setup Workspace */}
                {!isGeneratingPpt && !generatedPpt && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left: Input Selection (7 Columns) */}
                    <div className="lg:col-span-7 space-y-5">
                      
                      {/* Three Input Methods Selector Tabs */}
                      <div className="flex gap-1.5 p-1 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
                        {(['docx', 'library', 'text'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setPptSourceTab(tab)}
                            className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all ${
                              pptSourceTab === tab
                                ? 'bg-indigo-500 text-white shadow-md'
                                : 'text-gray-400 hover:text-white bg-transparent'
                            }`}
                          >
                            {tab === 'docx' ? 'Upload Word Document' : tab === 'library' ? 'Use Existing Notes' : 'Paste Content'}
                          </button>
                        ))}
                      </div>

                      {/* TAB CONTENT 1: Upload Word Document */}
                      {pptSourceTab === 'docx' && (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsPptDragOver(true); }}
                          onDragLeave={() => setIsPptDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsPptDragOver(false);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              const f = e.dataTransfer.files[0];
                              if (f.name.endsWith('.docx')) setPptUploadFile(f);
                              else setPptError("Only Word documents (.docx) are supported.");
                            }
                          }}
                          onClick={() => pptFileInputRef.current?.click()}
                          className={`rounded-2xl border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[220px] ${
                            isPptDragOver
                              ? 'border-indigo-500 bg-indigo-500/[0.04]'
                              : 'border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.01]'
                          }`}
                        >
                          <input
                            type="file"
                            ref={pptFileInputRef}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setPptUploadFile(e.target.files[0]);
                              }
                            }}
                            accept=".docx"
                            className="hidden"
                          />
                          
                          <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                            <Cloud className="w-6 h-6 text-gray-400" />
                          </div>

                          {pptUploadFile ? (
                            <div className="text-center space-y-1">
                              <span className="text-[14px] text-emerald-400 font-bold block">
                                Word Document Selected ✓
                              </span>
                              <span className="text-[12px] text-gray-300 block font-semibold truncate max-w-[280px]">
                                {pptUploadFile.name}
                              </span>
                              <span className="text-[11px] text-gray-500 block">
                                ({(pptUploadFile.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                          ) : (
                            <div className="text-center space-y-1">
                              <span className="text-[14px] text-gray-300 font-semibold block">
                                Drag & drop Word document (.docx)
                              </span>
                              <span className="text-[12px] text-gray-500 block">
                                or <span className="text-indigo-400 underline font-bold">browse files</span>
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB CONTENT 2: Use Existing Notes */}
                      {pptSourceTab === 'library' && (
                        <div className="space-y-3">
                          <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Choose from notes library:</label>
                          {libraryNotes.length === 0 ? (
                            <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/[0.05] text-gray-500 text-xs font-semibold">
                              No notes found in your library. Please generate some notes first on the Dashboard!
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                              {libraryNotes.map((note) => (
                                <div
                                  key={note._id}
                                  onClick={() => setSelectedNoteId(note._id)}
                                  className={`flex items-center justify-between p-3.5 bg-white/[0.02] border rounded-2xl cursor-pointer hover:bg-white/[0.04] transition-all ${
                                    selectedNoteId === note._id
                                      ? 'border-indigo-500 bg-indigo-500/[0.02]'
                                      : 'border-white/[0.04]'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="bg-indigo-500/10 p-2 rounded-lg flex-shrink-0">
                                      <FileText className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[13px] text-gray-200 font-bold truncate">{note.topic}</p>
                                      <p className="text-[10px] text-gray-500 mt-0.5">Exam: {note.examType}  |  Level: {note.classLevel}</p>
                                    </div>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                    selectedNoteId === note._id ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-white/10'
                                  }`}>
                                    {selectedNoteId === note._id && <Check className="w-3.5 h-3.5" />}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB CONTENT 3: Paste Content Area */}
                      {pptSourceTab === 'text' && (
                        <div className="space-y-3">
                          <textarea
                            value={pptRawText}
                            onChange={(e) => setPptRawText(e.target.value)}
                            placeholder="Paste notes, assignment content, report outline, study guide, or research highlights here..."
                            className="w-full h-[220px] rounded-2xl bg-[#0c121e]/80 border border-white/[0.08] p-4 text-[13px] text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 resize-none custom-scrollbar"
                          />
                        </div>
                      )}

                    </div>

                    {/* Right: Presentation Configuration Parameters (5 Columns) */}
                    <div className="lg:col-span-5 space-y-5 bg-[#0b101a]/40 border border-white/[0.04] p-5 rounded-[24px]">
                      
                      {/* Configuration Parameter: Style Selection */}
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Presentation Style</label>
                        <select
                          value={pptStyle}
                          onChange={(e) => setPptStyle(e.target.value)}
                          className="w-full h-10 rounded-xl bg-[#111926] border border-white/[0.08] px-3 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/50"
                        >
                          {['Academic', 'Student', 'Professional', 'Corporate', 'Modern Startup'].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Configuration Parameter: Theme Palette Swatches */}
                      <div className="space-y-2.5">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Theme Colors</label>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { name: 'Light', hex: '#FFFFFF', color: 'bg-white border-white/20' },
                            { name: 'Dark', hex: '#0F172A', color: 'bg-[#0f172a] border-[#0f172a]' },
                            { name: 'Purple', hex: '#120B24', color: 'bg-[#7c3aed] border-[#7c3aed]' },
                            { name: 'Blue', hex: '#031022', color: 'bg-[#0284c7] border-[#0284c7]' },
                            { name: 'Green', hex: '#041E15', color: 'bg-[#059669] border-[#059669]' }
                          ].map((t) => (
                            <button
                              key={t.name}
                              type="button"
                              onClick={() => setPptTheme(t.name)}
                              className={`h-9 rounded-xl border relative flex items-center justify-center transition-all ${
                                pptTheme === t.name
                                  ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#101827] scale-105'
                                  : 'hover:scale-102 hover:brightness-110'
                              }`}
                              title={`${t.name} Theme`}
                            >
                              <div className={`w-6 h-6 rounded-lg ${t.color}`} />
                              {pptTheme === t.name && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Configuration Parameter: Slide Count */}
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Slide Count</label>
                        <div className="grid grid-cols-5 gap-1.5 p-1 bg-[#111926] border border-white/[0.08] rounded-xl">
                          {['Auto', '5', '10', '15', '20'].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setPptSlideCount(val === 'Auto' ? 'Auto' : `${val} Slides`)}
                              className={`text-[10px] font-extrabold py-1.5 rounded-lg transition-all ${
                                (val === 'Auto' && pptSlideCount === 'Auto') || (val !== 'Auto' && pptSlideCount === `${val} Slides`)
                                  ? 'bg-indigo-500 text-white shadow-sm'
                                  : 'text-gray-400 hover:text-white bg-transparent'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Include Checklist toggles */}
                      <div className="space-y-3 pt-2">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Features to Include</label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {[
                            { label: 'Diagrams', state: pptIncludeDiagrams, setState: setPptIncludeDiagrams },
                            { label: 'Data Charts', state: pptIncludeCharts, setState: setPptIncludeCharts },
                            { label: 'Speaker Notes', state: pptIncludeSpeakerNotes, setState: setPptIncludeSpeakerNotes },
                            { label: 'Takeaway Slide', state: pptIncludeSummary, setState: setPptIncludeSummary }
                          ].map((feat) => (
                            <button
                              key={feat.label}
                              type="button"
                              onClick={() => feat.setState(!feat.state)}
                              className={`h-9 px-3 rounded-xl border flex items-center gap-2 transition-all ${
                                feat.state
                                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold'
                                  : 'bg-[#111926]/40 border-white/[0.04] text-gray-400 hover:text-white'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                                feat.state ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-white/20'
                              }`}>
                                {feat.state && <Check className="w-2.5 h-2.5" />}
                              </div>
                              {feat.label}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>

                  </div>
                )}

                {/* 3. GENERATING LOADING ORB STATE */}
                {isGeneratingPpt && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <div className="absolute inset-0 bg-indigo-500/25 rounded-full blur-2xl animate-pulse" />
                      <div className="w-20 h-20 rounded-full border-4 border-indigo-500/10 border-t-indigo-400 animate-spin flex items-center justify-center">
                        <BarChart3 className="w-8 h-8 text-indigo-400 animate-bounce" />
                      </div>
                    </div>

                    <div className="w-full max-w-md space-y-3">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-400 font-medium truncate max-w-[70%]">Synthesizing visual slides...</span>
                        <span className="text-indigo-400 font-extrabold">{pptProgress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-full"
                          animate={{ width: `${pptProgress}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                      <span className="text-[12px] text-gray-500 font-semibold block animate-pulse mt-1.5">{pptStatusText}</span>
                    </div>
                  </div>
                )}

                {/* 4. SUCCESS STATE: SLIDE PREVIEW DECK WORKSPACE */}
                {!isGeneratingPpt && generatedPpt && (
                  <div className="space-y-6">
                    
                    <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-bold text-white leading-tight">Presentation Generated Successfully!</h3>
                          <div className="flex gap-2 text-[10px] text-emerald-400/80 font-bold mt-1 uppercase tracking-wider">
                            <span>Decks Count: {generatedPpt.slidesCount} Slides</span>
                            <span>•</span>
                            <span>Theme: {generatedPpt.theme}</span>
                            <span>•</span>
                            <span>Style: {generatedPpt.presentationStyle}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2.5">
                        <Button
                          onClick={(e) => handleDownloadPptFile(generatedPpt.downloadUrl, generatedPpt.title, e)}
                          className="h-10 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 shadow-md shadow-emerald-500/10 hover:brightness-110 flex items-center gap-1.5 px-4"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download PowerPoint (.pptx)
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block px-1">Interactive Slides Preview ({generatedPpt.slides?.length || 0})</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {generatedPpt.slides?.map((slide: any, idx: number) => {
                          const isDark = generatedPpt.theme !== 'Light';
                          const accentColors: Record<string, string> = {
                            Light: 'text-[#4F46E5]',
                            Dark: 'text-[#818CF8]',
                            Purple: 'text-[#D946EF]',
                            Blue: 'text-[#0EA5E9]',
                            Green: 'text-[#10B981]'
                          };
                          const activeAccent = accentColors[generatedPpt.theme] || 'text-[#4F46E5]';

                          return (
                            <div
                              key={idx}
                              className={`rounded-2xl border p-4 aspect-[16/9] flex flex-col justify-between text-left select-none relative overflow-hidden transition-all ${
                                isDark 
                                  ? 'bg-[#0f172a] border-white/[0.06] text-white' 
                                  : 'bg-white border-gray-200 text-slate-900 shadow-sm'
                              }`}
                            >
                              {slide.type === 'cover' && (
                                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-500" />
                              )}
                              
                              <div className="min-w-0">
                                <span className={`text-[9px] uppercase tracking-widest font-extrabold block opacity-60 mb-1 ${activeAccent}`}>
                                  Slide {idx + 1} • {slide.type}
                                </span>
                                <h4 className="text-[12px] font-bold truncate pr-4">{slide.title}</h4>
                                <p className="text-[9px] opacity-70 mt-1 line-clamp-3 leading-relaxed">
                                  {slide.subtitle || (slide.content && slide.content[0]) || (slide.process && slide.process[0]?.title) || (slide.timeline && slide.timeline[0]?.milestone) || "Slide outline content visually structured."}
                                </p>
                              </div>

                              <div className="flex items-center justify-between border-t border-white/[0.04] pt-2 mt-2">
                                <span className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider">Type: {slide.type}</span>
                                {slide.speakerNotes && (
                                  <span className="text-[8px] text-indigo-400/80 font-bold" title={slide.speakerNotes}>📝 Notes Included</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* 5. CHRONOLOGICAL PRESENTATION HISTORY STRIP */}
                {!isGeneratingPpt && pptHistory.length > 0 && (
                  <div className="pt-6 border-t border-white/[0.06] space-y-3">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block px-1">Presentation Library Logs ({pptHistory.length})</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                      {pptHistory.map((item) => (
                        <div
                          key={item._id}
                          className={`rounded-2xl border p-3.5 bg-white/[0.02] border-white/[0.06] hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between text-left group relative`}
                        >
                          <div className="min-w-0">
                            <h4 className="text-[13px] font-bold text-gray-200 truncate pr-6 group-hover:text-white">{item.title}</h4>
                            <p className="text-[10px] text-gray-500 mt-1 font-semibold">{item.slidesCount} Slides  |  Style: {item.presentationStyle}</p>
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-white/[0.04]">
                            <span className="text-[9px] text-gray-600 font-bold">{new Date(item.createdAt).toLocaleDateString()}</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={(e) => handleDownloadPptFile(item.downloadUrl, item.title, e)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                title="Download Slide Deck (.pptx)"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeletePpt(item._id, e)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                                title="Delete PowerPoint Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-6 pt-4 border-t border-white/[0.06] bg-[#0c121e]/85 flex gap-3">
                {!isGeneratingPpt && !generatedPpt && (
                  <>
                    <Button
                      onClick={() => setIsPptModalOpen(false)}
                      variant="ghost"
                      className="flex-1 h-11 rounded-2xl text-[13px] font-bold text-gray-400 hover:text-white hover:bg-white/5 border border-white/[0.06]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGeneratePpt}
                      disabled={
                        (pptSourceTab === 'docx' && !pptUploadFile) ||
                        (pptSourceTab === 'library' && !selectedNoteId) ||
                        (pptSourceTab === 'text' && !pptRawText.trim())
                      }
                      className="flex-1 h-11 rounded-2xl text-[13px] font-extrabold bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/10 hover:brightness-110 flex items-center justify-center gap-2 border-0 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Presentation
                    </Button>
                  </>
                )}

                {!isGeneratingPpt && generatedPpt && (
                  <Button
                    onClick={handleResetPptWorkspace}
                    className="w-full h-11 rounded-2xl text-[13px] font-extrabold bg-[#1a253a] hover:bg-[#202d46] border border-white/[0.06] text-white flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Generate Another Presentation
                  </Button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Fullscreen Lightbox Overlay ─── */}
      <AnimatePresence>
        {isFullscreenOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFullscreenOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm cursor-zoom-out"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[90vh] z-10 flex flex-col items-center justify-center"
            >
              <button
                onClick={() => setIsFullscreenOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/60 border border-white/10 hover:bg-black/80 hover:border-white/20 transition-all flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
              
              <img
                src={fullscreenUrl}
                alt="Fullscreen Visual preview"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Footer Section ─── */}
      <footer className="mt-16 pt-8 border-t border-white/[0.04] select-none">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <span className="font-bold text-white text-sm tracking-tight font-sans">ExamNotes AI</span>
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

    </div>
  );
}
