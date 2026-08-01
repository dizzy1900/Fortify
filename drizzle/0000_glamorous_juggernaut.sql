CREATE TABLE `app_state` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`detail_json` text NOT NULL,
	`previous_hash` text,
	`event_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `broker_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`name` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `buildings` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`parcel_id` text,
	`label` text NOT NULL,
	`construction_year` integer,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parcel_id`) REFERENCES `parcels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `carrier_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text,
	`status` text NOT NULL,
	`message` text NOT NULL,
	`entered_at` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `carriers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`fictional` integer NOT NULL,
	`notice_format` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`broker_team_id` text,
	`organization_id` text,
	`name` text NOT NULL,
	FOREIGN KEY (`broker_team_id`) REFERENCES `broker_teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text,
	`author_id` text,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `renewal_cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `communities` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text,
	`name` text NOT NULL,
	`county` text NOT NULL,
	`address` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`fictional` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evidence_items` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`source_type` text NOT NULL,
	`source_organization` text NOT NULL,
	`capture_date` text NOT NULL,
	`upload_date` text NOT NULL,
	`expiry_date` text,
	`scope` text NOT NULL,
	`scope_id` text,
	`latitude` real,
	`longitude` real,
	`submitted_by` text NOT NULL,
	`verified_by` text,
	`confidence` real NOT NULL,
	`human_review_status` text NOT NULL,
	`supersedes_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_hash_community` ON `evidence_items` (`community_id`,`sha256`);--> statement-breakpoint
CREATE TABLE `evidence_links` (
	`id` text PRIMARY KEY NOT NULL,
	`evidence_id` text,
	`requirement_id` text,
	`case_id` text,
	`scope_match` real NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requirement_id`) REFERENCES `requirements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`case_id`) REFERENCES `renewal_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evidence_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`evidence_id` text,
	`case_id` text,
	`reviewer_id` text,
	`status` text NOT NULL,
	`note` text,
	`reviewed_at` text NOT NULL,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`case_id`) REFERENCES `renewal_cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `maintenance_events` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`title` text NOT NULL,
	`due_at` text NOT NULL,
	`recurrence` text,
	`evidence_id` text,
	`status` text NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mitigation_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`completed_at` text,
	`contractor` text,
	FOREIGN KEY (`case_id`) REFERENCES `renewal_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notice_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`notice_id` text,
	`field` text NOT NULL,
	`extracted_value` text NOT NULL,
	`confirmed_value` text,
	`confidence` real NOT NULL,
	`confirmed_by` text,
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text,
	`received_at` text NOT NULL,
	`source_filename` text NOT NULL,
	`raw_text` text NOT NULL,
	`confirmed_at` text,
	`extractor` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `renewal_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`fictional` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outcomes` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text,
	`disposition` text NOT NULL,
	`classification_changed` integer NOT NULL,
	`discount` text,
	`renewal_status` text,
	`premium_change_cents` integer,
	`reason` text,
	`entered_at` text NOT NULL,
	`fictional` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `renewal_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `parcels` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`label` text NOT NULL,
	`geometry_json` text,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `policies` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`carrier_id` text,
	`number` text NOT NULL,
	`renewal_date` text NOT NULL,
	`premium_cents` integer,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`carrier_id`) REFERENCES `carriers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `renewal_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`owner_id` text,
	`appeal_deadline` text,
	`readiness` integer NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `requirement_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`requirement_id` text,
	`version` text NOT NULL,
	`valid_from` text NOT NULL,
	`source_url` text NOT NULL,
	`current` integer NOT NULL,
	FOREIGN KEY (`requirement_id`) REFERENCES `requirements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`standard_id` text,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`scope` text NOT NULL,
	`summary` text NOT NULL,
	FOREIGN KEY (`standard_id`) REFERENCES `standards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `standards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`publisher` text NOT NULL,
	`version` text NOT NULL,
	`effective_date` text NOT NULL,
	`source_url` text NOT NULL,
	`verify_current` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submission_items` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text,
	`evidence_id` text,
	`exhibit_label` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text,
	`version` integer NOT NULL,
	`purpose` text NOT NULL,
	`status` text NOT NULL,
	`confirmed_by` text,
	`submitted_at` text,
	`manifest_hash` text,
	FOREIGN KEY (`case_id`) REFERENCES `renewal_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text,
	`title` text NOT NULL,
	`owner_id` text,
	`due_at` text NOT NULL,
	`status` text NOT NULL,
	`requirement_id` text,
	FOREIGN KEY (`case_id`) REFERENCES `renewal_cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `unit_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text,
	`unit_count` integer NOT NULL,
	`building_count` integer NOT NULL,
	`occupancy` text NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`role_id` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);