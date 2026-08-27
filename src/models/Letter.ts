import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILetter extends Document {
  username: string;
  title: string;
  content: string;
  senderName: string;
  recipientName: string;
  recipientEmail: string;
  unlockDate: Date;
  passcode?: string; // custom optional simple password to decrypt
  timestamp: Date;
}

const LetterSchema: Schema = new Schema({
  username: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  senderName: { type: String, required: true, default: "Consciousness Core" },
  recipientName: { type: String, required: true },
  recipientEmail: { type: String, required: true },
  unlockDate: { type: Date, required: true },
  passcode: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now }
});

const Letter: Model<ILetter> = mongoose.models.Letter || mongoose.model<ILetter>("Letter", LetterSchema);

export default Letter;
