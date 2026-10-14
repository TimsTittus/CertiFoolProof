import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
    },
    session: {
        expiresIn: 3600,
        strategy: "jwt",
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: "FACULTY",
            },
            phone: {
                type: "string",
                required: true,
            },
            wallet: {
                type: "string",
                required: false,
                defaultValue: "0",
            },
            department: {
                type: "string",
                required: false,
            }
        }
    },
    advanced: {
        // generateId: false, // If this is causing issues, better-auth handles UUIDs by default
    }
});
