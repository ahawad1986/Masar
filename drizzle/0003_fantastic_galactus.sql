CREATE TABLE `job_kpis` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`job` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_job_kpis_owner_job` ON `job_kpis` (`owner`,`job`);--> statement-breakpoint
CREATE TABLE `performance_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`employee_id` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_evaluations_owner_employee` ON `performance_evaluations` (`owner`,`employee_id`);