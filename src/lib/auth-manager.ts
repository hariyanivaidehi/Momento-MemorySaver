import fs from "fs";
import path from "path";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import User, { IUser, IWebAuthnCredential } from "@/models/User";

const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
const USERS_FILE = isVercel
  ? path.join("/tmp", "auth-users.json")
  : path.join(process.cwd(), "src/lib/auth-users.json");

export interface LocalUser {
  username: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  displayName?: string;
  profilePicture?: string;
  webLockPasscodeHash?: string;
  credentials: IWebAuthnCredential[];
  mobileNumber?: string;
  mobileVerified?: boolean;
}

// In-memory challenge store (mapped username -> challenge)
const challengeStore = new Map<string, string>();

function derToPem(derBuffer: Buffer): string {
  const base64 = derBuffer.toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

export class AuthManager {
  // Try connecting to MongoDB. Returns true if successful.
  private static async isDbConnected(): Promise<boolean> {
    try {
      await connectToDatabase();
      return true;
    } catch (e) {
      // Silently fail over to JSON file
      return false;
    }
  }

  // Load local users from JSON backup
  private static getLocalUsers(): LocalUser[] {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Failed to read local users file", e);
    }
    return [];
  }

  // Save local users to JSON backup
  private static saveLocalUsers(users: LocalUser[]) {
    try {
      const dir = path.dirname(USERS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write local users file", e);
      throw e;
    }
  }

  // Hash password using PBKDF2-SHA512 (one-way salted encryption)
  static hashPassword(password: string): string {
    const salt = "memento_secure_salt_912837198273";
    return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  }

  // Check if any users exist in the system
  static async exists(): Promise<boolean> {
    if (await this.isDbConnected()) {
      try {
        const count = await User.countDocuments();
        return count > 0;
      } catch (e) {
        // Fallback to local count if query fails
      }
    }
    return this.getLocalUsers().length > 0;
  }

  // Find user by username, email, or mobile number
  static async findUser(usernameOrEmailOrMobile: string): Promise<LocalUser | null> {
    const term = usernameOrEmailOrMobile.toLowerCase().trim();

    if (await this.isDbConnected()) {
      try {
        const dbUser = await User.findOne({
          $or: [
            { username: term },
            { email: term },
            { googleId: term },
            { mobileNumber: term }
          ]
        });
        if (dbUser) {
          return {
            username: dbUser.username,
            email: dbUser.email,
            passwordHash: dbUser.passwordHash || "",
            googleId: dbUser.googleId || "",
            displayName: dbUser.displayName || dbUser.username,
            profilePicture: dbUser.profilePicture || "",
            webLockPasscodeHash: dbUser.webLockPasscodeHash || "",
            credentials: dbUser.credentials || [],
            mobileNumber: dbUser.mobileNumber || "",
            mobileVerified: !!dbUser.mobileVerified
          };
        }
      } catch (e) {
        // Fallback to local search
      }
    }

    // JSON file search
    const local = this.getLocalUsers();
    const matched = local.find(
      u => u.username.toLowerCase() === term || 
           u.email.toLowerCase() === term || 
           (u.googleId && u.googleId.toLowerCase() === term) ||
           (u.mobileNumber && u.mobileNumber === term)
    );
    return matched || null;
  }

  // Create a new user
  static async createUser(
    username: string,
    email: string,
    passwordHash?: string,
    googleId?: string,
    displayName?: string,
    profilePicture?: string,
    mobileNumber?: string,
    mobileVerified?: boolean
  ): Promise<LocalUser> {
    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();

    const newUser: LocalUser = {
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: passwordHash || "",
      googleId: googleId || "",
      displayName: displayName || username,
      profilePicture: profilePicture || "",
      webLockPasscodeHash: "",
      credentials: [],
      mobileNumber: mobileNumber || "",
      mobileVerified: !!mobileVerified
    };

    if (await this.isDbConnected()) {
      try {
        await User.create(newUser);
        return newUser;
      } catch (e) {
        // Fallback to JSON saving if database writes fail
      }
    }

    // JSON file saving
    const local = this.getLocalUsers();
    local.push(newUser);
    this.saveLocalUsers(local);
    return newUser;
  }

  // Update user's profile info (displayName, profilePicture, webLockPasscodeHash)
  static async updateProfile(
    username: string,
    updates: { displayName?: string; profilePicture?: string; email?: string; webLockPasscodeHash?: string }
  ): Promise<boolean> {
    const cleanUsername = username.toLowerCase().trim();

    if (await this.isDbConnected()) {
      try {
        const updateObj: any = {};
        if (updates.displayName !== undefined) updateObj.displayName = updates.displayName;
        if (updates.profilePicture !== undefined) updateObj.profilePicture = updates.profilePicture;
        if (updates.email !== undefined) updateObj.email = updates.email.toLowerCase().trim();
        if (updates.webLockPasscodeHash !== undefined) updateObj.webLockPasscodeHash = updates.webLockPasscodeHash;

        const result = await User.updateOne(
          { username: cleanUsername },
          { $set: updateObj }
        );
        if (result.matchedCount > 0) return true;
      } catch (e) {
        // Fallback
      }
    }

    // JSON fallback
    const local = this.getLocalUsers();
    const idx = local.findIndex(u => u.username.toLowerCase() === cleanUsername);
    if (idx !== -1) {
      if (updates.displayName !== undefined) local[idx].displayName = updates.displayName;
      if (updates.profilePicture !== undefined) local[idx].profilePicture = updates.profilePicture;
      if (updates.email !== undefined) local[idx].email = updates.email.toLowerCase().trim();
      if (updates.webLockPasscodeHash !== undefined) local[idx].webLockPasscodeHash = updates.webLockPasscodeHash;
      this.saveLocalUsers(local);
      return true;
    }
    return false;
  }

  // Add a WebAuthn credential to a specific user
  static async addCredential(username: string, credentialId: string, publicKeyDerB64: string): Promise<boolean> {
    const cleanUsername = username.toLowerCase().trim();
    const newCred: IWebAuthnCredential = {
      credentialId,
      publicKey: publicKeyDerB64,
      counter: 0
    };

    if (await this.isDbConnected()) {
      try {
        const result = await User.updateOne(
          { username: cleanUsername },
          { $push: { credentials: newCred } }
        );
        if (result.modifiedCount > 0) return true;
      } catch (e) {
        // Fallback to JSON saving
      }
    }

    // JSON file saving
    const local = this.getLocalUsers();
    const idx = local.findIndex(u => u.username.toLowerCase() === cleanUsername);
    if (idx !== -1) {
      // Remove duplicate credential ID if somehow exists
      local[idx].credentials = local[idx].credentials.filter(c => c.credentialId !== credentialId);
      local[idx].credentials.push(newCred);
      this.saveLocalUsers(local);
      return true;
    }
    return false;
  }

  // Get credential by ID across all users
  static async getCredential(credentialId: string): Promise<{ username: string; cred: IWebAuthnCredential } | null> {
    if (await this.isDbConnected()) {
      try {
        const user = await User.findOne({ "credentials.credentialId": credentialId });
        if (user) {
          const cred = user.credentials.find((c: any) => c.credentialId === credentialId);
          if (cred) {
            return {
              username: user.username,
              cred: {
                credentialId: cred.credentialId,
                publicKey: cred.publicKey,
                counter: cred.counter
              }
            };
          }
        }
      } catch (e) {
        // Fallback to JSON
      }
    }

    // JSON file search
    const local = this.getLocalUsers();
    for (const u of local) {
      const cred = u.credentials.find(c => c.credentialId === credentialId);
      if (cred) {
        return { username: u.username, cred };
      }
    }
    return null;
  }

  // Generate a random 32-byte challenge
  static generateChallenge(username: string): string {
    const cleanUsername = username.toLowerCase().trim();
    const challenge = crypto.randomBytes(32).toString("base64url");
    challengeStore.set(cleanUsername, challenge);
    return challenge;
  }

  // Retrieve cached challenge
  static getChallenge(username: string): string | undefined {
    return challengeStore.get(username.toLowerCase().trim());
  }

  // Consume cached challenge
  static consumeChallenge(username: string): string | undefined {
    const cleanUsername = username.toLowerCase().trim();
    const chal = challengeStore.get(cleanUsername);
    challengeStore.delete(cleanUsername);
    return chal;
  }

  // Verify WebAuthn assertion signature using Node's crypto
  static verifyAssertionSignature(
    publicKeyDerB64: string,
    authenticatorDataB64url: string,
    clientDataJSONB64url: string,
    signatureB64url: string
  ): boolean {
    try {
      const clientDataHash = crypto
        .createHash("sha256")
        .update(Buffer.from(clientDataJSONB64url, "base64url"))
        .digest();

      const authenticatorData = Buffer.from(authenticatorDataB64url, "base64url");
      const verifyData = Buffer.concat([authenticatorData, clientDataHash]);

      const publicKeyDer = Buffer.from(publicKeyDerB64, "base64url");
      const publicKeyPem = derToPem(publicKeyDer);

      const signature = Buffer.from(signatureB64url, "base64url");

      return crypto.verify(
        "sha256", // Explicitly hash verifyData with SHA-256 for ES256/RS256 checks
        verifyData,
        publicKeyPem,
        signature
      );
    } catch (e) {
      console.error("Signature verification error:", e);
      return false;
    }
  }

  // Update user's password hash (for hash migration)
  static async updatePasswordHash(username: string, newPasswordHash: string): Promise<boolean> {
    const cleanUsername = username.toLowerCase().trim();

    if (await this.isDbConnected()) {
      try {
        const result = await User.updateOne(
          { username: cleanUsername },
          { $set: { passwordHash: newPasswordHash } }
        );
        if (result.matchedCount > 0) return true;
      } catch (e) {
        // Fallback to JSON
      }
    }

    // JSON file saving
    const local = this.getLocalUsers();
    const idx = local.findIndex(u => u.username.toLowerCase() === cleanUsername);
    if (idx !== -1) {
      local[idx].passwordHash = newPasswordHash;
      this.saveLocalUsers(local);
      return true;
    }
    return false;
  }
}
