import { NextResponse } from "next/server";
import { AuthManager } from "@/lib/auth-manager";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, displayName, profilePicture, webLockPasscodeHash } = body;

    if (!username) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }

    const user = await AuthManager.findUser(username);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const success = await AuthManager.updateProfile(username, { displayName, profilePicture, webLockPasscodeHash });

    if (success) {
      const updatedUser = await AuthManager.findUser(username);
      return NextResponse.json({
        success: true,
        user: {
          username: updatedUser?.username,
          email: updatedUser?.email,
          displayName: updatedUser?.displayName,
          profilePicture: updatedUser?.profilePicture,
          googleId: updatedUser?.googleId,
          hasPassword: !!updatedUser?.passwordHash,
          webLockPasscodeHash: updatedUser?.webLockPasscodeHash
        }
      });
    } else {
      return NextResponse.json({ error: "Failed to update profile info." }, { status: 500 });
    }
  } catch (e: any) {
    console.error("Profile update API error:", e);
    return NextResponse.json({ error: e.message || "Failed to update profile." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }

    const user = await AuthManager.findUser(username);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
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
    console.error("Profile GET API error:", e);
    return NextResponse.json({ error: e.message || "Failed to fetch profile." }, { status: 500 });
  }
}
