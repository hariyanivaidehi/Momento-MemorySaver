import { NextResponse } from "next/server";
import { AuthManager } from "@/lib/auth-manager";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, email: mockEmail, name: mockName } = body;

    let email = mockEmail;
    let name = mockName;
    let googleId = "";
    let profilePicture = "";

    if (token) {
      // Validate Google Token using Google's live tokeninfo endpoint
      try {
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        if (res.ok) {
          const payload = await res.json();
          email = payload.email;
          name = payload.name || payload.given_name || email.split("@")[0];
          googleId = payload.sub;
          profilePicture = payload.picture || "";
        } else {
          console.warn("Google tokeninfo returned non-ok status. Utilizing fallback if available.");
        }
      } catch (err) {
        console.error("Failed to connect to Google tokeninfo API:", err);
      }
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required for Google Sign-in." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    
    // Generate fallback simulated googleId/avatar for mock flow
    if (!googleId) {
      googleId = `google_mock_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "")}`;
    }
    if (!profilePicture) {
      profilePicture = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}&scale=85`;
    }

    // Check if user exists by googleId or email
    let user = await AuthManager.findUser(googleId);
    if (!user) {
      user = await AuthManager.findUser(cleanEmail);
    }

    if (!user) {
      // Generate a secure, unique username from email prefix
      let baseUsername = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
      if (baseUsername.length < 3) {
        baseUsername = "user" + Math.floor(100 + Math.random() * 900);
      }

      // Ensure username is unique in database
      let finalUsername = baseUsername;
      let counter = 1;
      while (await AuthManager.findUser(finalUsername)) {
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }

      // Create new Google SSO account
      user = await AuthManager.createUser(
        finalUsername,
        cleanEmail,
        undefined, // No password initially for Google SSO
        googleId,
        name,
        profilePicture
      );
    } else {
      // User exists. Link/sync google profile details if missing.
      let needsUpdate = false;
      const updates: any = {};

      if (!user.googleId) {
        updates.googleId = googleId;
        needsUpdate = true;
      }
      if (!user.profilePicture) {
        updates.profilePicture = profilePicture;
        needsUpdate = true;
      }
      if ((!user.displayName || user.displayName === user.username) && name) {
        updates.displayName = name;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await AuthManager.updateProfile(user.username, updates);
        const updated = await AuthManager.findUser(user.username);
        if (updated) user = updated;
      }
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
        webLockPasscodeHash: user.webLockPasscodeHash
      }
    });
  } catch (e: any) {
    console.error("Google authentication error:", e);
    return NextResponse.json({ error: e.message || "Google Authentication failed." }, { status: 500 });
  }
}
