import express from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { generateNotes } from '../services/gemini';
import User from '../models/User';
import Note from '../models/Note';
import multer from 'multer';
import mammoth from 'mammoth';
const pdfParse = require('pdf-parse');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const router = express.Router();

router.post('/', verifyToken, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'Invalid request body or missing form data boundary.' });
    }

    const { 
      topic, 
      outputLength,
      language,
      learningStyle
    } = req.body;

    const revisionMode = req.body.revisionMode === 'true' || req.body.revisionMode === true;
    const includeDiagram = req.body.includeDiagram === 'true' || req.body.includeDiagram === true;
    const includeChart = req.body.includeChart === 'true' || req.body.includeChart === true;
    const quickSheet = req.body.quickSheet === 'true' || req.body.quickSheet === true;
    const { uid } = req.user;

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // STRICT CREDIT CHECK: Ensure no notes are generated if credits are 0 or less
    if (!user.freeCredits || user.freeCredits <= 0) {
      return res.status(403).json({ error: 'Insufficient credits. Please purchase more.' });
    }

    let extractedText = '';
    
    if (req.file) {
      try {
        const fileBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        const originalName = req.file.originalname.toLowerCase();

        if (mimeType === 'text/plain' || originalName.endsWith('.txt')) {
          extractedText = fileBuffer.toString('utf-8');
        } else if (mimeType === 'application/pdf' || originalName.endsWith('.pdf')) {
          const pdfData = await pdfParse(fileBuffer);
          extractedText = pdfData.text;
        } else if (
          mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          originalName.endsWith('.docx')
        ) {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value;
        }
      } catch (err) {
        console.error('File extraction error:', err);
        return res.status(400).json({ error: 'Failed to extract text from the uploaded file. Please ensure it is a valid PDF, DOCX, or TXT.' });
      }
    }

    // Call Gemini API with the new robust prompting parameters
    const content = await generateNotes({
      topic,
      fileContext: extractedText,
      outputLength,
      language,
      learningStyle,
      revisionMode,
      includeDiagram,
      includeChart,
      quickSheet
    });

    // Deduct exactly 1 credit from backend account and save
    user.freeCredits -= 1;
    await user.save();

    // Save Note to MongoDB with all visual and state attributes
    const note = new Note({
      userId: user._id,
      topic,
      academicLevel: learningStyle || 'Academic',
      classLevel: outputLength || 'Medium',
      examType: language || 'English',
      revisionMode: !!revisionMode,
      includeDiagram: !!includeDiagram,
      includeChart: !!includeChart,
      content,
    });
    await note.save();

    res.json({ note, remainingCredits: user.freeCredits });
  } catch (error: any) {
    console.error('Generate notes error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
