import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, integer } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
    role: text("role").default("FACULTY").notNull(),
    password: text("password"),
    phone: text("phone").notNull(),
    wallet: text("wallet").default("0"),
    department: text("department"),
});

export const session = pgTable(
    "session",
    {
        id: text("id").primaryKey(),
        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
    },
    (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
    "account",
    {
        id: text("id").primaryKey(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
    "verification",
    {
        id: text("id").primaryKey(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
    certificates: many(certificate),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));

export const certificate = pgTable(
    "certificates",
    {
        id: text("id").primaryKey(),
        certificateId: text("certificate_id").notNull().unique(),
        recipientName: text("recipient_name").notNull(),
        recipientEmail: text("recipient_email").notNull(),
        title: text("title").notNull(),
        description: text("description"),
        issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
        expiresAt: timestamp("expires_at", { withTimezone: true }),
        dataHash: text("data_hash").notNull(),
        qrCodeData: text("qr_code_data").notNull(),
        status: text("status").default("ACTIVE").notNull(),
        issuerId: text("issuer_id")
            .notNull()
            .references(() => user.id, { onDelete: "restrict" }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
        verificationCount: integer("verification_count").default(0).notNull(),
        lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    },
    (table) => [
        index("certificate_certificateId_idx").on(table.certificateId),
        index("certificate_recipientEmail_idx").on(table.recipientEmail),
        index("certificate_issuerId_idx").on(table.issuerId),
        index("certificate_status_idx").on(table.status),
        index("certificate_issuedAt_idx").on(table.issuedAt),
    ]
);

export const certificateRelations = relations(certificate, ({ one }) => ({
    issuer: one(user, {
        fields: [certificate.issuerId],
        references: [user.id],
    }),
}));

export const verificationLog = pgTable(
    "verification_logs",
    {
        id: text("id").primaryKey(),
        certificateId: text("certificate_id").notNull(),
        verifiedAt: timestamp("verified_at", { withTimezone: true }).defaultNow().notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        success: boolean("success").default(true).notNull(),
    },
    (table) => [
        index("verification_log_certificateId_idx").on(table.certificateId),
        index("verification_log_verifiedAt_idx").on(table.verifiedAt),
    ]
);
