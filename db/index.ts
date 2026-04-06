import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const dbUrl = new URL(connectionString);

export const client = postgres({
    host: dbUrl.hostname,
    port: 6543,
    database: dbUrl.pathname.slice(1),
    username: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    ssl: "require",
    prepare: false,
    // Explicitly NO options or schema parameter
});

export const db = drizzle(client, { schema });
