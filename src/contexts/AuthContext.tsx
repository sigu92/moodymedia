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
          setTimeout(() => {
            fetchUserRoles(session.user.id);
            checkOnboardingStatus(session.user);
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
        setTimeout(() => {
          fetchUserRoles(session.user.id);
          checkOnboardingStatus(session.user);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_role_assignments')
        .select('role')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching user roles:', error);
        setUserRoles(['buyer']);
        setCurrentRole('buyer');
        return;
      }
      
      const roles = data?.map(item => item.role) || ['buyer'];
      setUserRoles(roles);
      
      // Set default current role based on priority: system_admin > admin > publisher > buyer
      let defaultRole = 'buyer';
      if (roles.includes('system_admin')) defaultRole = 'system_admin';
      else if (roles.includes('admin')) defaultRole = 'admin';
      else if (roles.includes('publisher')) defaultRole = 'publisher';
      
      setCurrentRole(defaultRole);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles(['buyer']);
      setCurrentRole('buyer');
    }
  };

  const checkOnboardingStatus = (user: User) => {
    const onboardingCompleted = user.user_metadata?.onboarding_completed;
    setNeedsOnboarding(!onboardingCompleted);
  };

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  const hasRole = (role: string) => {
    return userRoles.includes(role);
  };

  const isSystemAdmin = userRoles.includes('system_admin') || userRoles.includes('admin');

  const signUp = async (email: string, password: string, role: string = 'buyer', referralCode?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
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

    if (error) {
      toast.error(error.message);
      return { error };
    }

    // If user is created, also create their role entries
    if (data.user && !error) {
      try {
        // Create role assignments (buyer by default, plus any specified role)
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
      } catch (roleError) {
        console.error('Error creating user role/profile:', roleError);
      }
    }

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
    switchRole,
    hasRole,
    isSystemAdmin,
    // Backward compatibility
    userRole: currentRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};