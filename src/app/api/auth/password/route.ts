import { NextResponse } from "next/server";
import { AuthManager } from "@/lib/auth-manager";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, currentPassword, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and new password are required." }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: "New password must be at least 4 characters long." }, { status: 400 });
    }

    const user = await AuthManager.findUser(username);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Validate current password if user has one configured
    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required." }, { status: 400 });
      }
      const hashedCurrent = AuthManager.hashPassword(currentPassword);
      if (hashedCurrent !== user.passwordHash) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    }

    const passwordHash = AuthManager.hashPassword(password);
    const success = await AuthManager.updatePasswordHash(username, passwordHash);

    if (success) {
      return NextResponse.json({ success: true, message: "Password updated successfully on server." });
    } else {
      return NextResponse.json({ error: "Failed to update password on server database." }, { status: 500 });
    }
  } catch (e: any) {
    console.error("Password update error:", e);
    return NextResponse.json({ error: e.message || "Failed to update password." }, { status: 500 });
  }
}
