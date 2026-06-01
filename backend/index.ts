import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import generateRoutes from './routes/generate';
import paymentRoutes from './routes/payments';
import notesRoutes from './routes/notes';
import toolRoutes from './routes/tools';

dotenv.config();

const app = express();

app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000, // Increase limits for active development/HMR syncs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({
  verify: (req: any, res, buf) => {
    if (req.originalUrl.startsWith('/api/checkout/webhook')) {
      req.rawBody = buf;
    }
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/checkout', paymentRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/tools', toolRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai-exam-notes';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
