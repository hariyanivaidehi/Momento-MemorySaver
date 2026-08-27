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

    const challenge = AuthManager.generateChallenge(username);

    // Extract dynamic domain from request headers
    const host = request.headers.get("host") || "localhost";
    const rpId = host.split(":")[0];
    const rp = { name: "Memento Core Archive", id: rpId };
    const user = {
      id: Buffer.from(username).toString("base64url"),
      name: username,
      displayName: username.toUpperCase()
    };

    const options = {
      challenge,
      rp,
      user,
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },   // ES256
        { type: "public-key", alg: -257 }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform" as const, // fingerprint scanner, face ID
        userVerification: "required" as const
      },
      timeout: 60000
    };

    return NextResponse.json(options);
  } catch (e: any) {
    console.error("Error creating WebAuthn registration options:", e);
    return NextResponse.json({ error: e.message || "Failed to generate options." }, { status: 500 });
  }
}
