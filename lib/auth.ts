import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
    },
    session: {
        expiresIn: 3600,
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
