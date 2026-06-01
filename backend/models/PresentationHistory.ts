import mongoose, { Schema, Document } from 'mongoose';

export interface IPresentationHistory extends Document {
  userId: string;
  title: string;
  fileName: string;
  slidesCount: number;
  theme: string;
  presentationStyle: string;
  createdAt: Date;
  updatedAt: Date;
}

const PresentationHistorySchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  fileName: { type: String, required: true },
  slidesCount: { type: Number, required: true },
  theme: { type: String, required: true },
  presentationStyle: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<IPresentationHistory>('PresentationHistory', PresentationHistorySchema);
