import { NextResponse } from "next/server";
import { ResourceManager } from "@/lib/resource-manager";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "boost") {
      const result = await ResourceManager.performBoost();
      return NextResponse.json({
        success: true,
        ramFreedMb: result.ramFreedMb,
        appsTerminated: result.appsTerminated
      });
    } else if (action === "tempClean") {
      const result = await ResourceManager.cleanTempFiles();
      return NextResponse.json({
        success: true,
        diskFreedMb: result.diskFreedMb,
        details: result.details
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Must be 'boost' or 'tempClean'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error executing clean up:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute cleanup." },
      { status: 500 }
    );
  }
}
