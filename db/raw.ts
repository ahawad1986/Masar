import { DatabaseSync } from "node:sqlite";
import path from "node:path";

let sqliteDb: DatabaseSync | null = null;

function sanitizeParams(params: any[]): any[] {
  return params.map(p => (p === undefined ? null : p));
}

function initDb(): DatabaseSync {
  if (sqliteDb) return sqliteDb;

  const dbPath = process.env.DB_PATH || path.join(process.cwd(), "masar.sqlite");
  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec("PRAGMA journal_mode = WAL;");
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      owner text PRIMARY KEY NOT NULL,
      revision integer DEFAULT 0 NOT NULL,
      settings text DEFAULT '{}' NOT NULL
    );
    CREATE TABLE IF NOT EXISTS employees (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      code text NOT NULL,
      civil_id text,
      data text NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_owner_code ON employees (owner,code);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_owner_civil ON employees (owner,civil_id);
    CREATE TABLE IF NOT EXISTS finances (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      employee_id text NOT NULL,
      data text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_finances_owner ON finances (owner);
    CREATE TABLE IF NOT EXISTS payments (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      finance_id text NOT NULL,
      data text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payments_owner ON payments (owner);
    CREATE TABLE IF NOT EXISTS leave_entries (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      employee_id text NOT NULL,
      data text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_leave_entries_owner ON leave_entries (owner);
    CREATE TABLE IF NOT EXISTS audit (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      at text NOT NULL,
      data text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_owner_at ON audit (owner,at);
    CREATE TABLE IF NOT EXISTS operations (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      at text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS organization_access (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      owner_email text NOT NULL,
      owner_name text NOT NULL,
      created_at text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS members (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      email text NOT NULL,
      user_id text,
      name text NOT NULL,
      role text NOT NULL,
      permissions text NOT NULL,
      active integer DEFAULT 1 NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_members_owner_email ON members (owner,email);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_members_owner_user ON members (owner,user_id);
    CREATE TABLE IF NOT EXISTS employment_history (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      employee_id text NOT NULL,
      data text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_history_owner_employee ON employment_history (owner,employee_id);
    CREATE TABLE IF NOT EXISTS payroll_months (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      month text NOT NULL,
      data text NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_owner_month ON payroll_months (owner,month);
    CREATE TABLE IF NOT EXISTS job_kpis (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      job text NOT NULL,
      data text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_job_kpis_owner_job ON job_kpis (owner,job);
    CREATE TABLE IF NOT EXISTS performance_evaluations (
      id text PRIMARY KEY NOT NULL,
      owner text NOT NULL,
      employee_id text NOT NULL,
      data text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_evaluations_owner_employee ON performance_evaluations (owner,employee_id);
  `);
  return sqliteDb;
}

export interface D1PreparedStatement {
  bind(...params: any[]): D1PreparedStatement;
  first<T = Record<string, any>>(colName?: string): Promise<T | null>;
  all<T = Record<string, any>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

class StatementWrapper implements D1PreparedStatement {
  private query: string;
  private params: any[];
  private db: DatabaseSync;

  constructor(db: DatabaseSync, query: string, params: any[] = []) {
    this.db = db;
    this.query = query;
    this.params = params;
  }

  bind(...params: any[]): D1PreparedStatement {
    return new StatementWrapper(this.db, this.query, sanitizeParams(params));
  }

  async first<T = Record<string, any>>(colName?: string): Promise<T | null> {
    const stmt = this.db.prepare(this.query);
    const row = stmt.get(...this.params) as any;
    if (!row) return null;
    if (colName) return (row[colName] ?? null) as T;
    return row as T;
  }

  async all<T = Record<string, any>>(): Promise<{ results: T[] }> {
    const stmt = this.db.prepare(this.query);
    const rows = stmt.all(...this.params) as T[];
    return { results: rows || [] };
  }

  async run(): Promise<{ success: boolean }> {
    const stmt = this.db.prepare(this.query);
    stmt.run(...this.params);
    return { success: true };
  }

  executeInternal(): { results: any[] } {
    const trimmed = this.query.trim().toUpperCase();
    const isSelect = trimmed.startsWith("SELECT") || trimmed.startsWith("PRAGMA");
    const stmt = this.db.prepare(this.query);
    if (isSelect) {
      const rows = stmt.all(...this.params);
      return { results: (rows as any[]) || [] };
    } else {
      stmt.run(...this.params);
      return { results: [] };
    }
  }
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<Array<{ results: any[] }>>;
}

export function database(): D1Database {
  const syncDb = initDb();

  return {
    prepare(query: string): D1PreparedStatement {
      return new StatementWrapper(syncDb, query);
    },
    async batch(statements: D1PreparedStatement[]): Promise<Array<{ results: any[] }>> {
      const results: Array<{ results: any[] }> = [];
      syncDb.exec("BEGIN IMMEDIATE;");
      try {
        for (const s of statements) {
          const wrapper = s as StatementWrapper;
          results.push(wrapper.executeInternal());
        }
        syncDb.exec("COMMIT;");
      } catch (err) {
        syncDb.exec("ROLLBACK;");
        throw err;
      }
      return results;
    },
  };
}
