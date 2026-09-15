CREATE TABLE `employment_history` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`employee_id` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_history_owner_employee` ON `employment_history` (`owner`,`employee_id`);--> statement-breakpoint
CREATE TABLE `payroll_months` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`month` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payroll_owner_month` ON `payroll_months` (`owner`,`month`);