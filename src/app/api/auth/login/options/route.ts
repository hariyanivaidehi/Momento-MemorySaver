import { NextResponse } from "next/server";
import { AuthManager } from "@/lib/auth-manager";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }

    const user = await AuthManager.findUser(username);
    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const creds = user.credentials || [];
    if (creds.length === 0) {
      return NextResponse.json({ error: "No biometric credentials linked to this account." }, { status: 404 });
    }

    const challenge = AuthManager.generateChallenge(username);

    const host = request.headers.get("host") || "localhost";
    const rpId = host.split(":")[0];

    const options = {
      challenge,
      rpId,
      allowCredentials: creds.map(c => ({
        type: "public-key" as const,
        id: c.credentialId
      })),
      userVerification: "required" as const,
      timeout: 60000
    };

    return NextResponse.json(options);
  } catch (e: any) {
    console.error("Error creating WebAuthn login options:", e);
    return NextResponse.json({ error: e.message || "Failed to generate login options." }, { status: 500 });
  }
}
