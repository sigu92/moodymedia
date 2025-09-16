import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { PAYMENT_METHODS, getPaymentMethodById, validatePaymentMethodForOrder } from '@/data/paymentMethods';
import { getCurrencyForCountry } from '@/utils/currencyUtils';

export interface PaymentPreferences {
  id?: string;
  user_id: string;
  default_payment_method: string;
  preferred_currency: string;
  save_payment_methods: boolean;
  auto_save_billing: boolean;
  payment_methods_order: string[]; // Order of preference
  excluded_payment_methods: string[]; // Methods to hide
  created_at?: string;
  updated_at?: string;
}

export interface SavedPaymentMethod {
  id: string;
  type: string;
  last4?: string;
  brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
  created_at: string;
}

export interface PaymentPreferencesStatus {
  preferences: PaymentPreferences | null;
  savedMethods: SavedPaymentMethod[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  savePreferences: (preferences: Partial<PaymentPreferences>) => Promise<boolean>;
  loadPreferences: () => Promise<void>;
  getAvailablePaymentMethods: (countryCode: string, amount: number) => string[];
  getRecommendedPaymentMethod: (countryCode: string, amount: number) => string | null;
  addSavedPaymentMethod: (method: Omit<SavedPaymentMethod, 'id' | 'created_at'>) => Promise<boolean>;
  removeSavedPaymentMethod: (methodId: string) => Promise<boolean>;
  setDefaultPaymentMethod: (methodId: string) => Promise<boolean>;
}

export const usePaymentPreferences = (): PaymentPreferencesStatus => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<PaymentPreferences | null>(null);
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load payment preferences from user metadata
  const loadPreferences = useCallback(async () => {
    if (!user?.id) {
      setPreferences(null);
      setSavedMethods([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get user metadata
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData?.user_metadata) {
        // Set default preferences
        const defaultPreferences: PaymentPreferences = {
          id: `payment_prefs_${user.id}`,
          user_id: user.id,
          default_payment_method: 'stripe',
          preferred_currency: getCurrencyForCountry('SE'),
          save_payment_methods: true,
          auto_save_billing: true,
          payment_methods_order: ['stripe', 'fortnox', 'paypal', 'bank-transfer', 'crypto'],
          excluded_payment_methods: [],
        };
        setPreferences(defaultPreferences);
        setSavedMethods([]);
        return;
      }

      const metadata = userData.user_metadata;
      
      // Load payment preferences
      const paymentPreferences: PaymentPreferences = {
        id: `payment_prefs_${user.id}`,
        user_id: user.id,
        default_payment_method: metadata.default_payment_method || 'stripe',
        preferred_currency: metadata.preferred_currency || getCurrencyForCountry(metadata.billing_address_country || 'SE'),
        save_payment_methods: metadata.save_payment_methods !== false,
        auto_save_billing: metadata.auto_save_billing !== false,
        payment_methods_order: metadata.payment_methods_order || ['stripe', 'fortnox', 'paypal', 'bank-transfer', 'crypto'],
        excluded_payment_methods: metadata.excluded_payment_methods || [],
      };

      setPreferences(paymentPreferences);

      // Load saved payment methods (this would typically come from a separate table)
      // For now, we'll simulate this with metadata
      const savedMethodsData: SavedPaymentMethod[] = metadata.saved_payment_methods || [];
      setSavedMethods(savedMethodsData);

    } catch (err) {
      console.error('Error loading payment preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment preferences');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Save payment preferences to user metadata
  const savePreferences = useCallback(async (newPreferences: Partial<PaymentPreferences>): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Prepare metadata update
      const metadataUpdate: Record<string, any> = {};

      if (newPreferences.default_payment_method !== undefined) {
        metadataUpdate.default_payment_method = newPreferences.default_payment_method;
      }
      if (newPreferences.preferred_currency !== undefined) {
        metadataUpdate.preferred_currency = newPreferences.preferred_currency;
      }
      if (newPreferences.save_payment_methods !== undefined) {
        metadataUpdate.save_payment_methods = newPreferences.save_payment_methods;
      }
      if (newPreferences.auto_save_billing !== undefined) {
        metadataUpdate.auto_save_billing = newPreferences.auto_save_billing;
      }
      if (newPreferences.payment_methods_order !== undefined) {
        metadataUpdate.payment_methods_order = newPreferences.payment_methods_order;
      }
      if (newPreferences.excluded_payment_methods !== undefined) {
        metadataUpdate.excluded_payment_methods = newPreferences.excluded_payment_methods;
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: metadataUpdate,
      });

      if (updateError) throw updateError;

      // Update local state
      setPreferences(prev => ({
        ...prev,
        ...newPreferences,
        user_id: user.id,
        id: prev?.id || `payment_prefs_${user.id}`,
      }));

      toast({
        title: "Success",
        description: "Payment preferences saved successfully",
      });

      return true;
    } catch (err) {
      console.error('Error saving payment preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to save payment preferences');
      toast({
        title: "Error",
        description: "Failed to save payment preferences",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id]);

  // Get available payment methods for a country and amount
  const getAvailablePaymentMethods = useCallback((countryCode: string, amount: number): string[] => {
    if (!preferences) return [];

    const currency = getCurrencyForCountry(countryCode);
    const availableMethods = PAYMENT_METHODS.filter(method => {
      // Check if method is available
      if (!method.available) return false;
      
      // Check if method is excluded by user preferences
      if (preferences.excluded_payment_methods.includes(method.id)) return false;
      
      // Check if method supports the country and amount
      const validation = validatePaymentMethodForOrder(method.id, amount, currency, countryCode);
      return validation.valid;
    });

    // Sort by user's preferred order
    const sortedMethods = availableMethods.sort((a, b) => {
      const aIndex = preferences.payment_methods_order.indexOf(a.id);
      const bIndex = preferences.payment_methods_order.indexOf(b.id);
      
      // If both are in the order, sort by order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one is in the order, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // If neither is in the order, maintain original order
      return 0;
    });

    return sortedMethods.map(method => method.id);
  }, [preferences]);

  // Get recommended payment method for a country and amount
  const getRecommendedPaymentMethod = useCallback((countryCode: string, amount: number): string | null => {
    const availableMethods = getAvailablePaymentMethods(countryCode, amount);
    
    if (availableMethods.length === 0) return null;
    
    // First, try user's default payment method
    if (preferences?.default_payment_method && availableMethods.includes(preferences.default_payment_method)) {
      return preferences.default_payment_method;
    }
    
    // Then, try the first available method in user's preferred order
    return availableMethods[0];
  }, [preferences, getAvailablePaymentMethods]);

  // Add a saved payment method
  const addSavedPaymentMethod = useCallback(async (method: Omit<SavedPaymentMethod, 'id' | 'created_at'>): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    try {
      const newMethod: SavedPaymentMethod = {
        ...method,
        id: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      };

      // Update saved methods in metadata
      const updatedMethods = [...savedMethods, newMethod];
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          saved_payment_methods: updatedMethods,
        },
      });

      if (updateError) throw updateError;

      setSavedMethods(updatedMethods);
      return true;
    } catch (err) {
      console.error('Error adding saved payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to add saved payment method');
      return false;
    }
  }, [user?.id, savedMethods]);

  // Remove a saved payment method
  const removeSavedPaymentMethod = useCallback(async (methodId: string): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    try {
      const updatedMethods = savedMethods.filter(method => method.id !== methodId);
      
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          saved_payment_methods: updatedMethods,
        },
      });

      if (updateError) throw updateError;

      setSavedMethods(updatedMethods);
      return true;
    } catch (err) {
      console.error('Error removing saved payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove saved payment method');
      return false;
    }
  }, [user?.id, savedMethods]);

  // Set default payment method
  const setDefaultPaymentMethod = useCallback(async (methodId: string): Promise<boolean> => {
    return await savePreferences({ default_payment_method: methodId });
  }, [savePreferences]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    savedMethods,
    isLoading,
    isSaving,
    error,
    savePreferences,
    loadPreferences,
    getAvailablePaymentMethods,
    getRecommendedPaymentMethod,
    addSavedPaymentMethod,
    removeSavedPaymentMethod,
    setDefaultPaymentMethod,
  };
};
