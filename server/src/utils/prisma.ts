import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;
let isPrismaAvailable = false;

if (process.env.DATABASE_URL) {
  try {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  } catch (err) {
    console.warn('[Prisma] Initialization notice:', err);
  }
}

export const getPrisma = (): PrismaClient | null => (isPrismaAvailable ? prismaInstance : null);

// Helper to check DB connectivity
export async function checkDatabaseConnection(): Promise<boolean> {
  if (!prismaInstance || !process.env.DATABASE_URL) {
    isPrismaAvailable = false;
    return false;
  }
  try {
    await prismaInstance.$queryRaw`SELECT 1`;
    isPrismaAvailable = true;
    return true;
  } catch (err) {
    isPrismaAvailable = false;
    return false;
  }
}

export { isPrismaAvailable };
export default prismaInstance;
