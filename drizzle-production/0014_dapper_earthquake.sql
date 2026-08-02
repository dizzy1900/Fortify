ALTER TABLE "case_assignments" ADD COLUMN "access_purpose" text DEFAULT 'case workflow assignment' NOT NULL;--> statement-breakpoint
ALTER TABLE "case_assignments" ADD COLUMN "data_domains" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "case_assignments" ADD COLUMN "revocation_reason" text;--> statement-breakpoint
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_purpose_check" CHECK (char_length(trim("case_assignments"."access_purpose")) >= 8);
--> statement-breakpoint
CREATE TRIGGER case_assignments_revocation_only
BEFORE UPDATE ON "case_assignments"
FOR EACH ROW EXECUTE FUNCTION fortify_guard_assignment_revocation();
