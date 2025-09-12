---
description: Supabase / SQL safety, performance & structure best practices
globs:
  - "supabase/migrations/**/*.sql"
  - "db/**/*.sql"
  - "db/**/*.js"
  - "db/**/*.ts"
  - "api/**/*.ts"
  - "api/**/*.js"
alwaysApply: true
---

## Supabase Best Practices Rules

### 1. Migrations & Schema Changes
- All schema changes must be versioned using the Supabase CLI.  
- Never modify schema directly in the Supabase Dashboard for production databases.  
- Migration files must be named with timestamp + descriptive name (e.g., `2025_09_15_add_orders_table.sql`).  
- Always test migrations locally or in staging before applying to production.  

### 2. Row-Level Security (RLS)
- RLS must be **enabled** on all tables that contain user data or are exposed via APIs.  
- For each table, define explicit policies for: `SELECT`, `INSERT`, `UPDATE`, `DELETE`.  
- Use `auth.uid()` or other claims to restrict access to the authenticated user's data only.  
- Follow the principle of least privilege: policies should be as strict as possible.  

### 3. Security & Environment
- Enforce SSL in production database connections.  
- Never expose `service_role` keys in frontend code — only use them in secure backend environments.  
- Ensure `.env` files and secrets are always listed in `.gitignore`.  
- Apply network restrictions (IP allowlists) when possible.  

### 4. Performance
- Add indexes for columns frequently used in RLS conditions and `WHERE` clauses.  
- Avoid enabling real-time replication for all tables; only enable where absolutely necessary.  
- Regularly monitor queries and logs for performance bottlenecks.  

### 5. CI/CD & Version Control
- All migrations, SQL policy files, and backend code must go through Pull Requests.  
- Use separate environments: **development**, **staging**, **production**.  
- Run automated tests and type-checking before merging or deploying.  
- Always review SQL migrations before merge to avoid destructive schema changes.  

### 6. Documentation
- Document all RLS policies: table, roles, operations, and reasoning.  
- Maintain an updated database schema diagram with tables, relations, and constraints.  
- Document `.env` structure and required environment variables for local/staging/prod setups.  

