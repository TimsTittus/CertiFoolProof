-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "verification_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"certificateId" text NOT NULL,
	"verifiedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"success" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"certificateId" text NOT NULL,
	"recipientName" text NOT NULL,
	"recipientEmail" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"issuedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expiresAt" timestamp(3),
	"dataHash" text NOT NULL,
	"qrCodeData" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"issuerId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"verificationCount" integer DEFAULT 0 NOT NULL,
	"lastVerifiedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'FACULTY' NOT NULL,
	"department" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"emailVerified" boolean DEFAULT false,
	"image" text,
	"wallet" text DEFAULT '0'
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_logs_certificateId_idx" ON "verification_logs" USING btree ("certificateId" text_ops);--> statement-breakpoint
CREATE INDEX "verification_logs_verifiedAt_idx" ON "verification_logs" USING btree ("verifiedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "certificates_certificateId_idx" ON "certificates" USING btree ("certificateId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_certificateId_key" ON "certificates" USING btree ("certificateId" text_ops);--> statement-breakpoint
CREATE INDEX "certificates_issuedAt_idx" ON "certificates" USING btree ("issuedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "certificates_issuerId_idx" ON "certificates" USING btree ("issuerId" text_ops);--> statement-breakpoint
CREATE INDEX "certificates_recipientEmail_idx" ON "certificates" USING btree ("recipientEmail" text_ops);--> statement-breakpoint
CREATE INDEX "certificates_status_idx" ON "certificates" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role" text_ops);
*/