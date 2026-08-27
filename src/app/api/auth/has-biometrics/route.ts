import { NextResponse } from "next/server";
import { AuthManager } from "@/lib/auth-manager";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usernameOrEmail = searchParams.get("usernameOrEmail");

    if (!usernameOrEmail) {
      return NextResponse.json({ success: false, error: "Username/Email is required." }, { status: 400 });
    }

    const user = await AuthManager.findUser(usernameOrEmail);
    if (!user) {
      return NextResponse.json({ success: true, exists: false, hasBiometrics: false });
    }

    const hasBiometrics = Array.isArray(user.credentials) && user.credentials.length > 0;
    return NextResponse.json({
      success: true,
      exists: true,
      hasBiometrics
    });
  } catch (e: any) {
    console.error("Error checking biometrics:", e);
    return NextResponse.json({ success: false, error: e.message || "Failed to check biometrics." }, { status: 500 });
  }
}
