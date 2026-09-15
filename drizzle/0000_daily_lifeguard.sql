CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`at` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_owner_at` ON `audit` (`owner`,`at`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`code` text NOT NULL,
	`civil_id` text,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_employees_owner_code` ON `employees` (`owner`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_employees_owner_civil` ON `employees` (`owner`,`civil_id`);--> statement-breakpoint
CREATE TABLE `finances` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`employee_id` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_finances_owner` ON `finances` (`owner`);--> statement-breakpoint
CREATE TABLE `leave_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`employee_id` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_leave_entries_owner` ON `leave_entries` (`owner`);--> statement-breakpoint
CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`finance_id` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_payments_owner` ON `payments` (`owner`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`owner` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL
);
