import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Database Content Verification ---')
    try {
        const users = await prisma.user.findMany()
        console.log(`Total users: ${users.length}`)
        users.forEach(u => {
            console.log(`Email: ${u.email}`)
            console.log(`Role: ${u.role}`)
            console.log(`Password Hash Length: ${u.password.length}`)
            console.log('---')
        })
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
