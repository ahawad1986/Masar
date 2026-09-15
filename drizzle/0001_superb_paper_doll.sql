CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`permissions` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_owner_email` ON `members` (`owner`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_owner_user` ON `members` (`owner`,`user_id`);--> statement-breakpoint
CREATE TABLE `organization_access` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`owner_email` text NOT NULL,
	`owner_name` text NOT NULL,
	`created_at` text NOT NULL
);
