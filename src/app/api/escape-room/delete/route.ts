import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Room ID required" }, { status: 400 });
  }

  try {
    // Delete the room.
    // Thanks to @relation(onDelete: Cascade) in your schema,
    // this automatically deletes all related Puzzles and Hotspots too.
    await prisma.room.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}