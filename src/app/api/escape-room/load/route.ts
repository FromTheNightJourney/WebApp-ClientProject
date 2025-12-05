import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Room ID required" }, { status: 400 });
  }

  try {
    const room = await prisma.room.findUnique({
      where: { id: id },
      include: {
        puzzles: true,
        hotspots: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // map room settings
    const settings = {
      globalMinutes: room.globalMinutes,
      bgImageDataUrl: room.imageUrl, // Map DB 'imageUrl' -> Frontend 'bgImageDataUrl'
      roomId: room.id,
    };

    // map puzzles
    const puzzles = room.puzzles.map((p) => ({
      id: p.id, // Keep the DB ID so we can update it later
      type: p.type as "short" | "mcq",
      question: p.question,
      options: p.options,
      correctIndex: p.correctIndex,
      expectedAnswer: p.expectedAnswer || "",
      imageDataUrl: p.imageUrl || undefined,
    }));

    // hotspot generation, making new arrays
    const hotspots = room.hotspots.map((h) => ({
      id: h.id,
      puzzleId: h.puzzleId,
      xPct: h.x,
      yPct: h.y,
    }));

    return NextResponse.json({
      settings,
      puzzles,
      hotspots,
    });

  } catch (error) {
    console.error("Load Error:", error);
    return NextResponse.json({ error: "Failed to load room" }, { status: 500 });
  }
}