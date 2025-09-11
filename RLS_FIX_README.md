# 🔧 Fix RLS Infinite Recursion Error

## 🚨 Problem
You're getting an "infinite recursion detected in policy for relation 'user_role_assignments'" error when trying to fetch role information.

## 🔍 Root Cause
The Row Level Security (RLS) policy for the `user_role_assignments` table was trying to check admin permissions by querying the same table, creating infinite recursion.

## 🛠️ Solution

### Step 1: Run the Fix Script
1. **Go to your Supabase Dashboard**
   - Open your project in [Supabase Dashboard](https://supabase.com/dashboard)
   - Navigate to **SQL Editor**

2. **Copy the SQL Script**
   - Copy the entire contents of `fix-rls-recursion.sql` file
   - Paste it into the SQL Editor

3. **Run the Script**
   - Click **"Run"** to execute the SQL
   - You should see: `"RLS Policies Fixed - Test Query Working"`

### Step 2: Verify the Fix
1. **Refresh your application**
2. **Go to Settings page** (`/settings`)
3. **Scroll down to "Debug Role Status"**
4. **Click "Fetch Debug Info"**
5. **You should now see your actual roles instead of the recursion error**

### Step 3: Test Role Switching
1. **If you have both buyer and publisher roles**, the RoleSwitcher should appear
2. **Try switching between buyer and publisher modes**
3. **The navigation should update accordingly**

## 📋 What the Fix Does

### Before (Broken)
```sql
-- This policy caused infinite recursion
CREATE POLICY "System admins can manage all role assignments"
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    WHERE ura.user_id = auth.uid()
    AND ura.role IN ('admin'::app_role, 'system_admin'::app_role)
  )
);
```

### After (Fixed)
```sql
-- New secure function that doesn't trigger RLS
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- Direct query without RLS recursion
$$;

-- Safe policies using the function
CREATE POLICY "Users can view their own role assignments"
USING (
  auth.uid() = user_id
  OR public.is_user_admin() = true
);
```

## 🎯 Expected Results

After running the fix:
- ✅ No more infinite recursion errors
- ✅ Role queries work properly
- ✅ Dual-role users can switch between buyer/publisher modes
- ✅ RoleSwitcher appears for users with both roles
- ✅ Debug tools show actual role data

## 🚨 If Issues Persist

If you still have problems after running the fix:

1. **Check the SQL execution** - Make sure the script ran successfully
2. **Refresh your browser cache** - Hard refresh (Ctrl+F5)
3. **Clear application data** - Sign out and sign back in
4. **Check browser console** - Look for any remaining errors

## 📞 Need Help?

If you encounter any issues:
1. Check the SQL execution results in Supabase
2. Look at browser console for error messages
3. Try the debug tools in Settings → Debug Role Status

The fix script is designed to be safe and reversible. It only modifies RLS policies and doesn't affect your data.
