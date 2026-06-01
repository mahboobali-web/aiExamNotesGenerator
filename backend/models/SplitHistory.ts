import mongoose, { Schema, Document } from 'mongoose';

export interface ISplitHistory extends Document {
  userId: string;
  fileName: string;
  splitMethod: string;
  generatedFiles: string[];
  createdAt: Date;
}

const SplitHistorySchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  splitMethod: { type: String, required: true },
  generatedFiles: [{ type: String, required: true }]
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model<ISplitHistory>('SplitHistory', SplitHistorySchema);
