CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'FACULTY' NOT NULL,
	"password" text,
	"phone" text NOT NULL,
	"wallet" text DEFAULT '0',
	"department" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "session_token_key";--> statement-breakpoint
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_issuerId_fkey";
--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "session_userId_fkey";
--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "account_userId_fkey";
--> statement-breakpoint
DROP INDEX "verification_logs_certificateId_idx";--> statement-breakpoint
DROP INDEX "verification_logs_verifiedAt_idx";--> statement-breakpoint
DROP INDEX "certificates_certificateId_idx";--> statement-breakpoint
DROP INDEX "certificates_certificateId_key";--> statement-breakpoint
DROP INDEX "certificates_issuedAt_idx";--> statement-breakpoint
DROP INDEX "certificates_issuerId_idx";--> statement-breakpoint
DROP INDEX "certificates_recipientEmail_idx";--> statement-breakpoint
DROP INDEX "certificates_status_idx";--> statement-breakpoint
ALTER TABLE "verification_logs" ADD COLUMN "certificate_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_logs" ADD COLUMN "verified_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_logs" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "verification_logs" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "certificate_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "recipient_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "recipient_email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "issued_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "data_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "qr_code_data" text NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "issuer_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "verification_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "last_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "expires_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "updated_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "account_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "provider_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "access_token" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "id_token" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "access_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "refresh_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "updated_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "expires_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issuer_id_user_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_log_certificateId_idx" ON "verification_logs" USING btree ("certificate_id");--> statement-breakpoint
CREATE INDEX "verification_log_verifiedAt_idx" ON "verification_logs" USING btree ("verified_at");--> statement-breakpoint
CREATE INDEX "certificate_certificateId_idx" ON "certificates" USING btree ("certificate_id");--> statement-breakpoint
CREATE INDEX "certificate_recipientEmail_idx" ON "certificates" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "certificate_issuerId_idx" ON "certificates" USING btree ("issuer_id");--> statement-breakpoint
CREATE INDEX "certificate_status_idx" ON "certificates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "certificate_issuedAt_idx" ON "certificates" USING btree ("issued_at");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "verification_logs" DROP COLUMN "certificateId";--> statement-breakpoint
ALTER TABLE "verification_logs" DROP COLUMN "verifiedAt";--> statement-breakpoint
ALTER TABLE "verification_logs" DROP COLUMN "ipAddress";--> statement-breakpoint
ALTER TABLE "verification_logs" DROP COLUMN "userAgent";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "certificateId";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "recipientName";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "recipientEmail";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "issuedAt";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "expiresAt";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "dataHash";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "qrCodeData";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "issuerId";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "verificationCount";--> statement-breakpoint
ALTER TABLE "certificates" DROP COLUMN "lastVerifiedAt";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "expiresAt";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "ipAddress";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "userAgent";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "userId";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "accountId";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "providerId";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "userId";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "accessToken";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "refreshToken";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "idToken";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "accessTokenExpiresAt";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "refreshTokenExpiresAt";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "verification" DROP COLUMN "expiresAt";--> statement-breakpoint
ALTER TABLE "verification" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "verification" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_certificate_id_unique" UNIQUE("certificate_id");--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_token_unique" UNIQUE("token");