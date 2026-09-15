import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", {
  owner: text("owner").primaryKey(), revision: integer("revision").notNull().default(0),
  settings: text("settings").notNull().default('{}'),
});
export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), code: text("code").notNull(),
  civilId: text("civil_id"), data: text("data").notNull(),
}, t => [uniqueIndex("idx_employees_owner_code").on(t.owner,t.code), uniqueIndex("idx_employees_owner_civil").on(t.owner,t.civilId)]);
export const finances = sqliteTable("finances", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), employeeId: text("employee_id").notNull(), data: text("data").notNull(),
}, t => [index("idx_finances_owner").on(t.owner)]);
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), financeId: text("finance_id").notNull(), data: text("data").notNull(),
}, t => [index("idx_payments_owner").on(t.owner)]);
export const leaveEntries = sqliteTable("leave_entries", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), employeeId: text("employee_id").notNull(), data: text("data").notNull(),
}, t => [index("idx_leave_entries_owner").on(t.owner)]);
export const audit = sqliteTable("audit", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), at: text("at").notNull(), data: text("data").notNull(),
}, t => [index("idx_audit_owner_at").on(t.owner,t.at)]);
export const operations = sqliteTable("operations", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), at: text("at").notNull(),
});
export const organizationAccess = sqliteTable("organization_access", {
  id: text("id").primaryKey(), owner: text("owner").notNull(),
  ownerEmail: text("owner_email").notNull(), ownerName: text("owner_name").notNull(), createdAt: text("created_at").notNull(),
});
export const members = sqliteTable("members", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), email: text("email").notNull(),
  userId: text("user_id"), name: text("name").notNull(), role: text("role").notNull(),
  permissions: text("permissions").notNull(), active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, t => [uniqueIndex("idx_members_owner_email").on(t.owner,t.email), uniqueIndex("idx_members_owner_user").on(t.owner,t.userId)]);

export const employmentHistory = sqliteTable("employment_history", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  employeeId: text("employee_id").notNull(),
  data: text("data").notNull(),
}, t => [index("idx_history_owner_employee").on(t.owner, t.employeeId)]);

export const payrollMonths = sqliteTable("payroll_months", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  month: text("month").notNull(),
  data: text("data").notNull(),
}, t => [uniqueIndex("idx_payroll_owner_month").on(t.owner, t.month)]);
