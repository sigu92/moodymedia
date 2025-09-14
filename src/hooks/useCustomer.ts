import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  customerManager, 
  CustomerProfile, 
  PaymentMethod, 
  StripeCustomerData 
} from '@/utils/customerUtils';
import { toast } from '@/hooks/use-toast';

export interface UseCustomerReturn {
  // Customer data
  profile: CustomerProfile | null;
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;

  // Customer operations
  createCustomer: (email: string, name?: string) => Promise<boolean>;
  updateCustomer: (updates: { email?: string; name?: string; metadata?: Record<string, string> }) => Promise<boolean>;
  syncCustomer: () => Promise<boolean>;

  // Payment method operations
  setDefaultPaymentMethod: (paymentMethodId: string) => Promise<boolean>;
  removePaymentMethod: (paymentMethodId: string) => Promise<boolean>;
  refreshPaymentMethods: () => Promise<void>;

  // Helper functions
  hasStripeCustomer: boolean;
  isStripeCustomer: (customerId?: string) => boolean;
  getDefaultPaymentMethod: () => PaymentMethod | null;
}

export const useCustomer = (): UseCustomerReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Query keys
  const customerProfileKey = ['customer', 'profile', user?.id];
  const paymentMethodsKey = ['customer', 'paymentMethods', user?.id];

  // Fetch customer profile
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError
  } = useQuery({
    queryKey: customerProfileKey,
    queryFn: async () => {
      if (!user?.id) return null;
      
      const result = await customerManager.getProfile(user.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch customer profile');
      }
      return result.profile || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch payment methods
  const {
    data: paymentMethods,
    isLoading: paymentMethodsLoading,
    error: paymentMethodsError
  } = useQuery({
    queryKey: paymentMethodsKey,
    queryFn: async () => {
      if (!user?.id) return [];
      
      const result = await customerManager.getPaymentMethods(user.id);
      if (!result.success) {
        console.warn('Failed to fetch payment methods:', result.error);
        return [];
      }
      return result.paymentMethods || [];
    },
    enabled: !!user?.id && !!profile?.stripe_customer_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  // Combined loading state
  const isLoading = profileLoading || paymentMethodsLoading;

  // Set error state
  useEffect(() => {
    if (profileError) {
      setError(profileError.message);
    } else if (paymentMethodsError) {
      setError(paymentMethodsError.message);
    } else {
      setError(null);
    }
  }, [profileError, paymentMethodsError]);

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async ({ email, name }: { email: string; name?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const result = await customerManager.getOrCreate(user.id, email, name);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create customer');
      }
      return result;
    },
    onSuccess: (data) => {
      // Invalidate and refetch customer profile
      queryClient.invalidateQueries({ queryKey: customerProfileKey });
      
      if (data.isNewCustomer) {
        toast({
          title: "Customer Created",
          description: "Your Stripe customer account has been set up successfully.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Customer Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (updates: { email?: string; name?: string; metadata?: Record<string, string> }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const result = await customerManager.update(user.id, updates);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update customer');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerProfileKey });
      toast({
        title: "Customer Updated",
        description: "Your customer information has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Sync customer mutation
  const syncCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const result = await customerManager.sync(user.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync customer data');
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customerProfileKey });
      queryClient.invalidateQueries({ queryKey: paymentMethodsKey });
      
      if (data.changes && data.changes.length > 0) {
        toast({
          title: "Customer Synced",
          description: `Updated: ${data.changes.join(', ')}`,
        });
      } else {
        toast({
          title: "Customer Synced",
          description: "Customer data is up to date.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Set default payment method mutation
  const setDefaultPaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const result = await customerManager.setDefaultPaymentMethod(user.id, paymentMethodId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to set default payment method');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerProfileKey });
      queryClient.invalidateQueries({ queryKey: paymentMethodsKey });
      toast({
        title: "Default Payment Method Set",
        description: "Your default payment method has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Remove payment method mutation
  const removePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const result = await customerManager.removePaymentMethod(user.id, paymentMethodId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove payment method');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerProfileKey });
      queryClient.invalidateQueries({ queryKey: paymentMethodsKey });
      toast({
        title: "Payment Method Removed",
        description: "The payment method has been removed from your account.",
      });
    },
    onError: (error) => {
      toast({
        title: "Removal Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Callback functions
  const createCustomer = useCallback(
    async (email: string, name?: string): Promise<boolean> => {
      try {
        await createCustomerMutation.mutateAsync({ email, name });
        return true;
      } catch (error) {
        return false;
      }
    },
    [createCustomerMutation]
  );

  const updateCustomer = useCallback(
    async (updates: { email?: string; name?: string; metadata?: Record<string, string> }): Promise<boolean> => {
      try {
        await updateCustomerMutation.mutateAsync(updates);
        return true;
      } catch (error) {
        return false;
      }
    },
    [updateCustomerMutation]
  );

  const syncCustomer = useCallback(
    async (): Promise<boolean> => {
      try {
        await syncCustomerMutation.mutateAsync();
        return true;
      } catch (error) {
        return false;
      }
    },
    [syncCustomerMutation]
  );

  const setDefaultPaymentMethod = useCallback(
    async (paymentMethodId: string): Promise<boolean> => {
      try {
        await setDefaultPaymentMethodMutation.mutateAsync(paymentMethodId);
        return true;
      } catch (error) {
        return false;
      }
    },
    [setDefaultPaymentMethodMutation]
  );

  const removePaymentMethod = useCallback(
    async (paymentMethodId: string): Promise<boolean> => {
      try {
        await removePaymentMethodMutation.mutateAsync(paymentMethodId);
        return true;
      } catch (error) {
        return false;
      }
    },
    [removePaymentMethodMutation]
  );

  const refreshPaymentMethods = useCallback(
    async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: paymentMethodsKey });
    },
    [queryClient, paymentMethodsKey]
  );

  // Helper functions
  const hasStripeCustomer = !!profile?.stripe_customer_id;

  const isStripeCustomer = useCallback(
    (customerId?: string): boolean => {
      if (customerId) {
        return profile?.stripe_customer_id === customerId;
      }
      return hasStripeCustomer;
    },
    [profile?.stripe_customer_id, hasStripeCustomer]
  );

  const getDefaultPaymentMethod = useCallback(
    (): PaymentMethod | null => {
      if (!profile?.stripe_default_payment_method_id || !paymentMethods?.length) {
        return null;
      }
      
      return paymentMethods.find(
        pm => pm.id === profile.stripe_default_payment_method_id
      ) || null;
    },
    [profile?.stripe_default_payment_method_id, paymentMethods]
  );

  return {
    // Data
    profile: profile || null,
    paymentMethods: paymentMethods || [],
    isLoading,
    error,

    // Operations
    createCustomer,
    updateCustomer,
    syncCustomer,
    setDefaultPaymentMethod,
    removePaymentMethod,
    refreshPaymentMethods,

    // Helpers
    hasStripeCustomer,
    isStripeCustomer,
    getDefaultPaymentMethod,
  };
};
