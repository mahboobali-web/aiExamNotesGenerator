import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastActive: Date;
  createdAt: Date;
  revokedAt?: Date;
}

const SessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  refreshToken: { type: String, required: true },
  device: { type: String, default: 'Unknown Device' },
  browser: { type: String, default: 'Unknown Browser' },
  os: { type: String, default: 'Unknown OS' },
  ipAddress: { type: String, default: '127.0.0.1' },
  location: { type: String, default: 'Unknown Location' },
  lastActive: { type: Date, default: Date.now },
  revokedAt: { type: Date }
}, { timestamps: { createdAt: true, updatedAt: false } });

// Index for fast lookups by userId and refreshToken
SessionSchema.index({ userId: 1, refreshToken: 1 });

export default mongoose.model<ISession>('Session', SessionSchema);
