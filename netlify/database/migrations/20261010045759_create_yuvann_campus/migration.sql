CREATE TABLE "academic_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"college_id" uuid NOT NULL,
	"parent_id" uuid,
	"kind" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"college_id" uuid NOT NULL,
	"teacher_id" text NOT NULL,
	"group_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"subject" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"max_marks" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"college_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"teacher_id" text NOT NULL,
	"student_id" text NOT NULL,
	"date" text NOT NULL,
	"present" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_id" text NOT NULL,
	"college_id" uuid,
	"action" text NOT NULL,
	"target_id" text NOT NULL,
	"details" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colleges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"city" text NOT NULL,
	"kind" text DEFAULT 'College' NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"post_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"college_id" uuid NOT NULL,
	"organizer_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'Workshop' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"venue" text NOT NULL,
	"visibility" text DEFAULT 'campus' NOT NULL,
	"capacity" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"college_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"blob_key" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"college_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"group_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"college_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'class' NOT NULL,
	"policy" text DEFAULT 'college_verified' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"branch" text DEFAULT '' NOT NULL,
	"semester" text DEFAULT '' NOT NULL,
	"section" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"college_id" uuid NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"branch" text DEFAULT '' NOT NULL,
	"semester" text DEFAULT '' NOT NULL,
	"section" text DEFAULT '' NOT NULL,
	"unit_id" uuid,
	"proof_id" uuid,
	"reason" text DEFAULT '' NOT NULL,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"college_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"college_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"file_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subject" text NOT NULL,
	"branch" text DEFAULT '' NOT NULL,
	"semester" text DEFAULT '' NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"chapter" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"college_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"category" text DEFAULT 'discussion' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"portfolio_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assignment_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"file_id" uuid NOT NULL,
	"marks" integer,
	"feedback" text DEFAULT '' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_unique" ON "attendance" ("group_id","student_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "follow_unique" ON "follows" ("user_id","college_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_member_unique" ON "group_members" ("group_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_user_unique" ON "memberships" ("user_id");--> statement-breakpoint
CREATE INDEX "membership_college_index" ON "memberships" ("college_id");--> statement-breakpoint
CREATE INDEX "posts_college_index" ON "posts" ("college_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reaction_unique" ON "reactions" ("post_id","user_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "registration_unique" ON "registrations" ("event_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_unique" ON "submissions" ("assignment_id","student_id");--> statement-breakpoint
ALTER TABLE "academic_units" ADD CONSTRAINT "academic_units_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacher_id_profiles_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id");--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id");--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_teacher_id_profiles_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_profiles_id_fkey" FOREIGN KEY ("student_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_profiles_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_profiles_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owner_id_profiles_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_profiles_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_unit_id_academic_units_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "academic_units"("id");--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_proof_id_files_id_fkey" FOREIGN KEY ("proof_id") REFERENCES "files"("id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_profiles_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_profiles_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_profiles_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_file_id_files_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_profiles_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id");--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id");--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_profiles_id_fkey" FOREIGN KEY ("student_id") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_file_id_files_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id");