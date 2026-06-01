import mongoose, { Schema, Document } from 'mongoose';

export interface IDiagramHistory extends Document {
  userId: string;
  prompt: string;
  diagramType: string;
  mermaidCode: string;
  diagramPath: string; // Base name of the output diagram files (e.g., diagram_timestamp)
  createdAt: Date;
  updatedAt: Date;
}

const DiagramHistorySchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  prompt: { type: String, required: true },
  diagramType: { type: String, required: true },
  mermaidCode: { type: String, required: true },
  diagramPath: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<IDiagramHistory>('DiagramHistory', DiagramHistorySchema);
