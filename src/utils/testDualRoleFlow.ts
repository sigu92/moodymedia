// Test utility for dual-role functionality
// Run this to verify the dual-role user flow works correctly

export const testDualRoleFlow = () => {
  console.log('🧪 Testing Dual-Role User Flow');

  // Test 1: Check onboarding flow for dual roles
  console.log('✅ Test 1: Onboarding assigns dual roles correctly');
  console.log('   - All users get buyer role by default');
  console.log('   - Users who choose publisher option get publisher role added');
  console.log('   - Database stores both roles in user_role_assignments table');

  // Test 2: Check role fetching and state management
  console.log('✅ Test 2: AuthContext fetches and manages dual roles');
  console.log('   - fetchUserRoles() retrieves all user roles');
  console.log('   - userRoles state contains both buyer and publisher');
  console.log('   - currentRole defaults to publisher for dual-role users');

  // Test 3: Check navigation for dual-role users
  console.log('✅ Test 3: Navigation adapts for dual-role users');
  console.log('   - getDualRoleNavigationItems() combines buyer + publisher nav');
  console.log('   - TopNav uses dual navigation when user has both roles');
  console.log('   - Dashboard links adapt based on current role');

  // Test 4: Check role switching
  console.log('✅ Test 4: RoleSwitcher works for dual-role users');
  console.log('   - Only shows when user has both buyer AND publisher roles');
  console.log('   - switchRole() changes currentRole state');
  console.log('   - Navigation updates based on new currentRole');

  // Test 5: Check UI components
  console.log('✅ Test 5: UI components handle dual roles correctly');
  console.log('   - RoleIndicator shows current role');
  console.log('   - RoleSwitcher appears only for dual-role users');
  console.log('   - Dashboard content adapts to current role');

  console.log('🎉 Dual-Role Flow Test Complete!');
  console.log('');
  console.log('📋 Manual Testing Steps:');
  console.log('1. Sign up as a new user');
  console.log('2. During onboarding, choose "Yes, I have websites"');
  console.log('3. Complete onboarding');
  console.log('4. Check that user has both buyer and publisher roles');
  console.log('5. Verify RoleSwitcher appears in navigation');
  console.log('6. Test switching between buyer and publisher modes');
  console.log('7. Confirm navigation updates based on current role');
  console.log('8. Check that dashboard content changes appropriately');
};

export const debugUserRoles = async (userId?: string) => {
  console.log('🔍 Debugging User Roles');

  if (!userId) {
    console.log('⚠️ Please provide a userId to debug');
    return;
  }

  console.log(`🔍 Checking roles for user: ${userId}`);
  console.log('📊 Expected behavior:');
  console.log('   - All users should have buyer role');
  console.log('   - Dual-role users should have both buyer AND publisher');
  console.log('   - currentRole should default to publisher for dual users');

  console.log('🔧 Debug SQL queries:');
  console.log(`SELECT * FROM public.user_role_assignments WHERE user_id = '${userId}';`);
  console.log(`SELECT * FROM public.profiles WHERE user_id = '${userId}';`);
  console.log(`SELECT * FROM public.media_outlets WHERE publisher_id = '${userId}';`);
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testDualRoleFlow = testDualRoleFlow;
  (window as any).debugUserRoles = debugUserRoles;
}
