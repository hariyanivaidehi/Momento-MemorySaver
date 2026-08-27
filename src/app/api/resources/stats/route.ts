import { NextResponse } from "next/server";
import { ResourceManager } from "@/lib/resource-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await ResourceManager.getSystemStats();
    const config = ResourceManager.getConfig();
    const logs = ResourceManager.getLogs();

    return NextResponse.json({
      success: true,
      stats,
      config,
      logs
    });
  } catch (error: any) {
    console.error("Error in stats API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load system stats." },
      { status: 500 }
    );
  }
}
