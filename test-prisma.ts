// test-prisma.ts - UPDATED WITH DOTENV
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL
console.log('Connection string:', connectionString ? 'Set' : 'Not set')

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function test() {
  try {
    console.log('Testing Prisma 7 with adapter...')
    
    const rawResult = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Raw query result:', rawResult)
    
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    console.log('✅ Tables:', tables)
    
    const rooms = await prisma.room.findMany()
    console.log('✅ Rooms found:', rooms.length)
    
    if (rooms.length === 0) {
      const newRoom = await prisma.room.create({
        data: {
          slug: 'test-' + Date.now(),
          name: 'Test Room',
          description: 'Created via Prisma 7 with adapter'
        }
      })
      console.log('✅ Created room:', newRoom)
    }
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message)
    } else {
      console.error('❌ Unknown error occurred:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

test()