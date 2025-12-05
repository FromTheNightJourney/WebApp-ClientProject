import { PrismaClient } from '@prisma/client'

// Fix: explicitly pass options to satisfy the constructor requirement
const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
})

async function main() {
  console.log('🌱 Start seeding...')

  // 1. Cleanup existing data (use transaction for safety)
  // We delete in reverse order of dependency to avoid foreign key errors
  await prisma.$transaction([
    prisma.hotspot.deleteMany(),
    prisma.puzzle.deleteMany(),
    prisma.room.deleteMany(),
  ])

  // 2. Create the Room
  const room = await prisma.room.create({
    data: {
      slug: 'detective-office',
      name: "The Detective's Office",
      description: 'A messy office filled with clues from a cold case. Find the safe code to escape.',
      theme: 'Noir',
      imageUrl: '/images/rooms/detective-office.jpg',
      globalMinutes: 45,
    },
  })

  console.log(`✅ Created room: ${room.name} (${room.id})`)

  // 3. Create Puzzles linked to the Room
  const puzzleSafe = await prisma.puzzle.create({
    data: {
      roomId: room.id,
      type: 'short',
      question: 'What is the year on the calendar?',
      expectedAnswer: '1985',
      clue: 'Look closely at the wall near the window.',
      imageUrl: '/images/puzzles/calendar.jpg',
    },
  })

  const puzzleRiddle = await prisma.puzzle.create({
    data: {
      roomId: room.id,
      type: 'mcq',
      question: 'Who is the prime suspect?',
      options: ['The Butler', 'The Gardener', 'The Chef', 'The Driver'],
      correctIndex: 0,
      clue: 'He was the only one with a key.',
    },
  })

  console.log('✅ Created puzzles')

  // 4. Create Hotspots
  await prisma.hotspot.create({
    data: {
      roomId: room.id,
      puzzleId: puzzleSafe.id,
      x: 10.5,
      y: 20.0,
      width: 15,
      height: 10,
    },
  })

  await prisma.hotspot.create({
    data: {
      roomId: room.id,
      puzzleId: null, // Visual flair only
      x: 80,
      y: 50,
      width: 5,
      height: 5,
    },
  })

  console.log('✅ Created hotspots')
  console.log('🚀 Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })