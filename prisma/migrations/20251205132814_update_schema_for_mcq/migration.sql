/*
  Warnings:

  - You are about to drop the column `actionType` on the `Hotspot` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Hotspot` table. All the data in the column will be lost.
  - You are about to drop the column `payload` on the `Hotspot` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Hotspot` table. All the data in the column will be lost.
  - You are about to drop the column `answer` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `clue` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `isSolved` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `theme` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Hotspot" DROP COLUMN "actionType",
DROP COLUMN "height",
DROP COLUMN "payload",
DROP COLUMN "width",
ADD COLUMN     "puzzleId" TEXT;

-- AlterTable
ALTER TABLE "Puzzle" DROP COLUMN "answer",
DROP COLUMN "clue",
DROP COLUMN "isSolved",
ADD COLUMN     "correctIndex" INTEGER,
ADD COLUMN     "expectedAnswer" TEXT,
ADD COLUMN     "imageDataUrl" TEXT,
ADD COLUMN     "options" TEXT[],
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'short';

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "theme";

-- AddForeignKey
ALTER TABLE "Hotspot" ADD CONSTRAINT "Hotspot_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
