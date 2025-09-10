import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface OrgSettings {
  id?: string;
  user_id?: string;
  name: string;
  company_name: string;
  primary_email: string;
  notification_email: string;
  orders_email: string;
  created_at?: string;
  updated_at?: string;
}

export interface SettingsStatus {
  settings: OrgSettings | null;
  isComplete: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Validates if all required settings fields are present and valid
 */
export const isSettingsComplete = (settings: OrgSettings | null): boolean => {
  if (!settings) return false;
  
  const requiredFields = ['name', 'company_name', 'primary_email', 'notification_email', 'orders_email'];
  
  // Check all required fields are present and not empty
  for (const field of requiredFields) {
    const value = settings[field as keyof OrgSettings];
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return false;
    }
  }
  
  // Basic email validation for email fields
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const emailFields = ['primary_email', 'notification_email', 'orders_email'];
  
  for (const field of emailFields) {
    const email = settings[field as keyof OrgSettings] as string;
    if (!emailRegex.test(email)) {
      return false;
    }
  }
  
  // Check name length constraints
  if (settings.name.length < 2 || settings.name.length > 100) {
    return false;
  }
  
  // Check company name length constraints
  if (settings.company_name.length < 2 || settings.company_name.length > 150) {
    return false;
  }
  
  return true;
};

/**
 * Hook for managing organization settings status and data
 */
export const useSettingsStatus = (): SettingsStatus => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('org_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        throw error;
      }

      console.log('Settings fetched:', data);
      console.log('Settings complete:', isSettingsComplete(data));
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const refresh = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isComplete: isSettingsComplete(settings),
    loading,
    refresh,
  };
};

/**
 * Utility functions for settings management
 */
export const getSettings = async (userId: string): Promise<OrgSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('org_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getSettings:', error);
    return null;
  }
};

export const updateSettings = async (userId: string, payload: Partial<OrgSettings>): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if settings exist
    const existing = await getSettings(userId);
    
    if (existing) {
      // Update existing settings
      const { error } = await supabase
        .from('org_settings')
        .update(payload)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating settings:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new settings - ensure all required fields are present
      const settingsData = {
        user_id: userId,
        name: payload.name || '',
        company_name: payload.company_name || '',
        primary_email: payload.primary_email || '',
        notification_email: payload.notification_email || '',
        orders_email: payload.orders_email || '',
        ...payload,
      };
      
      const { error } = await supabase
        .from('org_settings')
        .insert(settingsData);

      if (error) {
        console.error('Error creating settings:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateSettings:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};