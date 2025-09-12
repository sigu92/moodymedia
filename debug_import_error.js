// Debug script to test admin import locally
// Run this in browser console when on the import page

console.log('🔍 DEBUG: Admin Import Error Investigation');

// Check if user is authenticated
const { data: { user } } = await window.supabase.auth.getUser();
console.log('👤 Current user:', user?.id, user?.email);

// Check user roles
const { data: roles } = await window.supabase
  .from('user_role_assignments')
  .select('role')
  .eq('user_id', user?.id);

console.log('🎭 User roles:', roles?.map(r => r.role));

// Test admin function directly
const { data: isAdmin, error: adminError } = await window.supabase
  .rpc('is_platform_admin', { _user_id: user?.id });

console.log('🔐 Admin check result:', { isAdmin, adminError });

// Test Edge Function call directly (without data)
try {
  const testCall = await window.supabase.functions.invoke('admin-import-batch', {
    body: {
      source: 'csv',
      data: [{ domain: 'test.com', price: '100' }],
      mapping: { domain: 0, price: 1 },
      dry_run: true,
      admin_tags: ['moody']
    }
  });

  console.log('🚀 Edge Function test response:', testCall);
} catch (error) {
  console.error('❌ Edge Function test failed:', error);
}

// Check if Edge Function exists
fetch('/functions/v1/admin-import-batch', { method: 'OPTIONS' })
  .then(response => console.log('🌐 Edge Function CORS check:', response.status))
  .catch(error => console.log('🌐 Edge Function not accessible:', error));

console.log('✅ Debug script completed - check logs above for issues');


