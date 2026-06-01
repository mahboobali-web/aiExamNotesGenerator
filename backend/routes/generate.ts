import express from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { generateNotes } from '../services/gemini';
import User from '../models/User';
import Note from '../models/Note';

const router = express.Router();

router.post('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { 
      topic, 
      classLevel, 
      examType, 
      revisionMode, 
      includeDiagram, 
      includeChart,
      quickSheet
    } = req.body;
    const { uid } = req.user;

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // STRICT CREDIT CHECK: Ensure no notes are generated if credits are 0 or less
    if (!user.freeCredits || user.freeCredits <= 0) {
      return res.status(403).json({ error: 'Insufficient credits. Please purchase more.' });
    }

    // Call Gemini API with the new robust prompting parameters
    const content = await generateNotes({
      topic,
      classLevel,
      examType,
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
      academicLevel: classLevel || 'General',
      classLevel: classLevel || '',
      examType: examType || 'General',
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
