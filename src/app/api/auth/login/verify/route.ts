import { NextResponse } from "next/server";
import { AuthManager } from "@/lib/auth-manager";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, assertion } = body;

    const storedChallenge = AuthManager.consumeChallenge(username);
    if (!storedChallenge || !assertion) {
      return NextResponse.json(
        { success: false, error: "Login session expired or challenge invalid." },
        { status: 400 }
      );
    }

    const { id, response } = assertion;
    if (!id || !response) {
      return NextResponse.json({ success: false, error: "Missing assertion response." }, { status: 400 });
    }

    const cred = await AuthManager.getCredential(id);
    if (!cred) {
      return NextResponse.json({ success: false, error: "Credential ID not recognized." }, { status: 400 });
    }

    const { clientDataJSON, authenticatorData, signature } = response;

    // Validate challenge in clientDataJSON
    const clientData = JSON.parse(Buffer.from(clientDataJSON, "base64url").toString("utf-8"));
    if (clientData.challenge !== storedChallenge) {
      return NextResponse.json({ success: false, error: "Cryptographic challenge mismatch." }, { status: 400 });
    }

    // Verify cryptographic signature against the stored public key
    const isValid = AuthManager.verifyAssertionSignature(
      cred.cred.publicKey,
      authenticatorData,
      clientDataJSON,
      signature
    );

    if (isValid) {
      const dbUser = await AuthManager.findUser(cred.username);
      return NextResponse.json({
        success: true,
        user: {
          username: cred.username,
          email: dbUser ? dbUser.email : "",
          displayName: dbUser ? (dbUser.displayName || dbUser.username) : cred.username,
          profilePicture: dbUser ? (dbUser.profilePicture || "") : "",
          googleId: dbUser ? (dbUser.googleId || "") : "",
          hasPassword: dbUser ? !!dbUser.passwordHash : false,
          webLockPasscodeHash: dbUser ? dbUser.webLockPasscodeHash : ""
        }
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Biometric signature validation failed." },
        { status: 401 }
      );
    }
  } catch (e: any) {
    console.error("Error verifying WebAuthn assertion signature:", e);
    return NextResponse.json({ success: false, error: e.message || "Verification failure." }, { status: 500 });
  }
}
