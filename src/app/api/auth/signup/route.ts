import { NextResponse } from "next/server";
import { AuthManager } from "@/lib/auth-manager";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password, mobileNumber, mobileVerified } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    if (!email && !mobileNumber) {
      return NextResponse.json({ error: "Email or mobile number is required." }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters long." }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters long." }, { status: 400 });
    }

    const existingUser = await AuthManager.findUser(username);
    if (existingUser) {
      return NextResponse.json({ error: "Username is already taken. Choose another name." }, { status: 400 });
    }

    if (email) {
      const emailMatch = await AuthManager.findUser(email);
      if (emailMatch) {
        return NextResponse.json({ error: "Email is already registered. Choose another one." }, { status: 400 });
      }
    }

    if (mobileNumber) {
      const mobileMatch = await AuthManager.findUser(mobileNumber);
      if (mobileMatch) {
        return NextResponse.json({ error: "Mobile number is already registered." }, { status: 400 });
      }
    }

    const passwordHash = AuthManager.hashPassword(password);
    await AuthManager.createUser(
      username,
      email || "",
      passwordHash,
      undefined,
      undefined,
      undefined,
      mobileNumber,
      mobileVerified
    );

    return NextResponse.json({ success: true, message: "User account created successfully." });
  } catch (e: any) {
    console.error("Signup error:", e);
    return NextResponse.json({ error: e.message || "Failed to register user." }, { status: 500 });
  }
}
