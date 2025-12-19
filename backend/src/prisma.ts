import { PrismaClient } from '@prisma/client';

// Use explicit connection string if available, otherwise fallback to env
const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
} as any);

export default prisma;
