// COMPREHENSIVE ADMIN DIAGNOSTIC
// This will identify why frontend thinks user is admin but Edge Function doesn't

console.log('🔍 COMPREHENSIVE ADMIN DIAGNOSTIC');
console.log('====================================');

// Step 1: Check authentication
async function checkAuth() {
  console.log('\n1️⃣ AUTHENTICATION CHECK');
  try {
    const { data: { user }, error } = await window.supabase.auth.getUser();
    if (error) throw error;

    console.log('✅ Authenticated user:', {
      id: user?.id,
      email: user?.email,
      created_at: user?.created_at
    });

    return user;
  } catch (error) {
    console.error('❌ Auth check failed:', error);
    return null;
  }
}

// Step 2: Check frontend role state
async function checkFrontendRoles(user) {
  console.log('\n2️⃣ FRONTEND ROLE CHECK');
  try {
    // Check user_role_assignments table directly
    const { data: roles, error } = await window.supabase
      .from('user_role_assignments')
      .select('role')
      .eq('user_id', user.id);

    if (error) throw error;

    const roleList = roles?.map(r => r.role) || [];
    const hasAdmin = roleList.includes('admin');
    const hasSystemAdmin = roleList.includes('system_admin');
    const frontendIsSystemAdmin = hasSystemAdmin || hasAdmin;

    console.log('✅ Database roles:', roleList);
    console.log('✅ Has admin role:', hasAdmin);
    console.log('✅ Has system_admin role:', hasSystemAdmin);
    console.log('✅ Frontend considers system admin:', frontendIsSystemAdmin);

    return { roleList, hasAdmin, hasSystemAdmin, frontendIsSystemAdmin };
  } catch (error) {
    console.error('❌ Frontend role check failed:', error);
    return null;
  }
}

// Step 3: Test is_platform_admin function directly
async function testAdminFunction(user) {
  console.log('\n3️⃣ BACKEND ADMIN FUNCTION TEST');
  try {
    // Test with user ID parameter
    const { data: isAdminWithId, error: errorWithId } = await window.supabase
      .rpc('is_platform_admin', { _user_id: user.id });

    // Test without parameter (uses auth.uid())
    const { data: isAdminWithoutId, error: errorWithoutId } = await window.supabase
      .rpc('is_platform_admin');

    console.log('✅ is_platform_admin(user.id):', isAdminWithId, errorWithId);
    console.log('✅ is_platform_admin():', isAdminWithoutId, errorWithoutId);

    return { isAdminWithId, isAdminWithoutId, errorWithId, errorWithoutId };
  } catch (error) {
    console.error('❌ Admin function test failed:', error);
    return null;
  }
}

// Step 4: Test Edge Function directly
async function testEdgeFunction(user) {
  console.log('\n4️⃣ EDGE FUNCTION TEST');
  try {
    console.log('📤 Testing Edge Function with minimal data...');

    const testData = {
      source: 'csv',
      data: [{ domain: 'test.com', price: '100' }],
      mapping: { domain: 0, price: 1 },
      dry_run: true,
      admin_tags: []
    };

    const startTime = Date.now();
    const { data, error } = await window.supabase.functions.invoke('admin-import-batch', {
      body: testData
    });
    const endTime = Date.now();

    console.log('⏱️ Response time:', endTime - startTime + 'ms');

    if (error) {
      console.error('❌ Edge Function error:', error);
      return { success: false, error, responseTime: endTime - startTime };
    }

    console.log('✅ Edge Function success:', data);
    return { success: true, data, responseTime: endTime - startTime };

  } catch (error) {
    console.error('❌ Edge Function test failed:', error);
    return { success: false, error };
  }
}

// Step 5: Check database consistency
async function checkDatabaseConsistency(user) {
  console.log('\n5️⃣ DATABASE CONSISTENCY CHECK');
  try {
    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await window.supabase
      .rpc('execute_sql', {
        sql: `SELECT id, email FROM auth.users WHERE id = '${user.id}'`
      });

    console.log('✅ User in auth.users:', authUser, authError);

    // Check user_role_assignments table
    const { data: roleAssignments, error: roleError } = await window.supabase
      .from('user_role_assignments')
      .select('*')
      .eq('user_id', user.id);

    console.log('✅ Role assignments:', roleAssignments, roleError);

    // Check if is_platform_admin function works via direct SQL
    const { data: directAdminCheck, error: directAdminError } = await window.supabase
      .rpc('execute_sql', {
        sql: `SELECT public.is_platform_admin('${user.id}'::uuid) as is_admin`
      });

    console.log('✅ Direct SQL admin check:', directAdminCheck, directAdminError);

    return { authUser, roleAssignments, directAdminCheck };

  } catch (error) {
    console.error('❌ Database consistency check failed:', error);
    return null;
  }
}

// Step 6: Analyze results
function analyzeResults(results) {
  console.log('\n6️⃣ ANALYSIS & RECOMMENDATIONS');
  console.log('================================');

  const { user, frontendRoles, adminFunction, edgeFunction, database } = results;

  if (!user) {
    console.log('❌ CRITICAL: User not authenticated');
    return;
  }

  console.log('👤 User ID:', user.id);
  console.log('📧 Email:', user.email);

  // Check role consistency
  const { roleList, frontendIsSystemAdmin } = frontendRoles || {};
  console.log('🎭 Database roles:', roleList);
  console.log('🖥️ Frontend thinks system admin:', frontendIsSystemAdmin);

  // Check admin function results
  const { isAdminWithId, isAdminWithoutId } = adminFunction || {};
  console.log('🔧 is_platform_admin(user.id):', isAdminWithId);
  console.log('🔧 is_platform_admin():', isAdminWithoutId);

  // Check Edge Function result
  const edgeSuccess = edgeFunction?.success;
  console.log('🚀 Edge Function success:', edgeSuccess);

  // Diagnose issues
  console.log('\n🔍 DIAGNOSIS:');

  if (frontendIsSystemAdmin && !isAdminWithId) {
    console.log('❌ ISSUE: Frontend thinks user is admin, but is_platform_admin(user.id) returns false');
    console.log('💡 POSSIBLE CAUSES:');
    console.log('   - User has "admin" role but Edge Function requires "system_admin"');
    console.log('   - Database lookup failing in Edge Function context');
    console.log('   - User ID mismatch between frontend and Edge Function');
  }

  if (isAdminWithId && !edgeSuccess) {
    console.log('❌ ISSUE: is_platform_admin works, but Edge Function still fails');
    console.log('💡 POSSIBLE CAUSES:');
    console.log('   - Edge Function not deployed with latest changes');
    console.log('   - Authentication header not being passed correctly');
    console.log('   - Edge Function environment issue');
  }

  if (!frontendIsSystemAdmin) {
    console.log('❌ ISSUE: Frontend doesn\'t think user is admin, but they can access admin tools');
    console.log('💡 POSSIBLE CAUSES:');
    console.log('   - Race condition in role loading');
    console.log('   - Cached role state');
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');

  if (!roleList?.includes('system_admin') && !roleList?.includes('admin')) {
    console.log('1. ✅ Add admin role: Run make_system_admin_simple.sql in SQL Editor');
  }

  if (roleList?.includes('admin') && !roleList?.includes('system_admin')) {
    console.log('2. ✅ Consider adding system_admin role for consistency');
  }

  if (edgeSuccess === false) {
    console.log('3. ✅ Redeploy Edge Function in Supabase Dashboard');
    console.log('4. ✅ Check Edge Function logs in Supabase Dashboard');
  }

  if (frontendIsSystemAdmin && !isAdminWithId) {
    console.log('5. 🔍 Investigate user ID mismatch between frontend and Edge Function');
  }
}

// Run all diagnostics
async function runDiagnostics() {
  console.log('🧪 Starting comprehensive admin diagnostics...\n');

  const user = await checkAuth();
  if (!user) return;

  const frontendRoles = await checkFrontendRoles(user);
  const adminFunction = await testAdminFunction(user);
  const edgeFunction = await testEdgeFunction(user);
  const database = await checkDatabaseConsistency(user);

  const results = {
    user,
    frontendRoles,
    adminFunction,
    edgeFunction,
    database
  };

  analyzeResults(results);

  console.log('\n🎉 Diagnostics complete!');
  console.log('📋 Share the output above if you need help interpreting the results');

  // Make results available globally for further inspection
  window.diagnosticResults = results;
}

// Auto-run diagnostics
runDiagnostics().catch(console.error);

// Export for manual running
window.runAdminDiagnostics = runDiagnostics;


