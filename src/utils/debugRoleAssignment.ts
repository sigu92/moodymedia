// Debug utility for role assignment issues
// This can be run in browser console to debug role assignment problems

import { supabase } from '@/integrations/supabase/client';

export const debugRoleAssignment = async (userId?: string) => {
  console.log('🔍 Debugging Role Assignment...');

  if (!userId) {
    console.log('⚠️ Please provide a userId');
    return;
  }

  try {
    // 1. Check user_role_assignments table
    console.log('📋 Checking user_role_assignments...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_role_assignments')
      .select('*')
      .eq('user_id', userId);

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError);
      return;
    }

    console.log('📊 Current roles in database:', roles);

    // 2. Check if user has both buyer and publisher roles
    const hasBuyer = roles?.some(r => r.role === 'buyer');
    const hasPublisher = roles?.some(r => r.role === 'publisher');

    console.log('🔍 Role analysis:');
    console.log('  - Has buyer role:', hasBuyer);
    console.log('  - Has publisher role:', hasPublisher);
    console.log('  - Dual role user:', hasBuyer && hasPublisher);

    // 3. If missing publisher role, try to add it
    if (hasBuyer && !hasPublisher) {
      console.log('🔧 Attempting to add publisher role...');

      const { data: addResult, error: addError } = await supabase.rpc('add_publisher_role', {
        p_user_id: userId
      });

      if (addError) {
        console.error('❌ Failed to add publisher role:', addError);
      } else {
        console.log('✅ Publisher role added:', addResult);
      }
    }

    // 4. Check profiles table
    console.log('📋 Checking profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
    } else {
      console.log('👤 Profile data:', profile);
    }

    // 5. Check media_outlets table
    console.log('📋 Checking media_outlets table...');
    const { data: outlets, error: outletsError } = await supabase
      .from('media_outlets')
      .select('*')
      .eq('publisher_id', userId);

    if (outletsError) {
      console.error('❌ Error fetching media outlets:', outletsError);
    } else {
      console.log('🏢 Media outlets:', outlets);
    }

  } catch (error) {
    console.error('💥 Debug error:', error);
  }
};

// Manual fix for dual-role users
export const fixDualRoleUser = async (userId: string) => {
  console.log('🔧 Attempting to fix dual-role user...');

  try {
    // Ensure buyer role exists
    await supabase
      .from('user_role_assignments')
      .upsert({
        user_id: userId,
        role: 'buyer'
      }, { onConflict: 'user_id,role' });

    // Add publisher role
    const { data: result, error } = await supabase.rpc('add_publisher_role', {
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Failed to add publisher role:', error);
    } else {
      console.log('✅ Publisher role added:', result);
    }

    // Refresh the page to reload roles
    console.log('🔄 Refreshing page to reload roles...');
    window.location.reload();

  } catch (error) {
    console.error('💥 Fix error:', error);
  }
};

// Export for browser console
if (typeof window !== 'undefined') {
  (window as { debugRoleAssignment?: typeof debugRoleAssignment }).debugRoleAssignment = debugRoleAssignment;
  (window as { fixDualRoleUser?: typeof fixDualRoleUser }).fixDualRoleUser = fixDualRoleUser;
}
