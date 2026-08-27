import { NextResponse } from "next/server";
import { AuthManager } from "@/lib/auth-manager";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, credential } = body;

    const storedChallenge = AuthManager.consumeChallenge(username);
    if (!storedChallenge || !credential) {
      return NextResponse.json(
        { success: false, error: "Registration session expired or challenge invalid." },
        { status: 400 }
      );
    }

    const { id, publicKey } = credential;
    if (!id || !publicKey) {
      return NextResponse.json(
        { success: false, error: "Invalid credential data." },
        { status: 400 }
      );
    }

    // Persist registered credential
    await AuthManager.addCredential(username, id, publicKey);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Error verifying WebAuthn registration:", e);
    return NextResponse.json({ success: false, error: e.message || "Internal server error." }, { status: 500 });
  }
}
