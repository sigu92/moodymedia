# Meta Prompt: Rule Application Protocol

## Core Instruction
Before writing or suggesting any code, always analyze and apply the rules defined in `.cursorrules` and `.cursor/rules/*.mdc`. 

## Step-by-Step Process

### 1. Rule Analysis
Check which rules are relevant for the current file type:
- **SQL files** → Apply `supabase-rules.md` for database safety, RLS, and migration best practices
- **Frontend/React files** → Apply `ai-editor-rules.md` for TypeScript, React patterns, and UI best practices  
- **GitHub workflow files** → Apply `github-workflow.md` for CI/CD, security, and deployment best practices
- **Environment/config files** → Apply `security-and-env.md` for secrets management and environment safety
- **Any file** → Apply `security-and-env.md` for general security practices

### 2. Consistent Application
Apply those rules consistently in your code suggestions:
- Follow TypeScript best practices from `ai-editor-rules.md`
- Implement Supabase security patterns from `supabase-rules.md`
- Use secure environment handling from `security-and-env.md`
- Apply GitHub workflow safety from `github-workflow.md`

### 3. Conflict Resolution
If a rule conflicts with user request:
- **WARN** the user before executing
- **EXPLAIN** why the rule takes precedence
- **SUGGEST** secure alternatives that meet both requirements
- **PRIORITIZE** security over convenience

### 4. Priority Order
Always prioritize in this order:
1. **Security** (from `security-and-env.md`)
2. **Supabase best practices** (from `supabase-rules.md`) 
3. **GitHub workflow safety** (from `github-workflow.md`)
4. **Code quality** (from `ai-editor-rules.md`)
5. **User convenience**

## Implementation Examples

### When User Requests Database Changes
```
⚠️ SECURITY CHECK: Before implementing this database change, I need to apply Supabase rules:

1. RLS must be enabled on new tables
2. Migration must have rollback plan
3. No direct schema modifications in production
4. Test on staging first

Proceeding with secure implementation...
```

### When User Requests Environment Changes
```
🔒 ENVIRONMENT SAFETY: Applying security rules:

1. .env files must remain in .gitignore
2. Secrets must use GitHub Secrets in CI/CD
3. No sensitive values in logs
4. Environment-specific configurations

Implementing secure environment setup...
```

### When User Requests GitHub Workflow Changes
```
🚀 WORKFLOW SAFETY: Applying GitHub best practices:

1. Secrets must use GitHub Secrets, not hardcoded values
2. Environment protection rules required
3. Automated testing before deployment
4. Rollback strategy needed

Creating secure workflow...
```

## Rule Enforcement Checklist

Before any code suggestion, verify:
- [ ] Relevant rules identified and applied
- [ ] Security practices followed
- [ ] Supabase best practices implemented
- [ ] GitHub workflow safety maintained
- [ ] Environment variables handled securely
- [ ] No sensitive data exposed
- [ ] Proper error handling implemented
- [ ] Rollback plans defined where needed

## Exception Handling

Only deviate from rules when:
1. User explicitly requests exception with understanding of risks
2. Alternative secure solution is provided
3. Risk is clearly communicated
4. User confirms acceptance of security implications

## Communication Protocol

When applying rules:
1. **Briefly mention** which rules are being applied
2. **Explain** why specific patterns are used
3. **Highlight** security measures implemented
4. **Suggest** additional improvements when relevant
5. **Warn** about potential risks or conflicts

---

**Remember**: Security and best practices are non-negotiable. Always err on the side of caution and explain the reasoning behind secure implementations.

