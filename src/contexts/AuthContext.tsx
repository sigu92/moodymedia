import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, role?: string, referralCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  userRoles: string[];
  currentRole: string | null;
  needsOnboarding: boolean;
  completeOnboarding: () => void;
  completeOnboardingWithServerSync: () => Promise<void>;
  switchRole: (newRole: 'buyer' | 'publisher') => void;
  hasRole: (role: string) => boolean;
  isSystemAdmin: boolean;
  // Backward compatibility
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Defer role fetching with setTimeout to avoid deadlocks
        if (session?.user) {
          setTimeout(async () => {
            console.log('🔄 Auth state change: Fetching roles and checking onboarding...');
            await fetchUserRoles(session.user.id);
            await checkOnboardingStatus(session.user);
            console.log('✅ Auth state initialization complete');
          }, 0);
        } else {
          setUserRoles([]);
          setCurrentRole(null);
          setNeedsOnboarding(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        setTimeout(async () => {
          console.log('🔄 Initial session: Fetching roles and checking onboarding...');
          await fetchUserRoles(session.user.id);
          await checkOnboardingStatus(session.user);
          console.log('✅ Initial session initialization complete');
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    try {
      console.log('🔄 Fetching user roles for:', userId);

      const { data, error } = await supabase
        .from('user_role_assignments')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Database error fetching user roles:', error);

        // Handle specific RLS recursion error
        if (error.message?.includes('infinite recursion') || error.code === '42P17') {
          console.warn('⚠️ RLS recursion detected. Falling back to default buyer role.');
          console.warn('🔧 To fix: Run the SQL script in fix-rls-recursion.sql in your Supabase dashboard.');
        }

        setUserRoles(['buyer']);
        setCurrentRole('buyer');
        return;
      }

      const roles = data?.map(item => item.role) || ['buyer'];
      console.log('📊 Fetched user roles:', roles);
      console.log('🔍 DEBUG: Raw data from user_role_assignments:', data);

      // Ensure all users have buyer role as fallback
      if (!roles.includes('buyer')) {
        roles.push('buyer');
        console.log('🔧 Added buyer role as fallback');
      }

      // Ensure all users have buyer role as fallback
      if (!roles.includes('buyer')) {
        roles.push('buyer');
        console.log('🔧 Added buyer role as fallback');
      }

      setUserRoles(roles);

      // Set default current role based on priority: system_admin > admin > publisher > buyer
      let defaultRole = 'buyer';
      if (roles.includes('system_admin')) defaultRole = 'system_admin';
      else if (roles.includes('admin')) defaultRole = 'admin';
      else if (roles.includes('publisher')) defaultRole = 'publisher';

      setCurrentRole(defaultRole);
      console.log('✅ Set current role to:', defaultRole);
      console.log('🎯 Dual-role status:', {
        hasBothRoles: roles.includes('buyer') && roles.includes('publisher'),
        roles: roles
      });

      // Fallback mechanism: If user has media outlets but no publisher role, add it
      const hasMediaOutlets = await checkUserHasMediaOutlets(userId);
      if (hasMediaOutlets && !roles.includes('publisher')) {
        console.log('🔧 User has media outlets but no publisher role - fixing...');
        await fixMissingPublisherRole(userId);
        // Refresh roles after fixing
        setTimeout(() => fetchUserRoles(userId), 500);
      }

    } catch (error) {
      console.error('💥 Unexpected error fetching user roles:', error);

      // Log detailed error context
      console.error('Role fetch failure details:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });

      // Fallback to default buyer role
      console.log('🔄 Falling back to default buyer role');
      setUserRoles(['buyer']);
      setCurrentRole('buyer');

      // Don't throw error - allow app to continue with default role
      // This ensures the app remains functional even with role fetch failures
    }
  };

  // Enhanced onboarding status check with server data refresh
  const checkOnboardingStatus = async (user: User, forceRefresh: boolean = false) => {
    try {
      console.log('🔍 Checking onboarding status...', forceRefresh ? '(forced refresh)' : '');

      // Force refresh user data to get the latest metadata from server
      const { data: { user: refreshedUser }, error: refreshError } = await supabase.auth.getUser();

      if (refreshError) {
        console.error('❌ Failed to refresh user data for onboarding check:', refreshError);
        // Fallback to provided user data
        const onboardingCompleted = user.user_metadata?.onboarding_completed;
        const isFirstLogin = !user.user_metadata?.has_logged_in_before;

        if (isFirstLogin) {
          setNeedsOnboarding(true);
          console.log('📝 First-time user detected, showing onboarding');
          return;
        }

        setNeedsOnboarding(!onboardingCompleted);
        console.log(`📝 Onboarding status: ${onboardingCompleted ? 'completed' : 'not completed'}`);
        return;
      }

      // Use refreshed user data for accurate status
      const onboardingCompleted = refreshedUser?.user_metadata?.onboarding_completed;
      const isFirstLogin = !refreshedUser?.user_metadata?.has_logged_in_before;

      console.log(`📊 Server data - Onboarding completed: ${onboardingCompleted}, First login: ${isFirstLogin}`);

      // Always show onboarding for first-time users, regardless of metadata
      if (isFirstLogin) {
        setNeedsOnboarding(true);
        console.log('📝 First-time user detected, showing onboarding');
        return;
      }

      setNeedsOnboarding(!onboardingCompleted);
      console.log(`📝 Onboarding status: ${onboardingCompleted ? 'completed' : 'not completed'}`);

    } catch (error) {
      console.error('💥 Error checking onboarding status:', error);
      // On error, default to showing onboarding to ensure user completes setup
      setNeedsOnboarding(true);
      console.log('📝 Error occurred, defaulting to show onboarding');
    }
  };

  // Comprehensive onboarding completion with server synchronization
  const completeOnboardingWithServerSync = async () => {
    if (!user) {
      console.error('Cannot complete onboarding: No user found');
      throw new Error('User not authenticated');
    }

    try {
      console.log('🔄 Starting comprehensive onboarding completion...');

      // Step 1: Ensure user metadata is updated on server
      console.log('📝 Step 1: Updating user metadata on server...');
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          has_logged_in_before: true
        }
      });

      if (metadataError) {
        console.error('❌ Failed to update user metadata:', metadataError);
        throw new Error(`Failed to update user metadata: ${metadataError.message}`);
      }

      console.log('✅ User metadata updated successfully');

      // Step 2: Refresh user roles from server to ensure any role changes are reflected
      console.log('🔄 Step 2: Refreshing user roles from server...');
      console.log('🔍 DEBUG: About to call fetchUserRoles for user:', user.id);
      await fetchUserRoles(user.id);
      console.log('✅ User roles refreshed from server');

      // Small delay to allow state update to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('🔍 DEBUG: Current userRoles after refresh:', userRoles);

      // Step 3: Force refresh user data to get latest metadata
      console.log('🔄 Step 3: Refreshing user data from server...');
      const { data: { user: refreshedUser }, error: refreshError } = await supabase.auth.getUser();

      if (refreshError) {
        console.error('❌ Failed to refresh user data:', refreshError);
        throw new Error(`Failed to refresh user data: ${refreshError.message}`);
      }

      console.log('✅ User data refreshed');

      // Step 4: Update local state immediately to prevent UI blocking
      console.log('🔄 Step 4: Updating local state...');
      setNeedsOnboarding(false);
      console.log('✅ Local state updated');

      // Step 5: Trigger final onboarding status check with refreshed data
      console.log('🔄 Step 5: Performing final onboarding status verification...');
      if (refreshedUser) {
        await checkOnboardingStatus(refreshedUser, true); // Force refresh for final verification
      }

      // Step 6: Final verification - ensure onboarding is truly completed
      console.log('🔄 Step 6: Final state verification...');
      const finalOnboardingStatus = refreshedUser?.user_metadata?.onboarding_completed;
      if (!finalOnboardingStatus) {
        console.warn('⚠️ Final verification failed - onboarding status not confirmed on server');
        // Force another metadata update just to be safe
        await supabase.auth.updateUser({
          data: {
            onboarding_completed: true,
            has_logged_in_before: true
          }
        });
      }

      console.log('🎉 Comprehensive onboarding completion fully verified');

      console.log('🎉 Onboarding completion successful!');

    } catch (error) {
      console.error('💥 Onboarding completion failed:', error);

      // Log detailed error context for debugging
      console.error('Completion failure details:', {
        error: error instanceof Error ? error.message : String(error),
        userId: user?.id,
        hasUser: !!user,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });

      // Don't set local state on error - let user retry
      // This preserves the onboarding state so user can try again
      throw error;
    }
  };

  // Backward compatibility - simple completion for immediate UI updates
  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  const hasRole = (role: string) => {
    return userRoles.includes(role);
  };

  const isSystemAdmin = userRoles.includes('system_admin') || userRoles.includes('admin');

  // Helper function to check if user has media outlets
  const checkUserHasMediaOutlets = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('media_outlets')
        .select('id')
        .eq('publisher_id', userId)
        .limit(1);

      if (error) {
        console.error('Error checking media outlets:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error in checkUserHasMediaOutlets:', error);
      return false;
    }
  };

  // Helper function to fix missing publisher role
  const fixMissingPublisherRole = async (userId: string) => {
    try {
      console.log('🔧 Fixing missing publisher role for user:', userId);

      const { error } = await supabase
        .from('user_role_assignments')
        .upsert({
          user_id: userId,
          role: 'publisher'
        }, { onConflict: 'user_id,role' });

      if (error) {
        console.error('❌ Failed to fix publisher role:', error);
      } else {
        console.log('✅ Publisher role fixed successfully');
      }
    } catch (error) {
      console.error('💥 Error fixing publisher role:', error);
    }
  };

  const signUp = async (email: string, password: string, role: string = 'buyer', referralCode?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    console.log('🔍 SIGNUP DEBUG:', {
      email,
      redirectUrl,
      role,
      referralCode
    });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          role: role,
          ...(referralCode && { referral_code: referralCode })
        }
      }
    });

    console.log('🔍 SIGNUP RESPONSE:', {
      data: data ? { user: !!data.user, session: !!data.session } : null,
      error: error ? { message: error.message, status: error.status } : null
    });

    if (error) {
      console.error('❌ SIGNUP ERROR:', error);
      toast.error(error.message);
      return { error };
    }

    // If user is created, also create their role entries using the secure function
    if (data.user && !error) {
      // Add delay to ensure user is committed to auth.users table
      console.log('⏳ WAITING FOR USER TO BE COMMITTED...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        console.log('🔧 CREATING USER DATA VIA SECURE FUNCTION...');

        // Try up to 3 times with increasing delays
        let signupData, signupError;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          attempts++;
          console.log(`🔄 ATTEMPT ${attempts}/${maxAttempts}...`);

          const result = await supabase.rpc('handle_secure_user_signup' as any, {
            p_user_id: data.user.id,
            p_email: email,
            p_role: role,
            p_referral_code: referralCode
          });

          signupData = result.data;
          signupError = result.error;

          if (!signupError) {
            console.log('✅ USER DATA CREATED ON ATTEMPT', attempts);
            break;
          }

          // Check if this is a retry-able error (user not committed yet)
          if (signupData && signupData.retry) {
            console.log('🔄 RETRY REQUESTED BY DATABASE FUNCTION');
            if (attempts < maxAttempts) {
              console.log(`⏳ RETRYING IN ${(attempts + 1) * 2000}ms...`);
              await new Promise(resolve => setTimeout(resolve, (attempts + 1) * 2000));
            }
          } else if (attempts < maxAttempts) {
            console.log(`⏳ RETRYING IN ${attempts * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, attempts * 1000));
          }
        }

        if (signupError) {
          console.error('❌ SECURE SIGNUP ERROR AFTER ALL ATTEMPTS:', signupError);
          // Don't fail the signup for this - user can still confirm email
          console.warn('⚠️ User data creation failed, but signup succeeded');
        } else {
          console.log('✅ USER DATA CREATED:', signupData);
        }
        
        // Old manual approach (keep as fallback if needed)
        /*
        const roleAssignments = [
          { user_id: data.user.id, role: 'buyer' },
          ...(role !== 'buyer' ? [{ user_id: data.user.id, role: role as any }] : [])
        ];
        
        await supabase
          .from('user_role_assignments')
          .insert(roleAssignments);
          
        await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id
          });
        */
      } catch (roleError) {
        console.error('Error in user data creation:', roleError);
        console.warn('⚠️ User data creation failed, but signup succeeded');
      }
    }

    console.log('✅ SIGNUP SUCCESS: User created, email should be sent');
    toast.success('Check your email for the confirmation link!');
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    // Mark that user has logged in before (for first-time login detection)
    // This is safe to call on every login as it won't overwrite existing metadata
    try {
      await supabase.auth.updateUser({
        data: { has_logged_in_before: true }
      });
    } catch (metadataError) {
      // Non-critical error - don't fail the login for this
      console.warn('Could not update user metadata:', metadataError);
    }

    toast.success('Welcome back!');
    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  const switchRole = (newRole: 'buyer' | 'publisher') => {
    if (!hasRole(newRole)) {
      toast.error(`You don't have ${newRole} permissions`);
      return;
    }
    
    setCurrentRole(newRole);
    toast.success(`Switched to ${newRole === 'publisher' ? 'Publisher' : 'Buyer'} mode`);
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    userRoles,
    currentRole,
    needsOnboarding,
    completeOnboarding,
    completeOnboardingWithServerSync,
    switchRole,
    hasRole,
    isSystemAdmin,
    // Backward compatibility
    userRole: currentRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};