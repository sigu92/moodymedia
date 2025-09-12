# 🔐 Unified Role System Guide

## Overview

This project uses a **unified role-based access control (RBAC) system** built on PostgreSQL with Row Level Security (RLS). The system supports multiple roles with hierarchical permissions and secure data access.

## 🏗️ System Architecture

### Core Components

1. **Database Tables**
   - `user_role_assignments`: Maps users to roles
   - `profiles`: User profile information
   - `media_outlets`: Content sites (filtered by role)
   - `orders`: Purchase orders (buyer/publisher access)
   - Various other tables with RLS policies

2. **Role Types**
   - `system_admin`: Full system access
   - `admin`: Administrative functions
   - `publisher`: Can create/manage media outlets
   - `buyer`: Can purchase from marketplace

3. **Key Functions**
   - `is_platform_admin(user_id)`: Checks admin status
   - Role-based RLS policies on all tables

## 📋 Role Hierarchy & Permissions

### System Admin (`system_admin`)
**Highest level - Full system access**
- ✅ View/manage all users and roles
- ✅ Import websites to marketplace
- ✅ Access all admin functions
- ✅ Override any restrictions
- ✅ View all data across the system

### Admin (`admin`)
**Administrative access**
- ✅ Manage users and content
- ✅ Access admin dashboard
- ✅ Moderate content
- ✅ View system analytics

### Publisher (`publisher`)
**Content creator access**
- ✅ Create/manage own media outlets
- ✅ Receive/manage orders for their sites
- ✅ View earnings and analytics
- ✅ Access publisher dashboard

### Buyer (`buyer`)
**Marketplace access**
- ✅ Browse marketplace
- ✅ Purchase placements
- ✅ Manage own orders
- ✅ Access buyer dashboard

## 🔒 RLS Policy Structure

### User Role Assignments
```sql
-- Users can ALWAYS see their own roles
CREATE POLICY "Users can view their own role assignments"
ON user_role_assignments FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage other users' roles
CREATE POLICY "Admins can manage other users role assignments"
ON user_role_assignments FOR ALL
USING (auth.uid() != user_id AND is_platform_admin())
WITH CHECK (auth.uid() != user_id AND is_platform_admin());
```

### Media Outlets
```sql
-- Public read for active outlets
CREATE POLICY "Everyone can view active media outlets"
ON media_outlets FOR SELECT
USING (is_active = true);

-- Publishers manage their own outlets
CREATE POLICY "Publishers can manage their own media outlets"
ON media_outlets FOR ALL
USING (auth.uid() = publisher_id);

-- Admins can manage all outlets
CREATE POLICY "Admins can manage all media outlets"
ON media_outlets FOR ALL
USING (is_platform_admin());
```

### Orders
```sql
-- Buyers see their own orders
CREATE POLICY "Buyers can view their own orders"
ON orders FOR SELECT
USING (auth.uid() = buyer_id);

-- Publishers see orders for their outlets
CREATE POLICY "Publishers can view orders for their media"
ON orders FOR SELECT
USING (auth.uid() = publisher_id);

-- Admins see all orders
CREATE POLICY "Admins can manage all orders"
ON orders FOR ALL
USING (is_platform_admin());
```

## 🚨 Critical: Avoiding Circular Dependencies

### The Problem
❌ **Circular Dependency (BROKEN)**:
```
RLS Policy: requires is_platform_admin()
is_platform_admin(): reads from user_role_assignments
user_role_assignments: protected by RLS policy
→ Infinite recursion!
```

### The Solution
✅ **Fixed Approach**:
```sql
-- Users can ALWAYS see their own roles (no admin check needed)
CREATE POLICY "Users can view their own role assignments"
ON user_role_assignments FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage OTHER users' roles
CREATE POLICY "Admins can manage other users role assignments"
ON user_role_assignments FOR ALL
USING (auth.uid() != user_id AND is_platform_admin());
```

**Key Insight**: Users can always read their own roles, so `is_platform_admin()` works without circular dependency.

## 🛠️ Role Management Commands

### Check User Roles
```sql
SELECT role FROM user_role_assignments WHERE user_id = auth.uid();
```

### Add System Admin Role
```sql
INSERT INTO user_role_assignments (user_id, role)
SELECT id, 'system_admin'::app_role
FROM auth.users WHERE email = 'user@example.com';
```

### Check Admin Status
```sql
SELECT is_platform_admin() as is_admin;
```

### Remove Role
```sql
DELETE FROM user_role_assignments
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
AND role = 'system_admin'::app_role;
```

## 🔧 Development Guidelines

### Adding New Roles
1. Add to `app_role` enum in migrations
2. Update `is_platform_admin()` if needed
3. Create appropriate RLS policies
4. Update frontend role checks

### Modifying RLS Policies
1. **Never create circular dependencies**
2. **Test with multiple user types**
3. **Verify admin override works**
4. **Document policy changes**

### Frontend Integration
```typescript
// Check roles in React components
const { userRoles, hasRole } = useAuth();

if (hasRole('system_admin')) {
  // Show admin features
}

if (hasRole('publisher')) {
  // Show publisher features
}
```

## 🚨 Common Issues & Solutions

### Issue: User can't see their roles
**Cause**: Circular dependency in RLS policies
**Solution**: Ensure users can always read their own roles without admin checks

### Issue: Admin can't access data
**Cause**: `is_platform_admin()` function broken
**Solution**: Check function exists and works correctly

### Issue: New role not working
**Cause**: Missing RLS policies for new role
**Solution**: Add appropriate policies for the new role

### Issue: Import fails for admins
**Cause**: RLS policies blocking admin operations
**Solution**: Ensure admin policies allow full access to relevant tables

## 📊 System Health Checks

### Daily Checks
- [ ] Admin users can access admin dashboard
- [ ] Publishers can create media outlets
- [ ] Buyers can access marketplace
- [ ] Import functionality works for admins

### Weekly Checks
- [ ] No RLS policy conflicts
- [ ] Role assignments are correct
- [ ] All user types can access appropriate features

### Monthly Checks
- [ ] Review and update RLS policies
- [ ] Audit role assignments
- [ ] Performance impact of RLS policies

## 🎯 Best Practices

1. **Always test with multiple user types**
2. **Avoid circular dependencies in RLS policies**
3. **Document role changes and policy updates**
4. **Use `is_platform_admin()` for admin checks**
5. **Test role transitions thoroughly**
6. **Keep role hierarchy clear and documented**

## 📞 Support

When adding new features or modifying roles:

1. Check this guide first
2. Test with all user types
3. Verify no circular dependencies
4. Update documentation
5. Test in staging environment

**Remember**: Security is paramount. Always err on the side of restrictive policies and explicitly grant permissions rather than relying on implicit access.
