import { PrismaClient } from '@prisma/client'

// Declare global type for Prisma client to prevent multiple instances
declare global {
    var prisma: PrismaClient | undefined
}

// Create singleton Prisma client instance
// This prevents exhausting database connections in development
// when Next.js hot-reloads the application
export const prisma = globalThis.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
})

// Store client in global scope for development hot-reloading
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma
}

export default prisma
