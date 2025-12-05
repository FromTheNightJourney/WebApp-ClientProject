/*
  Warnings:

  - You are about to drop the `Hotspot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Puzzle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Room` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Hotspot" DROP CONSTRAINT "Hotspot_puzzleId_fkey";

-- DropForeignKey
ALTER TABLE "Hotspot" DROP CONSTRAINT "Hotspot_roomId_fkey";

-- DropForeignKey
ALTER TABLE "Puzzle" DROP CONSTRAINT "Puzzle_roomId_fkey";

-- DropTable
DROP TABLE "Hotspot";

-- DropTable
DROP TABLE "Puzzle";

-- DropTable
DROP TABLE "Room";

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "theme" TEXT,
    "imageUrl" TEXT,
    "globalMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzles" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER,
    "expectedAnswer" TEXT,
    "imageUrl" TEXT,
    "clue" TEXT,
    "isSolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotspots" (
    "id" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "puzzleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "hotspots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_slug_key" ON "rooms"("slug");

-- CreateIndex
CREATE INDEX "puzzles_roomId_idx" ON "puzzles"("roomId");

-- CreateIndex
CREATE INDEX "hotspots_roomId_idx" ON "hotspots"("roomId");

-- CreateIndex
CREATE INDEX "hotspots_puzzleId_idx" ON "hotspots"("puzzleId");

-- AddForeignKey
ALTER TABLE "puzzles" ADD CONSTRAINT "puzzles_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotspots" ADD CONSTRAINT "hotspots_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
