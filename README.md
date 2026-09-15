# Madar HR | مدار

Arabic, RTL employee administration workspace for Kuwait. Private Site authentication, shared organization records and server-enforced user roles.

## Implemented

- Expanded employee profiles with identity, personal, administrative, contract, salary and bank fields.
- Loan, advance, obligation and deduction ledgers with installment, lender, deduction mode, priority and pause fields.
- Independent annual leave and holiday-compensation balances with immutable movements.
- Reviewed bulk employee updates, credit/debit movements and immutable employment-history records.
- Real XLSX import, Arabic templates, column mapping and reports. Financial imports accept opening paid amounts and unique references.
- Transactional writes, revision conflict detection, audit history and request idempotency.
- User management with owner, admin, HR, accountant, viewer and custom permissions.
- Employment history screen and initial monthly close screen for approved deduction totals.

## Boundaries

This is an administrative workspace with application-level roles, not a payroll or government integration. Policies are configurable reference values; legal entitlement and automatic accrual are not inferred. No deductions, transfers or external notifications are sent.

Import: 500 records per operation, XLSX only, 5 MB files; formulas are rejected. Audit records are retained in D1; the UI and export show the latest 300 operations.

Adding a user in the app grants application permissions only. The Site itself must also be shared with the same email through Sites sharing before that user can open the private URL. Active users can view employee, salary, finance and leave data; permissions control create, edit, import, export, audit and user-management actions.

## Validation

Run `node scripts/verify-hr.mjs` for financial, import, ownership and atomic-write verification. Run `node scripts/verify-permissions.mjs` for role and authorization checks. `node node_modules/typescript/bin/tsc --noEmit` checks types. The Sites build helper creates the Worker and copies the generated Drizzle migrations.

A successful build, 26 domain/SQLite/XLSX checks and 11 permission checks were completed after the HR module expansion. Browser and WebMCP interaction validation were unavailable under this session's permitted preview workflow; no browser QA is claimed.
