---
description: Security, environment management, secrets handling, and rollback strategies
globs:
  - ".env*"
  - "**/.env*"
  - "**/config/**/*.js"
  - "**/config/**/*.ts"
  - "**/config/**/*.json"
  - "**/secrets/**/*"
  - "**/migrations/**/*.sql"
  - "**/migrations/**/*.ts"
  - "**/migrations/**/*.js"
alwaysApply: true
---

## Security & Environment Management Rules

### 1. Environment Files & Git Security
- **`.env` files must ALWAYS be in `.gitignore`** - never commit environment files to version control.
- Use `.env.example` or `.env.template` files to document required environment variables.
- Never include actual secrets or sensitive values in example files.
- Use descriptive variable names with clear prefixes (e.g., `DB_`, `API_`, `STRIPE_`).

### 2. Environment File Structure
- **Separate environment files** for different stages:
  - `.env.local` - Local development (gitignored)
  - `.env.development` - Development environment
  - `.env.staging` - Staging environment  
  - `.env.production` - Production environment
- Use **environment-specific prefixes** in variable names (e.g., `DEV_DB_URL`, `PROD_DB_URL`).
- Always include **fallback values** for non-sensitive configuration.

### 3. Secrets Management
- **Local Development**: Use `dotenv` package to load environment variables.
- **CI/CD**: Use GitHub Secrets or platform-specific secret management.
- **Production**: Use secure secret management services (AWS Secrets Manager, Azure Key Vault, etc.).
- Never hardcode secrets in source code, even in comments or documentation.

### 4. Sensitive Data Protection
- **Never log sensitive values** - use placeholder text or redaction.
- Implement **input sanitization** for all user inputs.
- Use **encryption at rest** for sensitive data storage.
- Apply **principle of least privilege** for API keys and database access.

### 5. Environment Variable Validation
- Validate **required environment variables** at application startup.
- Use **Zod schemas** or similar for environment variable validation.
- Provide **clear error messages** for missing or invalid environment variables.
- Implement **type safety** for environment variables.

### 6. Database & Migration Security
- **Always define a rollback plan** for database migrations.
- Test migrations on **staging environment** before production.
- Use **transactional migrations** to ensure atomicity.
- Implement **migration versioning** and tracking.
- Never run **destructive migrations** without backup.

### 7. API Security
- Use **HTTPS only** in production environments.
- Implement **API rate limiting** and request validation.
- Use **JWT tokens** with appropriate expiration times.
- Validate **request origins** and implement CORS policies.

### 8. Configuration Management
- Use **environment-specific configuration files**.
- Implement **configuration validation** at startup.
- Use **feature flags** for environment-specific functionality.
- Document **all configuration options** and their purposes.

### 9. Logging & Monitoring Security
- **Never log sensitive data** (passwords, tokens, personal information).
- Implement **structured logging** with appropriate log levels.
- Use **log aggregation** and monitoring tools.
- Implement **alerting** for security-related events.

### 10. Deployment Security
- Use **environment-specific deployment pipelines**.
- Implement **health checks** for deployed services.
- Use **blue-green deployments** or **rolling updates**.
- Implement **automated rollback triggers** for failed deployments.

### 11. Error Handling & Information Disclosure
- **Never expose sensitive information** in error messages.
- Implement **generic error messages** for production.
- Log **detailed errors** server-side only.
- Use **error tracking** services for debugging.

### 12. Third-Party Integrations
- Use **environment-specific API keys** for external services.
- Implement **webhook signature verification**.
- Use **secure communication** for third-party API calls.
- Regularly **rotate API keys** and tokens.

## Example Environment File Structure

### .env.example
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
# DB_PASSWORD=your_password (set in actual .env file)

# API Keys
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_... (set in actual .env file)

# Application Settings
NODE_ENV=development
PORT=3000
JWT_SECRET=your_jwt_secret
```

### Environment Validation Example
```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.string().transform(Number),
  DB_HOST: z.string().min(1),
  DB_PORT: z.string().transform(Number),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
});

export const env = envSchema.parse(process.env);
```

### Migration Rollback Example
```sql
-- Migration: 2025_09_15_add_user_preferences.sql
-- Rollback Plan: Remove user_preferences table and related constraints

-- Forward migration
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Rollback migration (2025_09_15_add_user_preferences_rollback.sql)
DROP TABLE IF EXISTS user_preferences;
```

### Secure Logging Example
```typescript
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'app.log' })
  ]
});

// ✅ Good - logs user action without sensitive data
logger.info('User login attempt', {
  userId: user.id,
  email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
  timestamp: new Date().toISOString()
});

// ❌ Bad - logs sensitive data
logger.info('User login', {
  password: user.password, // NEVER DO THIS
  token: user.accessToken  // NEVER DO THIS
});
```

### GitHub Secrets Configuration
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          STRIPE_SECRET_KEY: ${{ secrets.PROD_STRIPE_SECRET_KEY }}
          JWT_SECRET: ${{ secrets.PROD_JWT_SECRET }}
        run: npm run build
        
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Deployment commands here
```

## Security Checklist

### Before Every Deployment:
- [ ] All `.env` files are in `.gitignore`
- [ ] No secrets committed to version control
- [ ] Environment variables validated
- [ ] Migration rollback plan defined
- [ ] Sensitive data not logged
- [ ] HTTPS enabled in production
- [ ] API rate limiting configured
- [ ] Error messages don't expose sensitive info
- [ ] Third-party API keys rotated if needed
- [ ] Health checks implemented
- [ ] Monitoring and alerting configured

