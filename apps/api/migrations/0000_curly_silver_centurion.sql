DO $$ BEGIN
 CREATE TYPE "note_type" AS ENUM('progress', 'prescription', 'admission', 'discharge');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('doctor', 'administrator', 'nurse');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"type" "note_type" DEFAULT 'progress' NOT NULL,
	"patient_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"signed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospitals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(256) NOT NULL,
	"date_of_birth" timestamp NOT NULL,
	"hospital_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(256) NOT NULL,
	"hashed_password" text NOT NULL,
	"role" "user_role" DEFAULT 'doctor' NOT NULL,
	"hospital_id" integer NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_idx" ON "users" ("email");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patients" ADD CONSTRAINT "patients_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
