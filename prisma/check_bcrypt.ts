import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Bcrypt Verification ---')
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'admin@certifoolproof.com' }
        })

        if (!user) {
            console.log('Admin user not found in DB')
            return
        }

        console.log(`Checking password 'admin123' against hash: ${user.password}`)
        const isValid = await bcrypt.compare('admin123', user.password)
        console.log(`Manual check result: ${isValid}`)

        // Re-hash to see what it looks like
        const newHash = await bcrypt.hash('admin123', 12)
        console.log(`Newly generated hash: ${newHash}`)
        const isValidNew = await bcrypt.compare('admin123', newHash)
        console.log(`Comparison with new hash: ${isValidNew}`)

    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
