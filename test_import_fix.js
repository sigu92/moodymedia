// Comprehensive Import System Test
// Run this in browser console on the import page

console.log('🚀 COMPREHENSIVE IMPORT SYSTEM TEST');
console.log('=====================================');

// Test 1: Authentication
async function testAuth() {
  console.log('\n🔐 TEST 1: Authentication Check');

  try {
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    if (userError) throw userError;

    console.log('✅ User authenticated:', user?.email);

    // Check user roles
    const { data: roles, error: rolesError } = await window.supabase
      .from('user_role_assignments')
      .select('role')
      .eq('user_id', user?.id);

    if (rolesError) throw rolesError;

    console.log('✅ User roles:', roles?.map(r => r.role));

    const isSystemAdmin = roles?.some(r => r.role === 'system_admin');
    console.log('✅ Is System Admin:', isSystemAdmin);

    return { user, roles, isSystemAdmin };
  } catch (error) {
    console.error('❌ Auth test failed:', error);
    return null;
  }
}

// Test 2: Admin Function
async function testAdminFunction(user) {
  console.log('\n👑 TEST 2: Admin Function Check');

  try {
    const { data: isAdmin, error } = await window.supabase
      .rpc('is_platform_admin', { _user_id: user.id });

    if (error) throw error;

    console.log('✅ Admin function result:', isAdmin);
    return isAdmin;
  } catch (error) {
    console.error('❌ Admin function test failed:', error);
    return false;
  }
}

// Test 3: Edge Function Basic Connectivity
async function testEdgeFunctionConnectivity() {
  console.log('\n🌐 TEST 3: Edge Function Connectivity');

  try {
    // Test OPTIONS request (CORS)
    const corsResponse = await fetch('/functions/v1/admin-import-batch', { method: 'OPTIONS' });
    console.log('✅ CORS check:', corsResponse.status);

    // Test with minimal valid data
    const testData = {
      source: 'csv',
      data: [{ domain: 'test.com', price: '100' }],
      mapping: { domain: 0, price: 1 },
      dry_run: true,
      admin_tags: []
    };

    console.log('📤 Sending test request:', testData);

    const { data, error } = await window.supabase.functions.invoke('admin-import-batch', {
      body: testData
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      return { success: false, error };
    }

    console.log('✅ Edge Function response:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Edge Function connectivity test failed:', error);
    return { success: false, error };
  }
}

// Test 4: Database Schema Check
async function testDatabaseSchema() {
  console.log('\n💾 TEST 4: Database Schema Check');

  try {
    // Check admin_tags column
    const { data: columns, error: schemaError } = await window.supabase
      .rpc('execute_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'media_outlets'
          AND column_name IN ('admin_tags', 'source')
        `
      });

    if (schemaError) {
      console.log('⚠️ Could not check schema via RPC, trying direct query');

      // Try direct query (may fail due to RLS)
      const { data: testData, error: directError } = await window.supabase
        .from('media_outlets')
        .select('admin_tags, source')
        .limit(1);

      if (directError) {
        console.log('⚠️ Direct schema check failed (expected due to RLS):', directError.message);
      } else {
        console.log('✅ Database accessible, found columns');
      }
    } else {
      console.log('✅ Schema check:', columns);
    }

    return true;
  } catch (error) {
    console.error('❌ Database schema test failed:', error);
    return false;
  }
}

// Test 5: Large Dataset Simulation
async function testLargeDatasetHandling(user, isAdmin) {
  console.log('\n📊 TEST 5: Large Dataset Handling');

  if (!isAdmin) {
    console.log('⚠️ Skipping large dataset test - user is not admin');
    return false;
  }

  try {
    // Create a larger test dataset (100 rows)
    const largeData = [];
    for (let i = 0; i < 100; i++) {
      largeData.push({
        domain: `test-site-${i}.com`,
        price: (Math.random() * 1000 + 50).toFixed(2)
      });
    }

    const testData = {
      source: 'csv',
      data: largeData,
      mapping: { domain: 0, price: 1 },
      dry_run: true, // Use dry run for testing
      admin_tags: ['test']
    };

    console.log(`📤 Testing with ${largeData.length} rows (dry run)...`);

    const startTime = Date.now();
    const { data, error } = await window.supabase.functions.invoke('admin-import-batch', {
      body: testData
    });
    const endTime = Date.now();

    if (error) {
      console.error('❌ Large dataset test failed:', error);
      return false;
    }

    const duration = endTime - startTime;
    console.log(`✅ Large dataset test successful in ${duration}ms`);
    console.log('📊 Results:', {
      total: data.summary.total_rows,
      succeeded: data.summary.succeeded,
      failed: data.summary.failed,
      success_rate: data.summary.success_rate
    });

    return true;
  } catch (error) {
    console.error('❌ Large dataset test failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Starting comprehensive import system tests...\n');

  const authResult = await testAuth();
  if (!authResult) {
    console.log('❌ Cannot continue without authentication');
    return;
  }

  const { user, isSystemAdmin } = authResult;
  const adminCheck = await testAdminFunction(user);

  if (!isSystemAdmin || !adminCheck) {
    console.log('❌ User is not a system admin - import tests will fail');
    console.log('💡 Make sure you are logged in as a system admin user');
    return;
  }

  await testEdgeFunctionConnectivity();
  await testDatabaseSchema();
  await testLargeDatasetHandling(user, adminCheck);

  console.log('\n🎉 All tests completed!');
  console.log('📋 If any tests failed, check the error messages above');
  console.log('🔧 Common fixes:');
  console.log('   - Deploy the updated Edge Function');
  console.log('   - Ensure user has system_admin role');
  console.log('   - Check database schema and RLS policies');
}

// Auto-run tests
runAllTests().catch(console.error);

// Export for manual running
window.testImportSystem = runAllTests;


