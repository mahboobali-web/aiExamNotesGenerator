import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  topic: string;
  academicLevel: string; // Keep for backward compatibility
  classLevel: string;
  examType: string;
  revisionMode: boolean;
  includeDiagram: boolean;
  includeChart: boolean;
  content: string; // The raw JSON string returned from Gemini matching buildPrompt
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  topic: { type: String, required: true },
  academicLevel: { type: String, default: 'General' },
  classLevel: { type: String, default: '' },
  examType: { type: String, default: 'General' },
  revisionMode: { type: Boolean, default: false },
  includeDiagram: { type: Boolean, default: false },
  includeChart: { type: Boolean, default: false },
  content: { type: String, required: true },
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<INote>('Note', NoteSchema);
