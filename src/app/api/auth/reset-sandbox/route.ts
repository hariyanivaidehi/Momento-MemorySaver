import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Memory from "@/models/Memory";
import Letter from "@/models/Letter";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ success: false, error: "Username is required." }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();

    // 1. Delete all memories for this user from MongoDB
    const memoriesResult = await Memory.deleteMany({ username: cleanUsername });

    // 2. Delete all letters for this user from MongoDB
    const lettersResult = await Letter.deleteMany({ username: cleanUsername });

    // 3. Clear user WebAuthn biometrics and reset profile details
    const userResult = await User.updateOne(
      { username: cleanUsername },
      { 
        $set: { 
          credentials: [], 
          profilePicture: "", 
          displayName: cleanUsername 
        } 
      }
    );

    return NextResponse.json({
      success: true,
      message: "Sandbox successfully reset in MongoDB database.",
      memoriesDeleted: memoriesResult.deletedCount,
      lettersDeleted: lettersResult.deletedCount,
      userUpdated: userResult.modifiedCount > 0
    });
  } catch (e: any) {
    console.error("Error resetting sandbox on MongoDB:", e);
    return NextResponse.json({ success: false, error: e.message || "Failed to reset sandbox on server." }, { status: 500 });
  }
}
