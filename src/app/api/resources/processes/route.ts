import { NextResponse } from "next/server";
import { ResourceManager } from "@/lib/resource-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const processes = await ResourceManager.getProcesses();
    return NextResponse.json({
      success: true,
      processes
    });
  } catch (error: any) {
    console.error("Error fetching process list:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load processes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, pid, value } = body;

    if (!pid) {
      return NextResponse.json(
        { success: false, error: "PID is required." },
        { status: 400 }
      );
    }

    if (action === "kill") {
      const result = await ResourceManager.terminateProcess(pid);
      if (result.success) {
        return NextResponse.json({ success: true, message: `Terminated process ${pid}` });
      } else {
        return NextResponse.json({ success: false, error: result.error || "Failed to terminate process." }, { status: 400 });
      }
    } else if (action === "hibernate") {
      const shouldHibernate = value !== false; // defaults to true
      const result = await ResourceManager.hibernateProcess(pid, shouldHibernate);
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: shouldHibernate ? `Hibernated process ${pid}` : `Resumed process ${pid}`
        });
      } else {
        return NextResponse.json({ success: false, error: result.error || "Failed to hibernate process." }, { status: 400 });
      }
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Must be 'kill' or 'hibernate'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error updating process state:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
