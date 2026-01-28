import { PrismaClient, UserRole } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // default admin user
    const adminPassword = await bcrypt.hash('admin123', 12)

    const admin = await prisma.user.upsert({
        where: { email: 'admin@certifoolproof.com' },
        update: {},
        create: {
            email: 'admin@certifoolproof.com',
            name: 'System Administrator',
            password: adminPassword,
            role: UserRole.ADMIN,
            department: 'Administration',
        },
    })

    console.log(`Created admin user: ${admin.email}`)

    // sample faculty user
    const facultyPassword = await bcrypt.hash('faculty123', 12)

    const faculty = await prisma.user.upsert({
        where: { email: 'faculty@certifoolproof.com' },
        update: {},
        create: {
            email: 'faculty@certifoolproof.com',
            name: 'Dr. Jane Smith',
            password: facultyPassword,
            role: UserRole.FACULTY,
            department: 'Computer Science',
        },
    })

    console.log(`Created faculty user: ${faculty.email}`)

    // sample club user
    const clubPassword = await bcrypt.hash('club123', 12)

    const club = await prisma.user.upsert({
        where: { email: 'club@certifoolproof.com' },
        update: {},
        create: {
            email: 'club@certifoolproof.com',
            name: 'Tech Club',
            password: clubPassword,
            role: UserRole.CLUB,
            department: 'Student Activities',
        },
    })

    console.log(`Created club user: ${club.email}`)

    console.log('Database seeding completed!')
    console.log('')
    console.log('Test Credentials:')
    console.log('   Admin:   admin@certifoolproof.com / admin123')
    console.log('   Faculty: faculty@certifoolproof.com / faculty123')
    console.log('   Club:    club@certifoolproof.com / club123')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('Seed error:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
