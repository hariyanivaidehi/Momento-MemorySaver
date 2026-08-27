import { NextResponse } from "next/server";
import { AuthManager } from "@/lib/auth-manager";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usernameOrEmail, password } = body;

    if (!usernameOrEmail || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const user = await AuthManager.findUser(usernameOrEmail);
    if (!user) {
      return NextResponse.json({ error: "Invalid username/email or password." }, { status: 401 });
    }

    const incomingHash = AuthManager.hashPassword(password);
    if (!user.passwordHash || user.passwordHash !== incomingHash) {
      // Check if it's an old SHA-256 hash (64 hex characters) from the previous session
      if (user.passwordHash && user.passwordHash.length === 64) {
        const oldHash = crypto.createHash("sha256").update(password).digest("hex");
        if (user.passwordHash === oldHash) {
          // Password is correct! Upgrade the hash in the DB to the new PBKDF2 format
          await AuthManager.updatePasswordHash(user.username, incomingHash);
          return NextResponse.json({
            success: true,
            user: {
              username: user.username,
              email: user.email,
              displayName: user.displayName || user.username,
              profilePicture: user.profilePicture || "",
              googleId: user.googleId || "",
              hasPassword: true, // since we just verified password login!
              webLockPasscodeHash: user.webLockPasscodeHash,
              mobileNumber: user.mobileNumber || "",
              mobileVerified: !!user.mobileVerified
            }
          });
        }
      }
      return NextResponse.json({ error: "Invalid username/email or password." }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        displayName: user.displayName || user.username,
        profilePicture: user.profilePicture || "",
        googleId: user.googleId || "",
        hasPassword: !!user.passwordHash,
        webLockPasscodeHash: user.webLockPasscodeHash,
        mobileNumber: user.mobileNumber || "",
        mobileVerified: !!user.mobileVerified
      }
    });
  } catch (e: any) {
    console.error("Login error:", e);
    return NextResponse.json({ error: e.message || "Authentication failed." }, { status: 500 });
  }
}
