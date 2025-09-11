---
description: GitHub Actions, CI/CD pipelines, and workflow best practices
globs:
  - ".github/workflows/**/*.yml"
  - ".github/workflows/**/*.yaml"
  - ".github/**/*.yml"
  - ".github/**/*.yaml"
  - "**/workflow.yml"
  - "**/workflow.yaml"
alwaysApply: true
---

## GitHub Workflow Best Practices Rules

### 1. Workflow Structure & Organization
- Use descriptive workflow names that clearly indicate their purpose (e.g., `ci.yml`, `deploy-production.yml`).
- Organize workflows logically: CI/CD, testing, deployment, security scanning.
- Use consistent file naming: `kebab-case.yml` for workflow files.
- Group related workflows in subdirectories when managing multiple workflows.

### 2. Security & Secrets
- **Never commit secrets or sensitive data** directly in workflow files.
- Use GitHub Secrets for API keys, tokens, and sensitive configuration.
- Use environment-specific secrets (e.g., `STAGING_API_KEY`, `PRODUCTION_API_KEY`).
- Regularly rotate secrets and audit access permissions.
- Use `GITHUB_TOKEN` with minimal required permissions.

### 3. Performance & Efficiency
- Use **matrix strategies** for parallel job execution when testing multiple environments.
- Cache dependencies and build artifacts to speed up workflows.
- Use `actions/cache` for Node.js, Python, and other package managers.
- Implement **job dependencies** to avoid unnecessary builds.
- Use **conditional execution** with `if` statements to skip jobs when appropriate.

### 4. Error Handling & Reliability
- Set appropriate **timeout values** for long-running jobs.
- Use **retry logic** for flaky operations (network requests, external services).
- Implement **failure notifications** via Slack, email, or other channels.
- Use **continue-on-error** judiciously - only for non-critical steps.
- Always include **cleanup steps** in workflows (e.g., removing temporary files).

### 5. Testing & Quality Assurance
- Run **linting and type checking** before running tests.
- Use **parallel test execution** when possible.
- Generate and publish **test coverage reports**.
- Implement **security scanning** (CodeQL, Dependabot, etc.).
- Use **conventional commits** to trigger appropriate workflows.

### 6. Deployment & Environments
- Use **environment protection rules** for production deployments.
- Implement **staging deployments** before production.
- Use **blue-green deployments** or **rolling updates** when possible.
- Tag releases with **semantic versioning** (e.g., `v1.2.3`).
- Implement **rollback strategies** for failed deployments.

### 7. Code Quality & Standards
- Use **consistent indentation** (2 spaces for YAML).
- Include **descriptive comments** for complex workflow logic.
- Use **meaningful step names** and job descriptions.
- Validate workflow syntax with `yamllint` or similar tools.
- Use **reusable workflows** to avoid code duplication.

### 8. Monitoring & Observability
- Use **workflow badges** in README files to show build status.
- Implement **workflow run notifications** for failures.
- Monitor **workflow performance** and optimize slow jobs.
- Use **workflow artifacts** to store and share build outputs.
- Set up **status checks** for pull requests.

### 9. Branch Protection & Pull Requests
- Require **status checks** to pass before merging.
- Use **required reviewers** for production deployments.
- Implement **automated testing** on pull requests.
- Use **draft pull requests** for work-in-progress features.
- Enforce **conventional commit messages**.

### 10. Environment Variables & Configuration
- Use **environment-specific variables** for different stages.
- Document **required environment variables** in README.
- Use **default values** for optional configuration.
- Validate **required environment variables** at workflow start.
- Use **secrets inheritance** for organization-level secrets.

### 11. Docker & Container Workflows
- Use **specific image tags** instead of `latest` for reproducibility.
- Implement **multi-stage builds** for smaller images.
- Use **Docker layer caching** to speed up builds.
- Scan **container images** for vulnerabilities.
- Use **distroless images** when possible for security.

### 12. Node.js & Frontend Workflows
- Use **Node.js version matrix** for compatibility testing.
- Cache **node_modules** and build artifacts.
- Use **npm ci** instead of `npm install` for CI environments.
- Implement **build optimization** (tree shaking, minification).
- Use **package-lock.json** for consistent dependency resolution.

### 13. Database & Migration Workflows
- Run **database migrations** in a controlled manner.
- Use **transactional migrations** to ensure consistency.
- Implement **migration rollback** capabilities.
- Test **migrations against production-like data**.
- Use **database backups** before major migrations.

### 14. Documentation & Maintenance
- Document **workflow triggers** and conditions.
- Include **troubleshooting guides** for common failures.
- Regularly **update action versions** to latest stable releases.
- Review and **clean up old workflow runs** periodically.
- Document **required permissions** and access levels.

### 15. Workflow Triggers & Events
- Use **specific trigger events** instead of broad triggers.
- Implement **path-based triggers** for monorepos.
- Use **workflow_dispatch** for manual deployments.
- Avoid **recursive workflow triggers**.
- Use **schedule triggers** appropriately for maintenance tasks.

## Example Workflow Structure

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build application
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: echo "Deploy to staging"

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: echo "Deploy to production"
```
