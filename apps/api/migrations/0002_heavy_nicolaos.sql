DO $$ BEGIN
 CREATE TYPE "appointment_status" AS ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"color" varchar(7) DEFAULT '#3B82F6' NOT NULL,
	"is_active" boolean DEFAULT true,
	"requires_approval" boolean DEFAULT false,
	"hospital_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"appointment_type_id" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"reason" varchar(500),
	"symptoms" json DEFAULT '[]'::json,
	"is_urgent" boolean DEFAULT false,
	"requires_preparation" boolean DEFAULT false,
	"preparation_instructions" text,
	"confirmed_at" timestamp,
	"confirmation_method" varchar(20),
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"cancelled_by" integer,
	"rescheduled_from_id" integer,
	"reminder_sent_24h" boolean DEFAULT false,
	"reminder_sent_1h" boolean DEFAULT false,
	"source" varchar(50) DEFAULT 'web',
	"external_id" varchar(100),
	"hospital_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"break_start_time" varchar(5),
	"break_end_time" varchar(5),
	"is_active" boolean DEFAULT true,
	"hospital_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedule_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"start_date_time" timestamp NOT NULL,
	"end_date_time" timestamp NOT NULL,
	"reason" varchar(200),
	"is_recurring" boolean DEFAULT false,
	"recurring_pattern" json,
	"hospital_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_patient_idx" ON "appointments" ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_doctor_idx" ON "appointments" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_scheduled_at_idx" ON "appointments" ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_status_idx" ON "appointments" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_doctor_date_idx" ON "appointments" ("doctor_id","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_schedules_doctor_day_idx" ON "doctor_schedules" ("doctor_id","day_of_week");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doctor_schedules_doctor_idx" ON "doctor_schedules" ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedule_blocks_doctor_date_idx" ON "schedule_blocks" ("doctor_id","start_date_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedule_blocks_doctor_idx" ON "schedule_blocks" ("doctor_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_types" ADD CONSTRAINT "appointment_types_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_appointment_type_id_appointment_types_id_fk" FOREIGN KEY ("appointment_type_id") REFERENCES "appointment_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
