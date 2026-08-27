import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Letter from "@/models/Letter";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") || request.headers.get("x-user-username");
    const clientPasscode = searchParams.get("passcode") || "";
    
    if (!username) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter or header: username" },
        { status: 400 }
      );
    }

    const letters = await Letter.find({ username }).sort({ timestamp: -1 });
    const now = new Date();

    const sanitizedLetters = letters.map((letter) => {
      const isTimeLocked = new Date(letter.unlockDate) > now;
      const requiresPasscode = !!letter.passcode;
      const passcodeMatched = letter.passcode === clientPasscode;

      let content = letter.content;
      let status: "locked" | "needs-passcode" | "unlocked" = "unlocked";

      if (isTimeLocked) {
        content = `[ENCRYPTED LEGACY TELEMETRY - SECURE TEMPORAL VAULT LOCK ACTIVE UNTIL ${new Date(letter.unlockDate).toISOString()}]`;
        status = "locked";
      } else if (requiresPasscode && !passcodeMatched) {
        content = "[DECRYPTED CORE SECURE - ENTER TEMPORAL KEYPASSPHRASE TO UNLOCK CONTENT]";
        status = "needs-passcode";
      }

      return {
        _id: letter._id,
        title: letter.title,
        senderName: letter.senderName,
        recipientName: letter.recipientName,
        recipientEmail: letter.recipientEmail,
        unlockDate: letter.unlockDate,
        timestamp: letter.timestamp,
        content,
        status,
        requiresPasscode
      };
    });

    return NextResponse.json({ success: true, data: sanitizedLetters });
  } catch (error: any) {
    console.error("Database connection failed inside GET vault API:", error);
    return NextResponse.json(
      { success: false, error: "Database offline", details: error.message },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    const { title, content, senderName, recipientName, recipientEmail, unlockDate, passcode, username } = body;
    
    if (!title || !content || !recipientName || !recipientEmail || !unlockDate || !username) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for Temporal Letter: username, title, content, recipientName, recipientEmail, or unlockDate" },
        { status: 400 }
      );
    }

    const newLetter = new Letter({
      username,
      title,
      content,
      senderName: senderName || "Consciousness Core",
      recipientName,
      recipientEmail,
      unlockDate: new Date(unlockDate),
      passcode: passcode || ""
    });

    await newLetter.save();
    return NextResponse.json({ success: true, data: newLetter }, { status: 201 });
  } catch (error: any) {
    console.error("Database connection failed inside POST vault API:", error);
    return NextResponse.json(
      { success: false, error: "Database offline", details: error.message },
      { status: 503 }
    );
  }
}
