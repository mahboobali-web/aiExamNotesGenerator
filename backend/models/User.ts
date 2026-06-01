import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  displayName: string;
  freeCredits: number;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  displayName: { type: String },
  freeCredits: { type: Number, default: 100 },
  stripeCustomerId: { type: String },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
