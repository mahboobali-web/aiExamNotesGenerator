import express from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import Note from '../models/Note';
import User from '../models/User';

const router = express.Router();

// Fetch all notes for authenticated user
router.get('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notes = await Note.find({ userId: user._id }).sort({ createdAt: -1 });
    res.json({ notes });
  } catch (error) {
    console.error('Fetch all notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Fetch single note for authenticated user
router.get('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const note = await Note.findOne({ _id: req.params.id, userId: user._id });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    res.json({ note });
  } catch (error) {
    console.error('Fetch single note error:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// Delete note for authenticated user
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: user._id });
    if (!note) return res.status(404).json({ error: 'Note not found or unauthorized' });

    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
