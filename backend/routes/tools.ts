import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn, exec } from 'child_process';
import util from 'util';
import archiver from 'archiver';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { PDFDocument } from 'pdf-lib';
import ImageHistory from '../models/ImageHistory';
import DiagramHistory from '../models/DiagramHistory';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pptxgen from 'pptxgenjs';
import mammoth from 'mammoth';
import PresentationHistory from '../models/PresentationHistory';
import User from '../models/User';
import Note from '../models/Note';
import SplitHistory from '../models/SplitHistory';

const execPromise = util.promisify(exec);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const router = express.Router();

// Define input and output directory paths
const INPUT_DIR = path.join(__dirname, '../../uploads/pdf-to-word/input');
const OUTPUT_DIR = path.join(__dirname, '../../uploads/pdf-to-word/output');
const MERGED_INPUT_DIR = path.join(__dirname, '../../uploads/merged/input');
const MERGED_OUTPUT_DIR = path.join(__dirname, '../../uploads/merged/output');
const DIAGRAM_OUTPUT_DIR = path.join(__dirname, '../../uploads/diagrams');
const PRESENTATIONS_DIR = path.join(__dirname, '../../uploads/presentations');
const SPLIT_INPUT_DIR = path.join(__dirname, '../../uploads/split-pdf/input');
const SPLIT_OUTPUT_DIR = path.join(__dirname, '../../uploads/split-pdf/output');

// Ensure storage directories exist securely
fs.mkdirSync(INPUT_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(MERGED_INPUT_DIR, { recursive: true });
fs.mkdirSync(MERGED_OUTPUT_DIR, { recursive: true });
fs.mkdirSync(DIAGRAM_OUTPUT_DIR, { recursive: true });
fs.mkdirSync(PRESENTATIONS_DIR, { recursive: true });
fs.mkdirSync(SPLIT_INPUT_DIR, { recursive: true });
fs.mkdirSync(SPLIT_OUTPUT_DIR, { recursive: true });

// Configure Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, INPUT_DIR);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent directory injection or special char issues
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 100);
    cb(null, `${baseName}_${Date.now()}${ext}`);
  }
});

// Configure Multer limits and filters
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit per file
    files: 5 // Maximum 5 files uploaded at once
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' || file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files (.pdf) are allowed.'));
    }
    cb(null, true);
  }
});

// Configure Multer storage engine for Merge PDF
const storageMerge = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MERGED_INPUT_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 100);
    cb(null, `${baseName}_${Date.now()}${ext}`);
  }
});

// Configure Multer limits and filters for Merge PDF (Max 50MB per file, Max 50 files)
const uploadMerge = multer({
  storage: storageMerge,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 50 // Max 50 files at once
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' || file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files (.pdf) are allowed.'));
    }
    cb(null, true);
  }
});

// Configure Multer storage engine for Split PDF
const storageSplit = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SPLIT_INPUT_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 100);
    cb(null, `split_${baseName}_${Date.now()}${ext}`);
  }
});

// Configure Multer limits and filters for Split PDF (Max 30MB, single file)
const uploadSplit = multer({
  storage: storageSplit,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB limit
    files: 1 // Single file upload
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' || file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files (.pdf) are allowed.'));
    }
    cb(null, true);
  }
});


// Helper function to run the python pdf_to_word script in a child process
const convertSinglePdf = (pdfPath: string, docxPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(__dirname, '../scripts/pdf_to_word.py');

    console.log(`[CONVERSION] Starting conversion: ${pdfPath} -> ${docxPath}`);
    const pyProcess = spawn(pythonExecutable, [scriptPath, pdfPath, docxPath]);

    let stderrData = '';
    
    pyProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`[CONVERSION] Successfully converted: ${docxPath}`);
        resolve();
      } else {
        console.error(`[CONVERSION] Python script failed with code ${code}. Error: ${stderrData}`);
        reject(new Error(stderrData || `Conversion failed with exit code ${code}`));
      }
    });

    pyProcess.on('error', (err) => {
      console.error(`[CONVERSION] Failed to start python process:`, err);
      reject(err);
    });
  });
};

// Route 1: PDF to Word Conversion endpoint
router.post('/pdf-to-word', verifyToken, (req: AuthRequest, res: any, next: any) => {
  // Handle multer upload wrapper safely to return custom express error payloads
  upload.array('files', 5)(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Maximum 5 files can be uploaded at once.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const conversions: { originalName: string; filename: string; downloadUrl: string }[] = [];
    const createdFiles: string[] = []; // To keep track of files to delete in cleanup schedule

    try {
      // Process files sequentially to prevent server memory exhaustion
      for (const file of files) {
        const docxFilename = `${path.basename(file.filename, '.pdf')}.docx`;
        const inputPdfPath = file.path;
        const outputDocxPath = path.join(OUTPUT_DIR, docxFilename);

        try {
          await convertSinglePdf(inputPdfPath, outputDocxPath);
          createdFiles.push(outputDocxPath);

          conversions.push({
            originalName: file.originalname,
            filename: docxFilename,
            downloadUrl: `/api/tools/download/${docxFilename}`
          });
        } catch (convErr: any) {
          console.error(`[CONVERSION] Individual file conversion failed: ${file.originalname}`, convErr);
          throw new Error(`Failed to convert "${file.originalname}": ${convErr.message}`);
        } finally {
          // Instantly delete the raw uploaded input PDF file to protect user privacy and save space
          try {
            if (fs.existsSync(inputPdfPath)) {
              fs.unlinkSync(inputPdfPath);
            }
          } catch (unlinkErr) {
            console.warn(`[CLEANUP] Failed to remove input PDF: ${inputPdfPath}`, unlinkErr);
          }
        }
      }

      // If multiple PDFs were uploaded, bundle all generated DOCX files into a ZIP archive
      let zipUrl: string | null = null;
      if (files.length > 1) {
        const zipFilename = `conversions_${Date.now()}.zip`;
        const zipFilePath = path.join(OUTPUT_DIR, zipFilename);
        
        await new Promise<void>((resolveZip, rejectZip) => {
          const outputStream = fs.createWriteStream(zipFilePath);
          const archive = archiver('zip', { zlib: { level: 9 } });

          outputStream.on('close', () => {
            console.log(`[ZIP] Successfully archived multiple files into: ${zipFilePath}`);
            createdFiles.push(zipFilePath);
            resolveZip();
          });

          archive.on('error', (archErr) => {
            console.error(`[ZIP] Archive error:`, archErr);
            rejectZip(archErr);
          });

          archive.pipe(outputStream);

          // Append each converted DOCX file to the zip
          conversions.forEach((conv) => {
            const filePath = path.join(OUTPUT_DIR, conv.filename);
            archive.file(filePath, { name: conv.originalName.replace(/\.pdf$/i, '.docx') });
          });

          archive.finalize();
        });

        zipUrl = `/api/tools/download/${zipFilename}`;
      }

      // Schedule background cleanup for converted DOCX/ZIP files after 30 minutes
      const cleanupFiles = [...createdFiles];
      setTimeout(() => {
        cleanupFiles.forEach((filePath) => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`[AUTO-CLEANUP] Deleted conversion file: ${path.basename(filePath)}`);
            }
          } catch (cleanupErr) {
            console.error(`[AUTO-CLEANUP] Failed to delete file: ${filePath}`, cleanupErr);
          }
        });
      }, 30 * 60 * 1000); // 30 minutes

      return res.json({
        success: true,
        message: 'Conversion completed successfully.',
        conversions,
        zipUrl
      });
    } catch (err: any) {
      console.error('[CONVERSION] Unified conversion loop failed:', err);
      
      // Cleanup any output files created before failure
      createdFiles.forEach((filePath) => {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {}
      });

      return res.status(500).json({ error: err.message || 'Conversion failed. Please try again.' });
    }
  });
});

// Route 2: Merge PDF endpoint (Max 50 files, Max 50MB per file, using pdf-lib)
router.post('/merge-pdf', verifyToken, (req: AuthRequest, res: any) => {
  uploadMerge.array('files', 50)(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size is 50MB per file.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Maximum 50 PDF files can be merged at once.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const createdFiles: string[] = [];

    try {
      // 1. Initialize empty merged document using pdf-lib
      console.log(`[MERGE-PDF] Initializing merge for ${files.length} documents...`);
      const mergedPdf = await PDFDocument.create();

      // 2. Load and copy pages from each PDF sequentially
      for (const file of files) {
        console.log(`[MERGE-PDF] Collating file: ${file.originalname}`);
        const pdfBytes = fs.readFileSync(file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      // 3. Save the collated document
      const mergedPdfBytes = await mergedPdf.save();
      const timestamp = Date.now();
      const outputFilename = `Merged_${timestamp}.pdf`;
      const outputPath = path.join(MERGED_OUTPUT_DIR, outputFilename);

      fs.writeFileSync(outputPath, mergedPdfBytes);
      createdFiles.push(outputPath);
      console.log(`[MERGE-PDF] Successfully merged into: ${outputPath}`);

      // 4. Schedule automatic file cleanup after 30 minutes
      setTimeout(() => {
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
            console.log(`[AUTO-CLEANUP] Deleted merged file: ${outputFilename}`);
          }
        } catch (cleanupErr) {
          console.error(`[AUTO-CLEANUP] Failed to delete merged file: ${outputPath}`, cleanupErr);
        }
      }, 30 * 60 * 1000); // 30 minutes

      // 5. Response payload
      return res.json({
        success: true,
        fileName: outputFilename,
        downloadUrl: `/api/tools/download/${outputFilename}`
      });

    } catch (mergeErr: any) {
      console.error('[MERGE-PDF] PDF Merge operations failed:', mergeErr);
      return res.status(500).json({ error: mergeErr.message || 'Collating and merging PDFs failed. Make sure files are not corrupted.' });
    } finally {
      // Instantly delete the raw uploaded input PDFs to save space and protect privacy
      files.forEach((file) => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (unlinkErr) {
          console.warn(`[CLEANUP] Failed to remove merge input file: ${file.path}`, unlinkErr);
        }
      });
    }
  });
});

// Route: Split PDF endpoint
router.post('/split-pdf', verifyToken, (req: AuthRequest, res: any) => {
  uploadSplit.single('file')(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size is 30MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const { splitMethod, pageRanges, pagesPerFile } = req.body;
    if (!splitMethod) {
      try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
      return res.status(400).json({ error: 'Split method is required.' });
    }

    const createdFiles: string[] = [];
    const generatedFiles: string[] = [];

    try {
      const pdfBytes = fs.readFileSync(file.path);
      let srcDoc;
      try {
        srcDoc = await PDFDocument.load(pdfBytes);
      } catch (loadErr) {
        throw new Error('Invalid or corrupted PDF file. Make sure it is not encrypted.');
      }

      const totalPages = srcDoc.getPageCount();
      if (totalPages === 0) {
        throw new Error('PDF document has zero pages (Empty PDF).');
      }

      const originalName = file.originalname;
      const ext = path.extname(originalName);
      const baseName = path.basename(originalName, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 50);

      // Helper to generate a single split PDF file from indices list
      const createSubPdf = async (indices: number[], suffix: string): Promise<string> => {
        const newDoc = await PDFDocument.create();
        const copied = await newDoc.copyPages(srcDoc, indices);
        copied.forEach((p) => newDoc.addPage(p));
        const savedBytes = await newDoc.save();
        const outName = `split_${baseName}_${suffix}_${Date.now()}.pdf`;
        const outPath = path.join(SPLIT_OUTPUT_DIR, outName);
        fs.writeFileSync(outPath, savedBytes);
        return outName;
      };

      // Determine indices arrays depending on splitMethod
      if (splitMethod === 'extract') {
        if (!pageRanges || typeof pageRanges !== 'string' || pageRanges.trim() === '') {
          throw new Error('Page ranges must be specified for page extraction.');
        }

        const pages = pageRanges.split(',')
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
          .map((p) => parseInt(p, 10));

        if (pages.length === 0) {
          throw new Error('No valid page numbers found in extraction input.');
        }

        const indices: number[] = [];
        for (const page of pages) {
          if (isNaN(page)) {
            throw new Error(`Invalid page number token in list.`);
          }
          if (page < 1 || page > totalPages) {
            throw new Error(`Page number ${page} is out of bounds (valid: 1 to ${totalPages}).`);
          }
          indices.push(page - 1);
        }

        const subFile = await createSubPdf(indices, 'extracted');
        generatedFiles.push(subFile);

      } else if (splitMethod === 'range') {
        if (!pageRanges || typeof pageRanges !== 'string' || pageRanges.trim() === '') {
          throw new Error('Page ranges must be specified for range splitting.');
        }

        const rangeTokens = pageRanges.split(/[\n,]+/)
          .map((r) => r.trim())
          .filter((r) => r.length > 0);

        if (rangeTokens.length === 0) {
          throw new Error('No valid range tokens found in input.');
        }

        for (const token of rangeTokens) {
          const parts = token.split('-');
          if (parts.length !== 2) {
            throw new Error(`Invalid range format: "${token}". Expected standard format like "1-5".`);
          }

          const start = parseInt(parts[0].trim(), 10);
          const end = parseInt(parts[1].trim(), 10);

          if (isNaN(start) || isNaN(end)) {
            throw new Error(`Invalid page range values in "${token}".`);
          }

          if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
            throw new Error(`Range "${token}" out of bounds (valid: 1 to ${totalPages}).`);
          }

          if (start > end) {
            throw new Error(`Invalid range "${token}": Start page cannot be greater than end page.`);
          }

          const indices: number[] = [];
          for (let i = start - 1; i < end; i++) {
            indices.push(i);
          }

          const subFile = await createSubPdf(indices, `range_${start}_${end}`);
          generatedFiles.push(subFile);
        }

      } else if (splitMethod === 'everyN') {
        const n = parseInt(pagesPerFile, 10);
        if (isNaN(n) || n < 1) {
          throw new Error('Please specify a valid positive number of pages per file.');
        }

        let start = 1;
        while (start <= totalPages) {
          const end = Math.min(start + n - 1, totalPages);
          const indices: number[] = [];
          for (let i = start - 1; i < end; i++) {
            indices.push(i);
          }
          const subFile = await createSubPdf(indices, `pages_${start}_${end}`);
          generatedFiles.push(subFile);
          start += n;
        }

      } else if (splitMethod === 'individual') {
        for (let i = 0; i < totalPages; i++) {
          const pageNum = i + 1;
          const subFile = await createSubPdf([i], `page_${pageNum}`);
          generatedFiles.push(subFile);
        }
      } else {
        throw new Error(`Unknown split method: "${splitMethod}".`);
      }

      // If multiple PDFs generated, create ZIP file
      let zipFilename: string | null = null;
      if (generatedFiles.length > 1) {
        zipFilename = `split_${baseName}_conversions_${Date.now()}.zip`;
        const zipFilePath = path.join(SPLIT_OUTPUT_DIR, zipFilename);

        await new Promise<void>((resolveZip, rejectZip) => {
          const outputStream = fs.createWriteStream(zipFilePath);
          const archive = archiver('zip', { zlib: { level: 9 } });

          outputStream.on('close', resolveZip);
          archive.on('error', rejectZip);
          archive.pipe(outputStream);

          for (const filename of generatedFiles) {
            const filePath = path.join(SPLIT_OUTPUT_DIR, filename);
            archive.file(filePath, { name: filename });
          }

          archive.finalize();
        });
      }

      const filesToSave = [...generatedFiles];
      if (zipFilename) {
        filesToSave.push(zipFilename);
      }

      const historyRecord = new SplitHistory({
        userId: req.user.uid,
        fileName: originalName,
        splitMethod,
        generatedFiles: filesToSave
      });

      await historyRecord.save();
      console.log(`[SPLIT-PDF] PDF split transaction logged: ${historyRecord._id}`);

      return res.json({
        success: true,
        message: 'PDF split completed successfully.',
        splitMethod,
        filesGenerated: generatedFiles.length,
        downloadUrls: generatedFiles.map(f => `/api/tools/download/${f}`),
        zipUrl: zipFilename ? `/api/tools/download/${zipFilename}` : null,
        history: {
          _id: historyRecord._id,
          fileName: historyRecord.fileName,
          splitMethod: historyRecord.splitMethod,
          generatedFiles: filesToSave,
          createdAt: historyRecord.createdAt
        }
      });

    } catch (err: any) {
      console.error('[SPLIT-PDF] Error splitting PDF:', err);
      generatedFiles.forEach((f) => {
        try {
          const fp = path.join(SPLIT_OUTPUT_DIR, f);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        } catch {}
      });
      return res.status(400).json({ error: err.message || 'Failed to split PDF.' });
    } finally {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log(`[CLEANUP] Deleted raw input split PDF: ${file.path}`);
        }
      } catch (unlinkErr) {
        console.warn(`[CLEANUP] Failed to remove split input: ${file.path}`, unlinkErr);
      }
    }
  });
});

// Route: Get Split PDF history
router.get('/split-pdf/history', verifyToken, async (req: AuthRequest, res: any) => {
  try {
    console.log(`[SPLIT-HISTORY] Fetching split logs for: ${req.user.uid}`);
    const history = await SplitHistory.find({ userId: req.user.uid }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      history
    });
  } catch (err: any) {
    console.error(`[SPLIT-HISTORY] Failed to fetch split logs:`, err);
    return res.status(500).json({ error: 'Failed to fetch split history.' });
  }
});

// Route: Delete Split PDF history entry and files
router.delete('/split-pdf/history/:id', verifyToken, async (req: AuthRequest, res: any) => {
  try {
    const recordId = req.params.id;
    console.log(`[SPLIT-DELETE] Deleting split record ID: ${recordId} by UID: ${req.user.uid}`);

    const record = await SplitHistory.findOne({ _id: recordId, userId: req.user.uid });
    if (!record) {
      return res.status(404).json({ error: 'Split history record not found.' });
    }

    for (const filename of record.generatedFiles) {
      const filePath = path.join(SPLIT_OUTPUT_DIR, filename);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[SPLIT-DELETE] Deleted physical file: ${filename}`);
        }
      } catch (unlinkErr) {
        console.warn(`[SPLIT-DELETE] Failed to unlink file: ${filePath}`, unlinkErr);
      }
    }

    await record.deleteOne();
    console.log(`[SPLIT-DELETE] Successfully deleted split record: ${recordId}`);

    return res.json({
      success: true,
      message: 'Split history record and associated files deleted successfully.'
    });
  } catch (err: any) {
    console.error(`[SPLIT-DELETE] Deletion logic failed:`, err);
    return res.status(500).json({ error: 'Failed to delete split history record.' });
  }
});

// Route 3: AI Image Generation endpoint using Pollinations AI
router.post('/image/generate', verifyToken, async (req: AuthRequest, res: any) => {
  try {
    const prompt = req.body.prompt;
    const style = req.body.style || 'Educational';
    const size = req.body.size || 'Square';

    // 1. Validate inputs
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return res.status(400).json({ error: 'Prompt is required and must be at least 3 characters long.' });
    }
    if (prompt.trim().length > 3000) {
      return res.status(400).json({ error: 'Prompt is too long. Maximum length is 3000 characters.' });
    }

    const validStyles = ['Educational', 'Diagram', 'Infographic', 'Illustration'];
    const validSizes = ['Square', 'Portrait', 'Landscape'];

    if (!validStyles.includes(style) || !validSizes.includes(size)) {
      return res.status(400).json({ error: 'Invalid style or size parameters.' });
    }

    // 2. Map size dimensions
    let w = 1024;
    let h = 1024;
    if (size === 'Portrait') {
      w = 768;
      h = 1024;
    } else if (size === 'Landscape') {
      w = 1024;
      h = 768;
    }

    // 3. Style prompt injection suffixes
    let styleSuffix = '';
    if (style === 'Educational') {
      styleSuffix = ', high resolution, detailed educational illustration, scientific layout, academic diagram';
    } else if (style === 'Diagram') {
      styleSuffix = ', clear educational schematic blueprint diagram, high-yield structure details, labeled elements, white background style';
    } else if (style === 'Infographic') {
      styleSuffix = ', gorgeous educational infographic structure, text blocks, high resolution visual elements, structured timeline';
    } else if (style === 'Illustration') {
      styleSuffix = ', gorgeous conceptual educational illustration, vibrant colors, slate-blue neon theme';
    }

    // 4. Construct Pollinations URL
    const sanitizedPrompt = prompt.trim().replace(/\s+/g, ' ');
    const styledPrompt = `${sanitizedPrompt}${styleSuffix}`;
    const encodedPrompt = encodeURIComponent(styledPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w}&height=${h}&nologo=true&seed=${seed}`;

    console.log(`[IMAGE-GEN] Generating image prompt: "${sanitizedPrompt}" with style "${style}" and size "${size}"`);
    console.log(`[IMAGE-GEN] Pollinations URL: ${imageUrl}`);

    // Pre-fetch the image on the server to block until Pollinations finishes synthesizing the image.
    // This caches the image on Pollinations' servers, ensuring the browser loads it instantly without broken icons.
    try {
      console.log(`[IMAGE-GEN] Pre-fetching image to trigger Pollinations generation...`);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Pollinations responded with status: ${response.status}`);
      }
      console.log(`[IMAGE-GEN] Image successfully generated and cached on Pollinations.`);
    } catch (fetchErr: any) {
      console.error(`[IMAGE-GEN] Pre-fetch failed, proceeding anyway:`, fetchErr.message || fetchErr);
    }

    // 5. Store image generation record in Mongoose database
    const newImage = new ImageHistory({
      userId: req.user.uid,
      prompt: sanitizedPrompt,
      style,
      size,
      imageUrl
    });

    await newImage.save();
    console.log(`[IMAGE-GEN] Successfully saved visual history with ID: ${newImage._id}`);

    return res.json({
      success: true,
      image: newImage
    });

  } catch (err: any) {
    console.error('[IMAGE-GEN] Processing failed:', err);
    return res.status(500).json({ error: err.message || 'Image generation failed. Please try again.' });
  }
});

// Route 4: Retrieve chronological image generation history for user
router.get('/image/history', verifyToken, async (req: AuthRequest, res: any) => {
  try {
    console.log(`[IMAGE-HISTORY] Fetching visual history for UID: ${req.user.uid}`);
    const history = await ImageHistory.find({ userId: req.user.uid }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      history
    });
  } catch (err: any) {
    console.error('[IMAGE-HISTORY] Fetch failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch image history.' });
  }
});

// Route 5: Delete image generation record from history
router.delete('/image/history/:id', verifyToken, async (req: AuthRequest, res: any) => {
  try {
    const recordId = req.params.id;
    console.log(`[IMAGE-DELETE] Requesting removal of image log ID: ${recordId} by UID: ${req.user.uid}`);

    const record = await ImageHistory.findOne({ _id: recordId, userId: req.user.uid });
    if (!record) {
      return res.status(404).json({ error: 'Image record not found or unauthorized access.' });
    }

    await record.deleteOne();
    console.log(`[IMAGE-DELETE] Successfully deleted image log: ${recordId}`);

    return res.json({
      success: true,
      message: 'Image history record deleted successfully.'
    });
  } catch (err: any) {
    console.error('[IMAGE-DELETE] Deletion failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete image record.' });
  }
});

// Helper to construct prompt for Gemini to generate Mermaid code
const buildMermaidPrompt = (prompt: string, diagramType: string) => {
  return `
You are a highly professional, expert systems architect and Mermaid.js diagram generator.

TASK:
Create a valid, syntactically correct Mermaid.js diagram based on the user's request.

USER REQUEST:
"${prompt}"

DIAGRAM TYPE REQUESTED:
"${diagramType}" (If "Auto Detect" or not specified, choose the most appropriate type like flowchart, mindmap, erDiagram, sequenceDiagram, etc.)

STRICT RULES:
1. Output ONLY valid, compile-ready Mermaid.js code.
2. Do NOT wrap your output in markdown code blocks like \`\`\`mermaid or \`\`\`. Start directly with the Mermaid keyword (e.g., \`graph TD\`, \`mindmap\`, \`classDiagram\`, \`erDiagram\`, \`sequenceDiagram\`, \`stateDiagram\`).
3. Do NOT include any introductory or explanatory text. No explanations, no conversations.
4. Ensure absolutely flawless syntax following Mermaid standards:
   - For Flowcharts (\`graph TD\` or \`graph LR\`): Wrap ALL node labels in double quotes regardless of the shape type. E.g., ALWAYS write: A["Label Text"], B{"Label Text"}, C("Label Text"), D(["Label Text"]), E(["Label Text"]). NEVER write node labels without double quotes (like A[Label Text] or B{Label Text}). This completely avoids parsing failures due to spaces or special characters (like parenthesis, colons, dots, backslashes, question marks) inside labels.
   - For Mind Maps (\`mindmap\`): Wrap all node labels in double quotes, e.g. \`node["Node Text"]\`.
   - For Entity-Relationship Diagrams (\`erDiagram\`): Define valid keys, fields, and relationships.
   - For Sequence Diagrams (\`sequenceDiagram\`): Ensure messages and participant declarations are valid.
5. Do NOT include any comments or notes.

Return ONLY the Mermaid code.
`;
};

// Helper to ask Gemini to correct code with syntax error feedback
const regenerateMermaidCode = async (
  prompt: string,
  diagramType: string,
  failedCode: string,
  syntaxError: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const promptText = `
You are a highly professional, expert systems architect and Mermaid.js diagram generator.

The Mermaid.js code you previously generated based on the user request failed syntax validation.
Here are the details:

USER REQUEST:
"${prompt}"

DIAGRAM TYPE:
"${diagramType}"

FAILED MERMAID CODE:
\`\`\`
${failedCode}
\`\`\`

SYNTAX ERROR RECEIVED:
"${syntaxError}"

TASK:
Correct the Mermaid.js code to fix the syntax error while strictly satisfying the user's request.

STRICT RULES:
1. Output ONLY valid, compile-ready Mermaid.js code.
2. Do NOT wrap your output in markdown code blocks like \`\`\`mermaid or \`\`\`. Start directly with the Mermaid keyword (e.g., \`graph TD\`, \`mindmap\`, \`classDiagram\`, \`erDiagram\`, \`sequenceDiagram\`, \`stateDiagram\`).
3. Do NOT include any introductory or explanatory text. No explanations, no conversations.
4. Keep the syntax extremely standard and safe. For flowcharts, ALWAYS wrap ALL node labels in double quotes, e.g. A["Label text"], B{"Label text"}, C("Label text"). NEVER leave them unquoted, as special characters inside unquoted node text (like parenthesis, colons, dots, question marks) will crash the compiler!
5. Do NOT include any comments or notes.

Return ONLY the corrected Mermaid code.
`;

  const result = await model.generateContent(promptText);
  const response = await result.response;
  let code = response.text().trim();
  
  if (code.startsWith('```')) {
    code = code.replace(/^```[a-zA-Z0-9]*\n/, '').replace(/\n```$/, '');
  }
  return code.trim();
};

// Helper to validate and compile Mermaid code to SVG and PNG
const validateAndRenderMermaid = async (
  prompt: string,
  requestedType: string,
  initialMermaidCode: string
): Promise<{ mermaidCode: string; baseFilename: string }> => {
  let currentCode = initialMermaidCode;
  const timestamp = Date.now();
  const baseFilename = `diagram_${timestamp}`;
  const mmdPath = path.join(DIAGRAM_OUTPUT_DIR, `${baseFilename}.mmd`);
  const svgPath = path.join(DIAGRAM_OUTPUT_DIR, `${baseFilename}.svg`);
  const pngPath = path.join(DIAGRAM_OUTPUT_DIR, `${baseFilename}.png`);

  let attempts = 0;
  const maxRetries = 3;

  while (attempts <= maxRetries) {
    // Save to temp .mmd file
    fs.writeFileSync(mmdPath, currentCode);
    console.log(`[DIAGRAM-RENDER] Attempt ${attempts}: Rendering Mermaid to SVG...`);

    try {
      // Run mmdc in child process to validate and compile to SVG
      await execPromise(`npx mmdc -i "${mmdPath}" -o "${svgPath}"`);
      
      // Render PNG
      try {
        console.log(`[DIAGRAM-RENDER] Attempt ${attempts}: Rendering PNG...`);
        await execPromise(`npx mmdc -i "${mmdPath}" -o "${pngPath}"`);
      } catch (pngErr: any) {
        console.warn(`[DIAGRAM-RENDER] PNG rendering failed, continuing with SVG. Error:`, pngErr.message || pngErr);
      }

      console.log(`[DIAGRAM-RENDER] Successfully validated and rendered diagram.`);
      return { mermaidCode: currentCode, baseFilename };

    } catch (err: any) {
      console.warn(`[DIAGRAM-RENDER] Attempt ${attempts} failed. Error:`, err.stderr || err.message);
      
      attempts++;
      if (attempts > maxRetries) {
        console.error(`[DIAGRAM-RENDER] Exceeded max retries. Falling back to basic placeholder.`);
        
        // Write simple fallback SVG
        const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100">
          <rect width="100%" height="100%" fill="#131b2e" rx="10"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#818cf8" font-family="sans-serif" font-size="14">
            Mermaid Diagram Code Generated (Interactive Render Available)
          </text>
        </svg>`;
        fs.writeFileSync(svgPath, placeholderSvg);
        
        return { mermaidCode: currentCode, baseFilename };
      }

      console.log(`[DIAGRAM-RENDER] Requesting corrective regeneration from Gemini...`);
      try {
        currentCode = await regenerateMermaidCode(prompt, requestedType, currentCode, err.stderr || err.message);
      } catch (regenErr: any) {
        console.error(`[DIAGRAM-RENDER] Gemini regeneration failed:`, regenErr);
        throw new Error(`Failed to validate Mermaid diagram: ${err.stderr || err.message}`);
      }
    }
  }

  return { mermaidCode: currentCode, baseFilename };
};

// Route: AI Mermaid Diagram generate endpoint
router.post('/diagram/generate', verifyToken, async (req: AuthRequest, res: any) => {
  try {
    const { prompt, diagramType } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return res.status(400).json({ error: 'Prompt is required and must be at least 3 characters long.' });
    }
    if (prompt.trim().length > 8000) {
      return res.status(400).json({ error: 'Prompt is too long. Maximum length is 8000 characters.' });
    }

    const type = diagramType || 'Auto Detect';

    console.log(`[DIAGRAM] Generating diagram for prompt: "${prompt}" with type "${type}"`);

    // Call Gemini to generate initial Mermaid code
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const promptText = buildMermaidPrompt(prompt.trim(), type);

    const result = await model.generateContent(promptText);
    const response = await result.response;
    let mermaidCode = response.text().trim();

    // Strip code blocks if LLM ignored instructions
    if (mermaidCode.startsWith('```')) {
      mermaidCode = mermaidCode.replace(/^```[a-zA-Z0-9]*\n/, '').replace(/\n```$/, '');
    }
    mermaidCode = mermaidCode.trim();

    console.log(`[DIAGRAM] Initial Mermaid code generated. Rendering and validating...`);

    // Render & Validate (with up to 3 retries)
    const { mermaidCode: validatedCode, baseFilename } = await validateAndRenderMermaid(
      prompt.trim(),
      type,
      mermaidCode
    );

    // Save record to DiagramHistory in MongoDB
    const newDiagram = new DiagramHistory({
      userId: req.user.uid,
      prompt: prompt.trim(),
      diagramType: type,
      mermaidCode: validatedCode,
      diagramPath: baseFilename
    });

    await newDiagram.save();

    console.log(`[DIAGRAM] Successfully saved diagram record with ID: ${newDiagram._id}`);

    return res.json({
      success: true,
      diagram: {
        _id: newDiagram._id,
        prompt: newDiagram.prompt,
        diagramType: newDiagram.diagramType,
        mermaidCode: newDiagram.mermaidCode,
        svgUrl: `/api/tools/download/${baseFilename}.svg`,
        pngUrl: `/api/tools/download/${baseFilename}.png`,
        createdAt: newDiagram.createdAt
      }
    });

  } catch (err: any) {
    console.error('[DIAGRAM] Generation failed:', err);
    return res.status(500).json({ error: err.message || 'Diagram generation failed. Please try again.' });
  }
});

// Route: Get diagram generation history
router.get('/diagram/history', verifyToken, async (req: AuthRequest, res: any) => {
  try {
    console.log(`[DIAGRAM-HISTORY] Fetching history for UID: ${req.user.uid}`);
    const history = await DiagramHistory.find({ userId: req.user.uid }).sort({ createdAt: -1 });
    
    // Map database records to frontend format with download URLs
    const formattedHistory = history.map((item) => ({
      _id: item._id,
      prompt: item.prompt,
      diagramType: item.diagramType,
      mermaidCode: item.mermaidCode,
      svgUrl: `/api/tools/download/${item.diagramPath}.svg`,
      pngUrl: `/api/tools/download/${item.diagramPath}.png`,
      createdAt: item.createdAt
    }));

    return res.json({
      success: true,
      history: formattedHistory
    });
  } catch (err: any) {
    console.error('[DIAGRAM-HISTORY] Fetch failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch diagram history.' });
  }
});

// Route: Delete diagram from history
router.delete('/diagram/history/:id', verifyToken, async (req: AuthRequest, res: any) => {
  try {
    const recordId = req.params.id;
    console.log(`[DIAGRAM-DELETE] Requesting removal of diagram ID: ${recordId} by UID: ${req.user.uid}`);

    const record = await DiagramHistory.findOne({ _id: recordId, userId: req.user.uid });
    if (!record) {
      return res.status(404).json({ error: 'Diagram record not found or unauthorized access.' });
    }

    // Attempt to delete physical files
    const baseFilename = record.diagramPath;
    const mmdPath = path.join(DIAGRAM_OUTPUT_DIR, `${baseFilename}.mmd`);
    const svgPath = path.join(DIAGRAM_OUTPUT_DIR, `${baseFilename}.svg`);
    const pngPath = path.join(DIAGRAM_OUTPUT_DIR, `${baseFilename}.png`);

    [mmdPath, svgPath, pngPath].forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[DIAGRAM-DELETE] Cleaned up physical file: ${path.basename(filePath)}`);
        }
      } catch (unlinkErr) {
        console.warn(`[DIAGRAM-DELETE] Failed to remove physical file: ${filePath}`, unlinkErr);
      }
    });

    await record.deleteOne();
    console.log(`[DIAGRAM-DELETE] Successfully deleted diagram record: ${recordId}`);

    return res.json({
      success: true,
      message: 'Diagram history record and files deleted successfully.'
    });
  } catch (err: any) {
    console.error('[DIAGRAM-DELETE] Deletion failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete diagram record.' });
  }
});

// Helper to construct prompt for Gemini to generate Presentation Outline JSON
const buildPresentationPrompt = (
  text: string,
  style: string,
  slideCountRequested: string,
  includeCharts: boolean,
  includeDiagrams: boolean
) => {
  return `
You are an elite-tier AI Presentation Architect, specializing in high-impact graphic design, communication flow, and professional typography layouts. Your goal is to synthesize the following source material into a premium, gorgeous presentation structure.

SOURCE CONTENT:
"""
${text}
"""

PRESENTATION STYLE:
"${style}" (Make the slide tone and layout represent this style. Academic = structured & rigorous, Corporate = executive & clean, Modern Startup = punchy, high impact & visual, etc.)

SLIDE COUNT DESIGNATED:
"${slideCountRequested}" (If "Auto", choose the ideal count between 5 and 15 based on the text complexity.)

FEATURE CAPABILITIES ENABLED:
- Native PowerPoint Charts: ${includeCharts ? "ENABLED" : "DISABLED"} (If enabled, you can request type "chart" slides for quantitative data)
- Mermaid diagrams: ${includeDiagrams ? "ENABLED" : "DISABLED"} (If enabled, you can request type "diagram" slides with detailed diagramPrompt describing what diagram represents)

OUTPUT INSTRUCTIONS:
Return ONLY a valid, compile-ready JSON object matching the JSON schema below.
Do NOT include any markdown formatting like \`\`\`json or \`\`\`. Start directly with the opening curly brace "{" and end with the closing curly brace "}".
Ensure all JSON keys and string values are properly escaped and valid.

JSON SCHEMA:
{
  "title": "A captivating, high-impact presentation title",
  "slides": [
    {
      "type": "cover" | "divider" | "content" | "comparison" | "timeline" | "process" | "diagram" | "chart" | "summary" | "thanks",
      "title": "Elegant and concise slide title",
      "subtitle": "Short descriptive subtitle (optional)",
      "content": [
        "Concise, high-yield bullet point 1 (max 15 words)",
        "Concise, high-yield bullet point 2 (max 15 words)",
        "Concise, high-yield bullet point 3 (max 15 words)"
      ],
      "speakerNotes": "Valuable details and speaking points for this slide.",
      "layout": "standard" | "left-align" | "two-column" | "card-grid",
      "comparison": {
        "col1Title": "Column 1 Header",
        "col2Title": "Column 2 Header",
        "col1Items": ["Item A1", "Item A2"],
        "col2Items": ["Item B1", "Item B2"]
      },
      "timeline": [
        { "milestone": "Phase 1 / Key Date", "description": "High-impact description." }
      ],
      "process": [
        { "step": "01", "title": "Step Title", "desc": "Brief step summary." }
      ],
      "diagramPrompt": "Visual flowchart or structure representation prompt. Keep it simple and clear.",
      "chart": {
        "type": "bar" | "pie",
        "title": "Chart Title",
        "labels": ["Label A", "Label B", "Label C"],
        "values": [30, 50, 20]
      }
    }
  ]
}

STRICT PRESENTATION RULES:
1. Cover slide should always be slide 1.
2. Section dividers are used to chunk content logically if the deck is long.
3. Keep the content bullet points extremely concise. Avoid paragraph blobs and wall-of-text slides. This is the difference between a cheap slide deck and a premium Gamma-like deck.
4. If includeCharts is ENABLED and there is quantitative or statistical data in the source content, design a gorgeous chart slide with appropriate labels and values.
5. If includeDiagrams is ENABLED and there is a sequential process, hierarchy, or architecture, design a diagram slide. You must provide a concise "diagramPrompt" describing what the diagram represents.
6. The final slides should be a Summary slide, followed by a Thank You slide.
7. Return ONLY the JSON object.
`;
};

// Define theme structures
interface ThemePalette {
  bg: string;
  text: string;
  accent: string;
  muted: string;
  cardBg: string;
  cardBorder: string;
  isDark: boolean;
}

const THEMES: Record<string, ThemePalette> = {
  Light: { bg: 'F8FAFC', text: '0F172A', accent: '4F46E5', muted: '475569', cardBg: 'FFFFFF', cardBorder: 'E2E8F0', isDark: false },
  Dark: { bg: '0F172A', text: 'F8FAFC', accent: '818CF8', muted: '94A3B8', cardBg: '1E293B', cardBorder: '334155', isDark: true },
  Purple: { bg: '120B24', text: 'F3E8FF', accent: 'D946EF', muted: 'A855F7', cardBg: '1E1135', cardBorder: '3B2263', isDark: true },
  Blue: { bg: '031022', text: 'F0F9FF', accent: '0EA5E9', muted: '38BDF8', cardBg: '071E3A', cardBorder: '0C3364', isDark: true },
  Green: { bg: '041E15', text: 'ECFDF5', accent: '10B981', muted: '34D399', cardBg: '083122', cardBorder: '0F5A3F', isDark: true }
};

// Formats title and subtitle on slides
const addSlideTitle = (pptx: any, slide: any, title: string, subtitle: string | undefined, theme: ThemePalette) => {
  slide.addText(title || "Topic Overview", {
    x: 0.5,
    y: 0.4,
    w: 9.0,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: theme.accent,
    fontFace: 'Arial'
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5,
      y: 0.9,
      w: 9.0,
      h: 0.3,
      fontSize: 11,
      italic: true,
      color: theme.muted,
      fontFace: 'Arial'
    });
  }

  // Divider Line
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 1.25,
    w: 9.0,
    h: 0.02,
    fill: { color: theme.accent }
  });
};

// Layout slide builders
const buildCoverSlide = (pptx: any, slide: any, data: any, theme: ThemePalette, style: string) => {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.4,
    h: 5.625,
    fill: { color: theme.accent }
  });

  slide.addText(data.title || "AI Generated Presentation", {
    x: 1.0,
    y: 1.8,
    w: 8.0,
    h: 1.4,
    fontSize: 36,
    bold: true,
    color: theme.text,
    fontFace: 'Arial',
    align: 'center'
  });

  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 1.0,
      y: 3.2,
      w: 8.0,
      h: 0.8,
      fontSize: 15,
      color: theme.muted,
      fontFace: 'Arial',
      align: 'center'
    });
  }

  slide.addText(`Style: ${style}  |  Generated by ExamNotes AI`, {
    x: 1.0,
    y: 4.8,
    w: 8.0,
    h: 0.4,
    fontSize: 10,
    color: theme.muted,
    fontFace: 'Arial',
    align: 'center'
  });
};

const buildDividerSlide = (pptx: any, slide: any, data: any, theme: ThemePalette) => {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 4.0,
    h: 5.625,
    fill: { color: theme.accent }
  });

  slide.addText("SECTION", {
    x: 0.5,
    y: 1.8,
    w: 3.0,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
    align: 'center'
  });

  slide.addText("• • •", {
    x: 0.5,
    y: 2.3,
    w: 3.0,
    h: 1.2,
    fontSize: 54,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
    align: 'center'
  });

  slide.addText(data.title || "Next Section", {
    x: 4.5,
    y: 1.8,
    w: 5.0,
    h: 1.0,
    fontSize: 26,
    bold: true,
    color: theme.text,
    fontFace: 'Arial'
  });

  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 4.5,
      y: 2.9,
      w: 5.0,
      h: 1.5,
      fontSize: 12,
      color: theme.muted,
      fontFace: 'Arial'
    });
  }
};

const buildContentSlide = (pptx: any, slide: any, data: any, theme: ThemePalette) => {
  addSlideTitle(pptx, slide, data.title, data.subtitle, theme);

  const points = data.content || [];
  if (points.length === 3) {
    const cardW = 2.8;
    const cardY = 1.7;
    const cardH = 3.2;
    const spacing = 0.3;

    points.forEach((point: string, idx: number) => {
      const cardX = 0.5 + idx * (cardW + spacing);

      slide.addShape(pptx.ShapeType.roundRect, {
        x: cardX,
        y: cardY,
        w: cardW,
        h: cardH,
        fill: { color: theme.cardBg },
        line: { color: theme.cardBorder, width: 1 }
      });

      slide.addText(`0${idx + 1}`, {
        x: cardX + 0.2,
        y: cardY + 0.2,
        w: cardW - 0.4,
        h: 0.4,
        fontSize: 15,
        bold: true,
        color: theme.accent,
        fontFace: 'Arial'
      });

      slide.addText(point, {
        x: cardX + 0.2,
        y: cardY + 0.7,
        w: cardW - 0.4,
        h: cardH - 0.9,
        fontSize: 10.5,
        color: theme.text,
        fontFace: 'Arial',
        lineSpacing: 15
      });
    });
  } else if (points.length === 2) {
    const cardW = 4.35;
    const cardY = 1.7;
    const cardH = 3.2;
    const spacing = 0.3;

    points.forEach((point: string, idx: number) => {
      const cardX = 0.5 + idx * (cardW + spacing);

      slide.addShape(pptx.ShapeType.roundRect, {
        x: cardX,
        y: cardY,
        w: cardW,
        h: cardH,
        fill: { color: theme.cardBg },
        line: { color: theme.cardBorder, width: 1 }
      });

      slide.addText(`0${idx + 1}`, {
        x: cardX + 0.3,
        y: cardY + 0.3,
        w: cardW - 0.6,
        h: 0.4,
        fontSize: 16,
        bold: true,
        color: theme.accent,
        fontFace: 'Arial'
      });

      slide.addText(point, {
        x: cardX + 0.3,
        y: cardY + 0.8,
        w: cardW - 0.6,
        h: cardH - 1.1,
        fontSize: 11.5,
        color: theme.text,
        fontFace: 'Arial',
        lineSpacing: 17
      });
    });
  } else {
    const cardYStart = 1.6;
    const cardH = 0.7;
    const spacing = 0.15;
    
    points.slice(0, 4).forEach((point: string, idx: number) => {
      const cardY = cardYStart + idx * (cardH + spacing);

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: cardY,
        w: 9.0,
        h: cardH,
        fill: { color: theme.cardBg },
        line: { color: theme.cardBorder, width: 1 }
      });

      slide.addText(`•`, {
        x: 0.7,
        y: cardY + 0.15,
        w: 0.3,
        h: 0.4,
        fontSize: 18,
        bold: true,
        color: theme.accent
      });

      slide.addText(point, {
        x: 1.1,
        y: cardY + 0.1,
        w: 8.2,
        h: 0.5,
        fontSize: 11,
        color: theme.text,
        fontFace: 'Arial'
      });
    });
  }
};

const buildComparisonSlide = (pptx: any, slide: any, data: any, theme: ThemePalette) => {
  addSlideTitle(pptx, slide, data.title, data.subtitle, theme);

  const comp = data.comparison || { col1Title: "Option A", col2Title: "Option B", col1Items: [], col2Items: [] };

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.5,
    y: 1.6,
    w: 4.35,
    h: 3.4,
    fill: { color: theme.cardBg },
    line: { color: theme.cardBorder, width: 1 }
  });

  slide.addText(comp.col1Title, {
    x: 0.8,
    y: 1.8,
    w: 3.75,
    h: 0.4,
    fontSize: 15,
    bold: true,
    color: theme.accent,
    fontFace: 'Arial'
  });

  const leftText = (comp.col1Items || []).map((item: string) => `• ${item}`).join('\n\n');
  slide.addText(leftText, {
    x: 0.8,
    y: 2.3,
    w: 3.75,
    h: 2.5,
    fontSize: 10.5,
    color: theme.text,
    fontFace: 'Arial',
    lineSpacing: 13
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 5.15,
    y: 1.6,
    w: 4.35,
    h: 3.4,
    fill: { color: theme.cardBg },
    line: { color: theme.cardBorder, width: 1 }
  });

  slide.addText(comp.col2Title, {
    x: 5.45,
    y: 1.8,
    w: 3.75,
    h: 0.4,
    fontSize: 15,
    bold: true,
    color: theme.accent,
    fontFace: 'Arial'
  });

  const rightText = (comp.col2Items || []).map((item: string) => `• ${item}`).join('\n\n');
  slide.addText(rightText, {
    x: 5.45,
    y: 2.3,
    w: 3.75,
    h: 2.5,
    fontSize: 10.5,
    color: theme.text,
    fontFace: 'Arial',
    lineSpacing: 13
  });
};

const buildTimelineSlide = (pptx: any, slide: any, data: any, theme: ThemePalette) => {
  addSlideTitle(pptx, slide, data.title, data.subtitle, theme);

  const timelineItems = data.timeline || [];
  const count = Math.min(timelineItems.length, 4);

  if (count > 0) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 3.1,
      w: 9.0,
      h: 0.04,
      fill: { color: theme.accent }
    });

    const stepW = 9.0 / count;

    timelineItems.slice(0, count).forEach((item: any, idx: number) => {
      const itemX = 0.5 + idx * stepW;

      slide.addShape(pptx.ShapeType.oval, {
        x: itemX + (stepW / 2) - 0.15,
        y: 2.97,
        w: 0.3,
        h: 0.3,
        fill: { color: theme.accent },
        line: { color: theme.bg, width: 2 }
      });

      const isTop = idx % 2 === 0;

      if (isTop) {
        slide.addText(item.milestone, {
          x: itemX + 0.1,
          y: 2.0,
          w: stepW - 0.2,
          h: 0.4,
          fontSize: 13,
          bold: true,
          color: theme.accent,
          align: 'center',
          fontFace: 'Arial'
        });

        slide.addText(item.description, {
          x: itemX + 0.1,
          y: 3.4,
          w: stepW - 0.2,
          h: 1.4,
          fontSize: 10,
          color: theme.text,
          align: 'center',
          fontFace: 'Arial'
        });
      } else {
        slide.addText(item.milestone, {
          x: itemX + 0.1,
          y: 3.4,
          w: stepW - 0.2,
          h: 0.4,
          fontSize: 13,
          bold: true,
          color: theme.accent,
          align: 'center',
          fontFace: 'Arial'
        });

        slide.addText(item.description, {
          x: itemX + 0.1,
          y: 1.6,
          w: stepW - 0.2,
          h: 1.3,
          fontSize: 10,
          color: theme.text,
          align: 'center',
          fontFace: 'Arial'
        });
      }
    });
  }
};

const buildProcessSlide = (pptx: any, slide: any, data: any, theme: ThemePalette) => {
  addSlideTitle(pptx, slide, data.title, data.subtitle, theme);

  const steps = data.process || [];
  const count = Math.min(steps.length, 4);

  if (count > 0) {
    const cardW = (9.0 - (count - 1) * 0.25) / count;
    const cardY = 1.7;
    const cardH = 3.1;

    steps.slice(0, count).forEach((step: any, idx: number) => {
      const cardX = 0.5 + idx * (cardW + 0.25);

      slide.addShape(pptx.ShapeType.roundRect, {
        x: cardX,
        y: cardY,
        w: cardW,
        h: cardH,
        fill: { color: theme.cardBg },
        line: { color: theme.cardBorder, width: 1 }
      });

      if (idx < count - 1) {
        slide.addText("→", {
          x: cardX + cardW,
          y: cardY + 1.2,
          w: 0.25,
          h: 0.5,
          fontSize: 20,
          bold: true,
          color: theme.accent,
          align: 'center'
        });
      }

      slide.addText(step.step || `0${idx + 1}`, {
        x: cardX + 0.15,
        y: cardY + 0.2,
        w: cardW - 0.3,
        h: 0.35,
        fontSize: 13,
        bold: true,
        color: theme.accent,
        fontFace: 'Arial'
      });

      slide.addText(step.title, {
        x: cardX + 0.15,
        y: cardY + 0.6,
        w: cardW - 0.3,
        h: 0.5,
        fontSize: 11,
        bold: true,
        color: theme.text,
        fontFace: 'Arial'
      });

      slide.addText(step.desc, {
        x: cardX + 0.15,
        y: cardY + 1.2,
        w: cardW - 0.3,
        h: cardH - 1.4,
        fontSize: 9.5,
        color: theme.muted,
        fontFace: 'Arial',
        lineSpacing: 13
      });
    });
  }
};

const buildDiagramSlide = async (pptx: any, slide: any, data: any, theme: ThemePalette, tempPngPath: string | null) => {
  addSlideTitle(pptx, slide, data.title, data.subtitle, theme);

  if (tempPngPath && fs.existsSync(tempPngPath)) {
    slide.addImage({
      path: tempPngPath,
      x: 1.8,
      y: 1.5,
      w: 6.4,
      h: 3.6
    });
  } else {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.5,
      y: 1.8,
      w: 7.0,
      h: 2.8,
      fill: { color: theme.cardBg },
      line: { color: theme.cardBorder, width: 1 }
    });

    slide.addText("Visual Schematic Concept:", {
      x: 1.8,
      y: 2.0,
      w: 6.4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: theme.accent,
      fontFace: 'Arial'
    });

    const bulletList = (data.content || []).map((b: string) => `• ${b}`).join('\n');
    slide.addText(bulletList || "Diagram rendering in progress. Concept points explain workflow details.", {
      x: 1.8,
      y: 2.5,
      w: 6.4,
      h: 1.8,
      fontSize: 11.5,
      color: theme.text,
      fontFace: 'Arial',
      lineSpacing: 16
    });
  }
};

const buildChartSlide = (pptx: any, slide: any, data: any, theme: ThemePalette) => {
  addSlideTitle(pptx, slide, data.title, data.subtitle, theme);

  const chartData = data.chart || { type: "bar", title: "Metrics Breakdown", labels: ["A", "B", "C"], values: [30, 45, 25] };
  const points = data.content || [];

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.5,
    y: 1.6,
    w: 4.1,
    h: 3.4,
    fill: { color: theme.cardBg },
    line: { color: theme.cardBorder, width: 1 }
  });

  slide.addText(chartData.title || "Key Metrics Overview", {
    x: 0.7,
    y: 1.8,
    w: 3.7,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: theme.accent,
    fontFace: 'Arial'
  });

  const leftList = points.map((p: string) => `• ${p}`).join('\n\n') || "• Quantitative data metrics represented visual model.\n\n• Breakdown parameters demonstrate structural parameters.";
  slide.addText(leftList, {
    x: 0.7,
    y: 2.3,
    w: 3.7,
    h: 2.5,
    fontSize: 10.5,
    color: theme.text,
    fontFace: 'Arial',
    lineSpacing: 13
  });

  try {
    const isPie = chartData.type === 'pie';
    const seriesValues = chartData.values || [10, 20, 30];
    const seriesLabels = chartData.labels || ["Item 1", "Item 2", "Item 3"];

    const pptxChartData = [
      {
        name: chartData.title || "Data Metrics",
        labels: seriesLabels,
        values: seriesValues
      }
    ];

    const chartType = isPie ? pptx.ChartType.pie : pptx.ChartType.bar;
    slide.addChart(chartType, pptxChartData, {
      x: 4.9,
      y: 1.6,
      w: 4.6,
      h: 3.4,
      showLegend: true,
      legendPos: 'b',
      title: chartData.title || "Quantitative Values"
    });
  } catch (chartErr) {
    console.error(`[PPT-BUILD] Native Chart failed. Fallback block.`, chartErr);
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 4.9,
      y: 1.6,
      w: 4.6,
      h: 3.4,
      fill: { color: theme.cardBg },
      line: { color: theme.cardBorder, width: 1 }
    });
  }
};

const buildSummarySlide = (pptx: any, slide: any, data: any, theme: ThemePalette) => {
  addSlideTitle(pptx, slide, data.title, data.subtitle, theme);

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.5,
    y: 1.6,
    w: 4.35,
    h: 3.4,
    fill: { color: theme.accent },
    line: { color: theme.cardBorder, width: 1 }
  });

  slide.addText("TAKEAWAY SUMMARY", {
    x: 0.8,
    y: 1.9,
    w: 3.75,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial'
  });

  slide.addText(data.subtitle || "Synthesized analysis outlines high-yield conceptual points for immediate implementation and retention.", {
    x: 0.8,
    y: 2.4,
    w: 3.75,
    h: 2.3,
    fontSize: 12.5,
    color: 'FFFFFF',
    fontFace: 'Arial',
    lineSpacing: 17
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 5.15,
    y: 1.6,
    w: 4.35,
    h: 3.4,
    fill: { color: theme.cardBg },
    line: { color: theme.cardBorder, width: 1 }
  });

  slide.addText("Core Takeaways:", {
    x: 5.45,
    y: 1.8,
    w: 3.75,
    h: 0.4,
    fontSize: 15,
    bold: true,
    color: theme.accent,
    fontFace: 'Arial'
  });

  const bulletText = (data.content || []).map((b: string) => `✔  ${b}`).join('\n\n') || "✔  Fully synthesized presentation.\n\n✔  Visually balanced layouts.\n\n✔  Optimized academic retention.";
  slide.addText(bulletText, {
    x: 5.45,
    y: 2.3,
    w: 3.75,
    h: 2.5,
    fontSize: 10.5,
    color: theme.text,
    fontFace: 'Arial',
    lineSpacing: 13
  });
};

const buildThankYouSlide = (pptx: any, slide: any, data: any, theme: ThemePalette) => {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2,
    y: 0.2,
    w: 9.6,
    h: 5.225,
    line: { color: theme.accent, width: 2 }
  });

  slide.addText("THANK YOU", {
    x: 1.0,
    y: 1.6,
    w: 8.0,
    h: 1.0,
    fontSize: 44,
    bold: true,
    color: theme.accent,
    fontFace: 'Arial',
    align: 'center'
  });

  if (data.title) {
    slide.addText(data.title, {
      x: 1.0,
      y: 2.7,
      w: 8.0,
      h: 0.5,
      fontSize: 15,
      bold: true,
      color: theme.text,
      fontFace: 'Arial',
      align: 'center'
    });
  }

  slide.addText(data.subtitle || "Any questions or feedback? Feel free to contact us.", {
    x: 1.0,
    y: 3.3,
    w: 8.0,
    h: 0.6,
    fontSize: 12.5,
    color: theme.muted,
    fontFace: 'Arial',
    align: 'center'
  });

  slide.addText("Presented by ExamNotes AI", {
    x: 1.0,
    y: 4.4,
    w: 8.0,
    h: 0.4,
    fontSize: 10,
    bold: true,
    color: theme.accent,
    fontFace: 'Arial',
    align: 'center'
  });
};

// Main PowerPoint Compile Engine
const generatePptFile = async (
  deckData: any,
  style: string,
  themeName: string,
  includeDiagrams: boolean
): Promise<{ fileName: string; slidesCount: number }> => {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  const theme = THEMES[themeName] || THEMES.Light;
  const slides = deckData.slides || [];
  
  for (let i = 0; i < slides.length; i++) {
    const slideData = slides[i];
    const slide = pptx.addSlide();
    slide.background = { fill: theme.bg };

    if (slideData.speakerNotes) {
      slide.addNotes(slideData.speakerNotes);
    }

    if (slideData.type === 'cover') {
      buildCoverSlide(pptx, slide, slideData, theme, style);
    } else if (slideData.type === 'divider') {
      buildDividerSlide(pptx, slide, slideData, theme);
    } else if (slideData.type === 'comparison') {
      buildComparisonSlide(pptx, slide, slideData, theme);
    } else if (slideData.type === 'timeline') {
      buildTimelineSlide(pptx, slide, slideData, theme);
    } else if (slideData.type === 'process') {
      buildProcessSlide(pptx, slide, slideData, theme);
    } else if (slideData.type === 'chart') {
      buildChartSlide(pptx, slide, slideData, theme);
    } else if (slideData.type === 'summary') {
      buildSummarySlide(pptx, slide, slideData, theme);
    } else if (slideData.type === 'thanks') {
      buildThankYouSlide(pptx, slide, slideData, theme);
    } else if (slideData.type === 'diagram') {
      let tempPngPath: string | null = null;

      if (includeDiagrams && slideData.diagramPrompt) {
        try {
          console.log(`[PPT-BUILD] Found diagram, compiling Mermaid CLI adaptively for: "${slideData.diagramPrompt}"`);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const promptText = buildMermaidPrompt(slideData.diagramPrompt, "Auto Detect");
          const result = await model.generateContent(promptText);
          const response = await result.response;
          let mermaidCode = response.text().trim();
          
          if (mermaidCode.startsWith('```')) {
            mermaidCode = mermaidCode.replace(/^```[a-zA-Z0-9]*\n/, '').replace(/\n```$/, '');
          }
          mermaidCode = mermaidCode.trim();

          const tempBaseName = `temp_ppt_diag_${Date.now()}`;
          const mmdPath = path.join(DIAGRAM_OUTPUT_DIR, `${tempBaseName}.mmd`);
          const pngPath = path.join(DIAGRAM_OUTPUT_DIR, `${tempBaseName}.png`);

          fs.writeFileSync(mmdPath, mermaidCode);
          await execPromise(`npx mmdc -i "${mmdPath}" -o "${pngPath}"`);
          tempPngPath = pngPath;

          // Background cleanup schedule
          setTimeout(() => {
            try {
              if (fs.existsSync(mmdPath)) fs.unlinkSync(mmdPath);
              if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
            } catch {}
          }, 5000);
        } catch (diagErr: any) {
          console.warn(`[PPT-BUILD] Diagram CLI compilation skipped:`, diagErr.message || diagErr);
        }
      }
      await buildDiagramSlide(pptx, slide, slideData, theme, tempPngPath);
    } else {
      buildContentSlide(pptx, slide, slideData, theme);
    }
  }

  const timestamp = Date.now();
  const outputFileName = `presentation_${timestamp}.pptx`;
  const outputPath = path.join(PRESENTATIONS_DIR, outputFileName);

  await pptx.writeFile({ fileName: outputPath });
  console.log(`[PPT-BUILD] Slide deck compiled to disk: ${outputPath}`);

  return {
    fileName: outputFileName,
    slidesCount: slides.length
  };
};

// Configure Multer storage for DOCX upload
const storageDocx = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, INPUT_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 100);
    cb(null, `docx_ppt_${Date.now()}${ext}`);
  }
});

const uploadDocx = multer({
  storage: storageDocx,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB file limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.docx') {
      return cb(new Error('Only Word document files (.docx) are allowed.'));
    }
    cb(null, true);
  }
});

// Route: AI Presentation Generate Endpoint
router.post('/presentation/generate', verifyToken, async (req: AuthRequest, res: any) => {
  uploadDocx.single('file')(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { noteId, rawText, presentationStyle, theme, slideCount, includeCharts, includeDiagrams } = req.body;

      const style = presentationStyle || 'Professional';
      const themeColor = theme || 'Light';
      const slideNum = slideCount || 'Auto';
      const chartsEnabled = includeCharts === 'true' || includeCharts === true;
      const diagramsEnabled = includeDiagrams === 'true' || includeDiagrams === true;

      let sourceText = '';
      let titleGuess = 'AI Presentation';

      if (req.file) {
        console.log(`[PPT-ENDPOINT] Parsing Word document: ${req.file.originalname}`);
        const result = await mammoth.extractRawText({ path: req.file.path });
        sourceText = result.value;
        titleGuess = path.basename(req.file.originalname, path.extname(req.file.originalname));
        
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      } else if (noteId) {
        console.log(`[PPT-ENDPOINT] Collation search for library note ID: ${noteId}`);
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) return res.status(404).json({ error: 'User record not found.' });

        const note = await Note.findOne({ _id: noteId, userId: user._id });
        if (!note) return res.status(404).json({ error: 'Note document not found.' });

        sourceText = `${note.topic}\n\n${note.content}`;
        titleGuess = note.topic;
      } else if (rawText) {
        console.log(`[PPT-ENDPOINT] Synthesizing raw pasted notes text...`);
        sourceText = rawText;
        titleGuess = rawText.slice(0, 35).trim() + '...';
      } else {
        return res.status(400).json({ error: 'No content inputs resolved. Please upload DOCX, pick note, or paste text.' });
      }

      if (!sourceText || sourceText.trim().length < 10) {
        return res.status(400).json({ error: 'Content size is insufficient. Make sure your input has valid text.' });
      }

      console.log(`[PPT-ENDPOINT] Requesting layout synthesis structures from Gemini...`);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = buildPresentationPrompt(sourceText, style, slideNum, chartsEnabled, diagramsEnabled);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let textOutput = response.text().trim();

      if (textOutput.startsWith('```')) {
        textOutput = textOutput.replace(/^```[a-zA-Z0-9]*\n/, '').replace(/\n```$/, '');
      }
      textOutput = textOutput.trim();

      let deckData: any;
      try {
        deckData = JSON.parse(textOutput);
      } catch (jsonErr) {
        console.error(`[PPT-ENDPOINT] Gemini JSON parsing failed! Raw text:\n${textOutput}`);
        return res.status(500).json({ error: 'Outline structuring failed. Please try again.' });
      }

      console.log(`[PPT-ENDPOINT] Rendering slide templates with PptxGenJS...`);
      const { fileName, slidesCount } = await generatePptFile(
        deckData,
        style,
        themeColor,
        diagramsEnabled
      );

      const finalTitle = deckData.title || titleGuess || 'Premium Presentation';
      const historyEntry = new PresentationHistory({
        userId: req.user.uid,
        title: finalTitle,
        fileName,
        slidesCount,
        theme: themeColor,
        presentationStyle: style
      });

      await historyEntry.save();
      console.log(`[PPT-ENDPOINT] PowerPoint compiled and saved to history: ${historyEntry._id}`);

      return res.json({
        success: true,
        message: 'Presentation generated successfully!',
        presentation: {
          _id: historyEntry._id,
          title: historyEntry.title,
          fileName: historyEntry.fileName,
          slidesCount: historyEntry.slidesCount,
          theme: historyEntry.theme,
          presentationStyle: historyEntry.presentationStyle,
          downloadUrl: `/api/tools/download/${fileName}`,
          slides: deckData.slides,
          createdAt: historyEntry.createdAt
        }
      });

    } catch (err: any) {
      console.error(`[PPT-ENDPOINT] Slide deck processing crashed:`, err);
      return res.status(500).json({ error: err.message || 'PowerPoint generation failed.' });
    }
  });
});

// Route: Fetch Chronological Presentation History
router.get('/presentation/history', verifyToken, async (req: AuthRequest, res: any) => {
  try {
    console.log(`[PPT-HISTORY] Fetching visual history rows for: ${req.user.uid}`);
    const history = await PresentationHistory.find({ userId: req.user.uid }).sort({ createdAt: -1 });
    
    const formatted = history.map((item) => ({
      _id: item._id,
      title: item.title,
      fileName: item.fileName,
      slidesCount: item.slidesCount,
      theme: item.theme,
      presentationStyle: item.presentationStyle,
      downloadUrl: `/api/tools/download/${item.fileName}`,
      createdAt: item.createdAt
    }));

    return res.json({
      success: true,
      history: formatted
    });
  } catch (err: any) {
    console.error(`[PPT-HISTORY] Fetching logs crashed:`, err);
    return res.status(500).json({ error: 'Failed to fetch presentation history.' });
  }
});

// Route: Delete Slide Deck
router.delete('/presentation/history/:id', verifyToken, async (req: AuthRequest, res: any) => {
  try {
    const recordId = req.params.id;
    console.log(`[PPT-DELETE] Deleting entry visual row ID: ${recordId} by UID: ${req.user.uid}`);

    const record = await PresentationHistory.findOne({ _id: recordId, userId: req.user.uid });
    if (!record) {
      return res.status(404).json({ error: 'Presentation history record not found.' });
    }

    const filePath = path.join(PRESENTATIONS_DIR, record.fileName);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[PPT-DELETE] Physically deleted slides deck file: ${record.fileName}`);
      }
    } catch (unlinkErr) {
      console.warn(`[PPT-DELETE] File deletion skipped: ${filePath}`, unlinkErr);
    }

    await record.deleteOne();
    console.log(`[PPT-DELETE] Presentation log record deleted: ${recordId}`);

    return res.json({
      success: true,
      message: 'Presentation record and file deleted successfully.'
    });
  } catch (err: any) {
    console.error(`[PPT-DELETE] Deletion logic failed:`, err);
    return res.status(500).json({ error: err.message || 'Failed to delete presentation history record.' });
  }
});

// Route 3: Secure download endpoint with traversal guards
router.get('/download/:filename', (req, res: any) => {
  try {
    const filename = req.params.filename;
    
    // Strict defense against directory traversal (e.g. filename = '../../index.js')
    const safeFilename = path.basename(filename);
    
    // Dynamically resolve directory location based on prefix
    let filePath = path.join(OUTPUT_DIR, safeFilename);
    if (safeFilename.startsWith('Merged_')) {
      filePath = path.join(MERGED_OUTPUT_DIR, safeFilename);
    } else if (safeFilename.startsWith('diagram_')) {
      filePath = path.join(DIAGRAM_OUTPUT_DIR, safeFilename);
    } else if (safeFilename.startsWith('presentation_')) {
      filePath = path.join(PRESENTATIONS_DIR, safeFilename);
    } else if (safeFilename.startsWith('split_')) {
      filePath = path.join(SPLIT_OUTPUT_DIR, safeFilename);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Requested file not found or link has expired.' });
    }

    // Set responsive attachment download headers
    res.download(filePath, safeFilename, (err: any) => {
      if (err) {
        console.error(`[DOWNLOAD] Error occurred while transferring file: ${safeFilename}`, err);
      }
    });
  } catch (err) {
    console.error('[DOWNLOAD] Download handler crashed:', err);
    return res.status(500).json({ error: 'Internal server download error' });
  }
});

export default router;
