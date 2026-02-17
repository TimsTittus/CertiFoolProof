
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
    const connectionString = process.env.DATABASE_URL;
    const url = new URL(connectionString);
    url.search = "";
    const cleanConnectionString = url.toString();

    const sql = postgres(cleanConnectionString, { prepare: false });

    try {
        console.log("Seeding users...");

        const adminPassword = await bcrypt.hash('admin@sjcet1314', 12);
        const facultyPassword = await bcrypt.hash('faculty@sjcet1314', 12);
        const clubPassword = await bcrypt.hash('club@sjcet1314', 12);

        const users = [
            {
                id: 'admin-id-123',
                email: 'admin@certifoolproof.com',
                name: 'System Administrator',
                password: adminPassword,
                role: 'ADMIN',
                department: 'Administration',
                emailVerified: true,
                phone: '1234567890',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'faculty-id-456',
                email: 'faculty@certifoolproof.com',
                name: 'Faculty Member',
                password: facultyPassword,
                role: 'FACULTY',
                department: 'Computer Science',
                emailVerified: true,
                phone: '1234567891',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'club-id-789',
                email: 'club@certifoolproof.com',
                name: 'Club Representative',
                password: clubPassword,
                role: 'CLUB',
                department: 'Student Activities',
                emailVerified: true,
                phone: '1234567892',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        for (const user of users) {
            // Upsert manually
            const existing = await sql`SELECT id FROM "users" WHERE email = ${user.email}`;
            if (existing.length > 0) {
                await sql`
                    UPDATE "users" SET 
                        password = ${user.password},
                        role = ${user.role},
                        "emailVerified" = ${user.emailVerified},
                        "updatedAt" = ${user.updatedAt}
                    WHERE email = ${user.email}
                 `;
            } else {
                await sql`
                    INSERT INTO "users" (id, email, name, password, role, department, "emailVerified", phone, "createdAt", "updatedAt")
                    VALUES (${user.id}, ${user.email}, ${user.name}, ${user.password}, ${user.role}, ${user.department}, ${user.emailVerified}, ${user.phone}, ${user.createdAt}, ${user.updatedAt})
                 `;
            }
        }

        console.log("Seeding successful!");
    } catch (err) {
        console.error("Seeding failed!");
        console.error(err);
    } finally {
        await sql.end();
    }
}

seed();
