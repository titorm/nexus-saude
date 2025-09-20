DO $$ BEGIN
 CREATE TYPE "priority" AS ENUM('low', 'normal', 'high', 'urgent', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "note_type" ADD VALUE 'consultation';--> statement-breakpoint
ALTER TYPE "note_type" ADD VALUE 'diagnosis';--> statement-breakpoint
ALTER TYPE "note_type" ADD VALUE 'examination';--> statement-breakpoint
ALTER TYPE "note_type" ADD VALUE 'laboratory';--> statement-breakpoint
ALTER TYPE "note_type" ADD VALUE 'imaging';--> statement-breakpoint
ALTER TYPE "note_type" ADD VALUE 'procedure';--> statement-breakpoint
ALTER TYPE "note_type" ADD VALUE 'follow_up';--> statement-breakpoint
ALTER TYPE "note_type" ADD VALUE 'referral';--> statement-breakpoint
ALTER TYPE "note_type" ADD VALUE 'emergency';--> statement-breakpoint
ALTER TYPE "note_type" ADD VALUE 'observation';--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "title" varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "priority" "priority" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "symptoms" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "medications" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "vital_signs" json DEFAULT '{}'::json;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "attachments" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "tags" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "is_private" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "follow_up_date" timestamp;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "hospital_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "gender" varchar(10);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "email" varchar(256);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "emergency_contact" varchar(256);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "emergency_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_notes_patient_idx" ON "clinical_notes" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_notes_author_idx" ON "clinical_notes" ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_notes_type_idx" ON "clinical_notes" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_notes_created_at_idx" ON "clinical_notes" ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
