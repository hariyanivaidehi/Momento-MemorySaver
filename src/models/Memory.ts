import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMemory extends Document {
  username: string;
  title: string;
  content: string;
  emotion: "nostalgic" | "existential" | "joyful" | "melancholic" | "serene";
  tags: string[];
  wing: string; // high-level memory category wing
  mainTopic?: string; // e.g., "My School", "College", "Family"
  subtopic?: string; // e.g., "10th Grade Farewell", "Annual Sports Day"
  attachments?: Array<{
    type: "image" | "video" | "audio" | "file";
    name: string;
    url: string;
    size?: string;
  }>;
  voiceNote?: string; // base64 audio recording
  pointer?: string; // spatial memory address pointer
  x: number; // coordinate for constellation canvas
  y: number; // coordinate for constellation canvas
  z: number; // particle depth coordinate
  timestamp: Date;
}

const MemorySchema: Schema = new Schema({
  username: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  emotion: { 
    type: String, 
    enum: ["nostalgic", "existential", "joyful", "melancholic", "serene"], 
    default: "serene" 
  },
  tags: [{ type: String }],
  wing: { type: String, required: true, default: "PERSONAL" },
  mainTopic: { type: String, default: "General" },
  subtopic: { type: String, default: "" },
  attachments: [{
    type: { type: String, enum: ["image", "video", "audio", "file"] },
    name: { type: String },
    url: { type: String },
    size: { type: String }
  }],
  voiceNote: { type: String },
  pointer: { type: String },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  z: { type: Number, required: true, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

const Memory: Model<IMemory> = mongoose.models.Memory || mongoose.model<IMemory>("Memory", MemorySchema);

export default Memory;
