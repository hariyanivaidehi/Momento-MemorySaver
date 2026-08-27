import { NextResponse } from "next/server";
import { ResourceManager, ResourceConfig } from "@/lib/resource-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = ResourceManager.getConfig();
    return NextResponse.json({
      success: true,
      config
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const currentConfig = ResourceManager.getConfig();

    const newConfig: ResourceConfig = {
      ...currentConfig,
      ...body
    };

    ResourceManager.saveConfig(newConfig);

    return NextResponse.json({
      success: true,
      config: newConfig
    });
  } catch (error: any) {
    console.error("Error saving resource configuration:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save configuration." },
      { status: 500 }
    );
  }
}
