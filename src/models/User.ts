import mongoose, { Schema, Document } from "mongoose";

export interface IWebAuthnCredential {
  credentialId: string;
  publicKey: string; // Base64URL encoded SPKI DER
  counter: number;
}

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash?: string; // SHA-256 password hash (optional for Google SSO)
  googleId?: string; // Unique Google identifier
  displayName?: string; // Real user display name
  profilePicture?: string; // Base64 data URL or URL string
  webLockPasscodeHash?: string; // Web lock screen passcode PIN hash
  credentials: IWebAuthnCredential[];
  mobileNumber?: string;
  mobileVerified?: boolean;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true },
  passwordHash: { type: String, required: false },
  googleId: { type: String, unique: true, sparse: true },
  displayName: { type: String },
  profilePicture: { type: String },
  webLockPasscodeHash: { type: String },
  mobileNumber: { type: String, unique: true, sparse: true },
  mobileVerified: { type: Boolean, default: false },
  credentials: [
    {
      credentialId: { type: String, required: true },
      publicKey: { type: String, required: true },
      counter: { type: Number, default: 0 }
    }
  ]
});

// Avoid Re-compilation of model in Next.js Hot Reloading
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
