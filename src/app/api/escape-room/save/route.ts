import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SavePayload = {
  roomId?: string;
  name: string;
  settings: {
    globalMinutes: number;
    bgImageDataUrl?: string | null;
  };
  puzzles: Array<{
    id: string; 
    type: "short" | "mcq";
    question: string;
    options: string[];
    correctIndex: number | null;
    expectedAnswer: string;
    imageDataUrl?: string;
  }>;
  hotspots: Array<{
    id: string;
    puzzleId: string | null;
    xPct: number;
    yPct: number;
  }>;
};

export async function POST(req: Request) {
  try {
    const body: SavePayload = await req.json();
    const { roomId, name, settings, puzzles, hotspots } = body;

    const result = await prisma.$transaction(async (tx) => {
      let room;
      let targetRoomId = roomId;

      // create room
      if (targetRoomId) {

        const existing = await tx.room.findUnique({ where: { id: targetRoomId } });
        
        if (!existing) {
          targetRoomId = undefined;
        } else {
          room = await tx.room.update({
            where: { id: targetRoomId },
            data: {
              name: name,
              globalMinutes: settings.globalMinutes,
              imageUrl: settings.bgImageDataUrl ?? null,
            },
          });

          await tx.hotspot.deleteMany({ where: { roomId: targetRoomId } });
          await tx.puzzle.deleteMany({ where: { roomId: targetRoomId } });
        }
      }

      if (!targetRoomId) {

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);
        
        room = await tx.room.create({
          data: {
            slug: slug,
            name: name,
            globalMinutes: settings.globalMinutes,
            imageUrl: settings.bgImageDataUrl ?? null,
          },
        });
        targetRoomId = room.id;
      }

      // 2. puzzle id/map maker
      const idMap = new Map<string, string>(); 

      for (const p of puzzles) {
        const createdPuzzle = await tx.puzzle.create({
          data: {
            roomId: targetRoomId!,
            type: p.type,
            question: p.question,
            options: p.options, 
            correctIndex: p.correctIndex,
            expectedAnswer: p.expectedAnswer,
            imageUrl: p.imageDataUrl ?? null,
            isSolved: false,
          },
        });
        idMap.set(p.id, createdPuzzle.id);
      }

      // hotspot maker
      for (const h of hotspots) {
        const linkedPuzzleDbId = h.puzzleId ? idMap.get(h.puzzleId) : null;

        await tx.hotspot.create({
          data: {
            roomId: targetRoomId!,
            x: h.xPct,
            y: h.yPct,
            width: 6,  
            height: 6,
            puzzleId: linkedPuzzleDbId || null, 
          },
        });
      }

      return room;
    });

    return NextResponse.json({ 
      success: true, 
      roomId: result?.id,
      slug: result?.slug 
    });

  } catch (error) {
    console.error("Save API Error:", error);
    return NextResponse.json(
      { error: "Failed to save room", details: String(error) }, 
      { status: 500 }
    );
  }
}