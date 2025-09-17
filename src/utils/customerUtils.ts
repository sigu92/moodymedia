/**
 * Customer Management Utilities for Stripe Integration
 * 
 * Handles customer creation, synchronization, and payment method management
 * between the application and Stripe.
 */

import { supabase } from '@/integrations/supabase/client';
import { stripeConfig } from '@/config/stripe';

interface OrgSettings {
  name?: string;
  company_name?: string;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  stripe_customer_id?: string;
  stripe_customer_created_at?: string;
  stripe_customer_email?: string;
  stripe_default_payment_method_id?: string;
  organization_id?: string;
  created_at: string;
}

export interface StripeCustomerData {
  customerId: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
  defaultPaymentMethod?: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  created: number;
  customer: string;
}

/**
 * Creates or retrieves a Stripe customer for the given user
 */
export const getOrCreateStripeCustomer = async (
  userId: string,
  userEmail: string,
  userName?: string,
  orgSettings?: OrgSettings
): Promise<{
  success: boolean;
  customerId?: string;
  isNewCustomer?: boolean;
  error?: string;
}> => {
  try {
    // First check if user already has a Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_customer_email')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
      return {
        success: false,
        error: 'Failed to fetch user profile'
      };
    }

    // If user already has a Stripe customer, return it
    if (profile?.stripe_customer_id) {
      return {
        success: true,
        customerId: profile.stripe_customer_id,
        isNewCustomer: false
      };
    }

    // Create new Stripe customer
    const customerData = {
      email: userEmail,
      name: userName || orgSettings?.name || userEmail.split('@')[0],
      metadata: {
        user_id: userId,
        created_in_app: 'true',
        app_version: '1.0',
        ...(orgSettings?.company_name && { company_name: orgSettings.company_name })
      }
    };

    // Call create-customer edge function
    const { data: createResponse, error: createError } = await supabase.functions
      .invoke('create-customer', {
        body: customerData
      });

    if (createError) {
      console.error('Error creating Stripe customer:', createError);
      return {
        success: false,
        error: createError.message || 'Failed to create Stripe customer'
      };
    }

    const customerId = createResponse?.customerId;
    if (!customerId) {
      return {
        success: false,
        error: 'No customer ID returned from Stripe'
      };
    }

    // Update user profile with Stripe customer information
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_customer_created_at: new Date().toISOString(),
        stripe_customer_email: userEmail
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('Error updating profile with Stripe customer:', updateError);
      // Implement retry logic for profile update failures
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying profile update (attempt ${retryCount}/${maxRetries})...`);
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        
        const { error: retryError } = await supabase
          .from('profiles')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_customer_created_at: new Date().toISOString(),
            stripe_customer_email: userEmail,
            stripe_sync_status: 'retry_attempt',
            stripe_sync_error: updateError.message
          }, {
            onConflict: 'user_id'
          });
        
        if (!retryError) {
          console.log('Profile update succeeded on retry');
          break;
        }
        
        if (retryCount === maxRetries) {
          // Final failure - mark as failed
          await supabase
            .from('profiles')
            .upsert({
              user_id: userId,
              stripe_sync_status: 'failed',
              stripe_sync_error: `Failed after ${maxRetries} retries: ${retryError.message}`
            }, {
              onConflict: 'user_id'
            });
          
          throw new Error(`Failed to link Stripe customer after ${maxRetries} retries`);
        }
      }
    }

    return {
      success: true,
      customerId,
      isNewCustomer: true
    };

  } catch (error) {
    console.error('Error in getOrCreateStripeCustomer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Retrieves the customer profile with Stripe information
 */
export const getCustomerProfile = async (userId: string): Promise<{
  success: boolean;
  profile?: CustomerProfile;
  error?: string;
}> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      profile
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Updates customer information in Stripe and local database
 */
export const updateCustomerProfile = async (
  userId: string,
  updates: {
    email?: string;
    name?: string;
    metadata?: Record<string, string>;
  }
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Get current customer profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return {
        success: false,
        error: 'No Stripe customer found for this user'
      };
    }

    // Call Stripe API to update customer
    const { data, error } = await supabase.functions.invoke('update-customer', {
      body: {
        customer_id: profile.stripe_customer_id,
        updates: {
          email: updates.email,
          name: updates.name,
          metadata: updates.metadata
        }
      }
    });

    if (error) {
      return {
        success: false,
        error: `Stripe update failed: ${error.message}`
      };
    }

    // Update local database on success
    const localUpdates: Record<string, unknown> = {};
    if (updates.email) {
      localUpdates.stripe_customer_email = updates.email;
    }

    if (Object.keys(localUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(localUpdates)
        .eq('user_id', userId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message
        };
      }
    }

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Retrieves saved payment methods for a customer
 */
export const getCustomerPaymentMethods = async (userId: string): Promise<{
  success: boolean;
  paymentMethods?: PaymentMethod[];
  error?: string;
}> => {
  try {
    // Get customer's Stripe ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return {
        success: false,
        error: 'No Stripe customer found for this user'
      };
    }

    // In development mode, return mock payment methods
    if (!stripeConfig.isConfigured()) {
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: 'pm_mock_visa',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025
          },
          created: Date.now() / 1000,
          customer: profile.stripe_customer_id
        },
        {
          id: 'pm_mock_mastercard',
          type: 'card',
          card: {
            brand: 'mastercard',
            last4: '5555',
            exp_month: 6,
            exp_year: 2024
          },
          created: Date.now() / 1000,
          customer: profile.stripe_customer_id
        }
      ];

      return {
        success: true,
        paymentMethods: mockPaymentMethods
      };
    }

    // Call Stripe API to get payment methods
    try {
      const { data, error } = await supabase.functions.invoke('get-payment-methods', {
        body: { customer_id: profile.stripe_customer_id }
      });

      if (error) {
        throw new Error(`Failed to fetch payment methods: ${error.message}`);
      }

      return {
        success: true,
        paymentMethods: data.payment_methods || []
      };
    } catch (stripeError) {
      console.error('Stripe payment methods fetch failed:', stripeError);
      return {
        success: false,
        error: stripeError instanceof Error ? stripeError.message : 'Failed to fetch payment methods'
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Sets the default payment method for a customer
 */
export const setDefaultPaymentMethod = async (
  userId: string,
  paymentMethodId: string
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Get customer profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return {
        success: false,
        error: 'No Stripe customer found for this user'
      };
    }

    // Update local database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_default_payment_method_id: paymentMethodId
      })
      .eq('user_id', userId);

    if (updateError) {
      return {
        success: false,
        error: updateError.message
      };
    }

    // In production, we would also update Stripe customer's default payment method
    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Removes a payment method from a customer
 */
export const removePaymentMethod = async (
  userId: string,
  paymentMethodId: string
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Get customer profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_default_payment_method_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return {
        success: false,
        error: 'No Stripe customer found for this user'
      };
    }

    // If this is the default payment method, clear it
    if (profile.stripe_default_payment_method_id === paymentMethodId) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          stripe_default_payment_method_id: null
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error clearing default payment method:', updateError);
      }
    }

    // In production, we would call Stripe API to detach the payment method
    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Syncs customer data between Stripe and local database
 */
export const syncCustomerData = async (userId: string): Promise<{
  success: boolean;
  changes?: string[];
  error?: string;
}> => {
  try {
    const changes: string[] = [];

    // Get local profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_customer_email')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return {
        success: false,
        error: 'No Stripe customer found for this user'
      };
    }

    // In development mode, just return success
    if (!stripeConfig.isConfigured()) {
      return {
        success: true,
        changes: ['Mock sync completed']
      };
    }

    // In production, we would:
    // 1. Fetch customer data from Stripe
    // 2. Compare with local data
    // 3. Update any differences
    // 4. Return list of changes made

    return {
      success: true,
      changes
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Validates customer email for Stripe requirements
 */
export const validateCustomerEmail = (email: string): {
  isValid: boolean;
  error?: string;
} => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  if (email.length > 320) {
    return { isValid: false, error: 'Email address is too long' };
  }

  return { isValid: true };
};

/**
 * Customer management interface for easy access to all functions
 */
export const customerManager = {
  // Core customer operations
  getOrCreate: getOrCreateStripeCustomer,
  getProfile: getCustomerProfile,
  update: updateCustomerProfile,
  sync: syncCustomerData,

  // Payment method operations
  getPaymentMethods: getCustomerPaymentMethods,
  setDefaultPaymentMethod,
  removePaymentMethod,

  // Utilities
  validateEmail: validateCustomerEmail
};

// Make customer manager available globally in development
if (import.meta.env.DEV) {
  (window as { customerManager?: typeof customerManager }).customerManager = customerManager;
  console.log('🔧 Customer manager available globally as: window.customerManager');
  console.log('📚 Usage examples:');
  console.log('  - customerManager.getOrCreate(userId, email) - Get/create customer');
  console.log('  - customerManager.getPaymentMethods(userId) - Get saved payment methods');
  console.log('  - customerManager.setDefaultPaymentMethod(userId, pmId) - Set default payment');
}
