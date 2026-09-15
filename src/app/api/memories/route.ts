import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Memory from "@/models/Memory";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") || request.headers.get("x-user-username");
    
    if (!username) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter or header: username" },
        { status: 400 }
      );
    }
    
    const memories = await Memory.find({ username }).sort({ timestamp: -1 });
    return NextResponse.json({ success: true, data: memories });
  } catch (error: any) {
    console.error("Database connection failed inside GET memories API:", error);
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
    
    // Validate inputs
    const { title, content, emotion, tags, x, y, z, username, wing, pointer, mainTopic, subtopic, attachments, voiceNote } = body;
    if (!title || !content || !username) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, content, and username" },
        { status: 400 }
      );
    }

    const newMemory = new Memory({
      username,
      title,
      content,
      emotion: emotion || "serene",
      tags: tags || [],
      wing: wing || "PERSONAL",
      mainTopic: mainTopic || "General",
      subtopic: subtopic || "",
      attachments: attachments || [],
      voiceNote: voiceNote || "",
      pointer,
      x: x !== undefined ? x : Math.random() * 800 + 100,
      y: y !== undefined ? y : Math.random() * 500 + 100,
      z: z !== undefined ? z : Math.random() * 50 - 25,
      timestamp: new Date()
    });

    await newMemory.save();
    return NextResponse.json({ success: true, data: newMemory }, { status: 201 });
  } catch (error: any) {
    console.error("Database connection failed inside POST memories API:", error);
    return NextResponse.json(
      { success: false, error: "Database offline", details: error.message },
      { status: 503 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing query parameter: id" },
        { status: 400 }
      );
    }

    const deleted = await Memory.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Memory node not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deleted });
  } catch (error: any) {
    console.error("Database connection failed inside DELETE memories API:", error);
    return NextResponse.json(
      { success: false, error: "Database offline", details: error.message },
      { status: 503 }
    );
  }
}
