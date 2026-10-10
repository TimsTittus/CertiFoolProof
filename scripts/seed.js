const postgres = require('postgres');
const crypto = require('crypto');
const { hashPassword } = require('better-auth/crypto');
require('dotenv').config();

async function seed() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("Seeding failed: DATABASE_URL environment variable is not defined.");
        process.exit(1);
    }

    let cleanConnectionString = connectionString;
    try {
        const url = new URL(connectionString);
        url.search = "";
        cleanConnectionString = url.toString();
    } catch {
        // Keep raw connectionString if parsing fails
    }

    const sql = postgres(cleanConnectionString, { prepare: false });

    try {
        console.log("Seeding users and Better-Auth accounts...");

        const adminPassword = await hashPassword('admin@sjcet1314');
        const facultyPassword = await hashPassword('faculty@sjcet1314');
        const clubPassword = await hashPassword('club@sjcet1314');

        const now = new Date();

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
                createdAt: now,
                updatedAt: now
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
                createdAt: now,
                updatedAt: now
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
                createdAt: now,
                updatedAt: now
            }
        ];

        for (const user of users) {
            const existing = await sql`SELECT id FROM "user" WHERE email = ${user.email}`;
            let userId = user.id;

            if (existing.length > 0) {
                userId = existing[0].id;
                await sql`
                    UPDATE "user" SET 
                        name = ${user.name},
                        password = ${user.password},
                        role = ${user.role},
                        department = ${user.department},
                        phone = ${user.phone},
                        email_verified = ${user.emailVerified},
                        updated_at = ${user.updatedAt}
                    WHERE id = ${userId}
                `;
                console.log(`Updated user: ${user.email} (${user.role})`);
            } else {
                await sql`
                    INSERT INTO "user" (
                        id, email, name, password, role, department, email_verified, phone, wallet, created_at, updated_at
                    )
                    VALUES (
                        ${user.id},
                        ${user.email},
                        ${user.name},
                        ${user.password},
                        ${user.role},
                        ${user.department},
                        ${user.emailVerified},
                        ${user.phone},
                        '0',
                        ${user.createdAt},
                        ${user.updatedAt}
                    )
                `;
                console.log(`Inserted user: ${user.email} (${user.role})`);
            }

            // Sync Better-Auth credential account
            const existingAccount = await sql`
                SELECT id FROM "account"
                WHERE user_id = ${userId} AND provider_id = 'credential'
            `;

            if (existingAccount.length > 0) {
                await sql`
                    UPDATE "account" SET
                        password = ${user.password},
                        updated_at = ${user.updatedAt}
                    WHERE id = ${existingAccount[0].id}
                `;
                console.log(`Updated credential account for: ${user.email}`);
            } else {
                await sql`
                    INSERT INTO "account" (
                        id, account_id, provider_id, user_id, password, created_at, updated_at
                    )
                    VALUES (
                        ${crypto.randomUUID()},
                        ${userId},
                        'credential',
                        ${userId},
                        ${user.password},
                        ${user.createdAt},
                        ${user.updatedAt}
                    )
                `;
                console.log(`Inserted credential account for: ${user.email}`);
            }
        }

        console.log("Seeding successful!");
    } catch (err) {
        console.error("Seeding failed!");
        console.error(err);
        process.exitCode = 1;
    } finally {
        await sql.end();
    }
}

seed();