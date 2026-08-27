import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    return NextResponse.json({ success: true, connected: true });
  } catch (error) {
    return NextResponse.json({ success: true, connected: false });
  }
}
