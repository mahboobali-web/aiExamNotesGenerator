import mongoose, { Schema, Document } from 'mongoose';

export interface IImageHistory extends Document {
  userId: string;
  prompt: string;
  style: string;
  size: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const ImageHistorySchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  prompt: { type: String, required: true },
  style: { type: String, required: true },
  size: { type: String, required: true },
  imageUrl: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<IImageHistory>('ImageHistory', ImageHistorySchema);
