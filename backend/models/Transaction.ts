import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  creditsAdded: number;
  stripePaymentIntentId: string;
  stripeSessionId: string;
  packageName: string;
  cardBrand: string;
  cardLast4: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  creditsAdded: { type: Number, required: true },
  stripePaymentIntentId: { type: String },
  stripeSessionId: { type: String, unique: true, sparse: true },
  packageName: { type: String, default: 'AI Credits' },
  cardBrand: { type: String, default: 'card' },
  cardLast4: { type: String, default: '****' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, { timestamps: true });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
