/**
 * Customer Metadata Synchronization Utilities
 * 
 * Handles synchronization of customer data and metadata between
 * the application database and Stripe customer records.
 */

import { supabase } from '@/integrations/supabase/client';
import { customerManager } from '@/utils/customerUtils';

// Type for Stripe customer updates
interface StripeCustomerUpdates {
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

/**
 * Helper function for Stripe update operations with retry logic
 */
const updateStripeWithRetry = async (
  customerId: string,
  updates: StripeCustomerUpdates,
  maxRetries = 3
): Promise<{ success: boolean; error?: string }> => {
  let lastError: string = '';

  for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
    try {
      const { data: result, error } = await supabase.functions.invoke('update-customer-stripe', {
        body: {
          customer_id: customerId,
          updates
        }
      });

      if (!error) {
        console.log('Stripe update succeeded', retryCount > 0 ? `(on retry ${retryCount})` : '');
        return { success: true };
      }

      lastError = error.message || 'Unknown Stripe update error';
      console.error(`Stripe update attempt ${retryCount + 1} failed:`, lastError);

    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Stripe update attempt ${retryCount + 1} failed:`, lastError);
    }

    // Don't wait after the last attempt
    if (retryCount < maxRetries - 1) {
      const delay = Math.pow(2, retryCount + 1) * 1000; // Exponential backoff
      console.log(`Retrying Stripe update in ${delay}ms (attempt ${retryCount + 2}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error('Stripe update failed after all retries');
  return { success: false, error: lastError };
};

export interface CustomerSyncData {
  userId: string;
  email: string;
  name?: string;
  companyName?: string;
  phone?: string;
  stripeCustomerId?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  preferences?: {
    currency?: string;
    language?: string;
    timezone?: string;
  };
  lastOrderDate?: string;
  totalOrders?: number;
  totalSpent?: number;
}

export interface SyncResult {
  success: boolean;
  changes: string[];
  errors: string[];
  stripeUpdated?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Collects customer data from various sources in the application
 */
export const collectCustomerData = async (userId: string): Promise<CustomerSyncData | null> => {
  try {
    // Get user auth data
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser.user) {
      console.error('Error getting auth user:', authError);
      return null;
    }

    // Verify that the provided userId matches the authenticated user's id
    if (authUser.user.id !== userId) {
      console.error('Unauthorized: userId does not match authenticated user');
      return null;
    }

    // Get organization settings
    const { data: orgSettings, error: orgError } = await supabase
      .from('org_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get order statistics
    const { data: orderStats, error: orderStatsError } = await supabase
      .from('orders')
      .select('created_at, price, currency')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false });

    // Compile customer data
    const customerData: CustomerSyncData = {
      userId,
      email: authUser.user.email || '',
      name: orgSettings?.name || authUser.user.user_metadata?.name,
      companyName: orgSettings?.company_name,
      phone: authUser.user.phone,
      stripeCustomerId: profile?.stripe_customer_id, // Add Stripe customer ID from profile
      preferences: {
        currency: 'EUR', // Default currency
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    // Add order statistics
    if (orderStats && orderStats.length > 0) {
      customerData.lastOrderDate = orderStats[0].created_at;
      customerData.totalOrders = orderStats.length;
      customerData.totalSpent = orderStats.reduce((sum, order) => sum + (order.price || 0), 0);
    }

    return customerData;

  } catch (error) {
    console.error('Error collecting customer data:', error);
    return null;
  }
};

/**
 * Generates Stripe-compatible metadata from customer data
 */
export const generateStripeMetadata = (customerData: CustomerSyncData): Record<string, string> => {
  const metadata: Record<string, string> = {
    user_id: customerData.userId,
    app_version: '1.0',
    sync_timestamp: new Date().toISOString(),
  };

  // Add optional fields if they exist
  if (customerData.companyName) {
    metadata.company_name = customerData.companyName;
  }

  if (customerData.phone) {
    metadata.phone = customerData.phone;
  }

  if (customerData.preferences?.currency) {
    metadata.preferred_currency = customerData.preferences.currency;
  }

  if (customerData.preferences?.language) {
    metadata.preferred_language = customerData.preferences.language;
  }

  if (customerData.totalOrders !== undefined) {
    metadata.total_orders = customerData.totalOrders.toString();
  }

  if (customerData.totalSpent !== undefined) {
    metadata.total_spent = customerData.totalSpent.toString();
  }

  if (customerData.lastOrderDate) {
    metadata.last_order_date = customerData.lastOrderDate;
  }

  return metadata;
};

/**
 * Synchronizes customer metadata with Stripe
 */
export const syncCustomerMetadata = async (userId: string): Promise<SyncResult> => {
  const result: SyncResult = {
    success: false,
    changes: [],
    errors: []
  };

  try {
    // Get customer profile to check if Stripe customer exists
    const profileResult = await customerManager.getProfile(userId);
    if (!profileResult.success || !profileResult.profile?.stripe_customer_id) {
      result.errors.push('No Stripe customer found for this user');
      return result;
    }

    // Collect current customer data
    const customerData = await collectCustomerData(userId);
    if (!customerData) {
      result.errors.push('Failed to collect customer data');
      return result;
    }

    // Generate metadata
    const metadata = generateStripeMetadata(customerData);
    result.metadata = metadata;

    // Update customer in Stripe via Edge Function
    try {
      if (!customerData.stripeCustomerId) {
        console.log('Skipping Stripe update - no customer ID found');
        result.errors.push('No Stripe customer ID found - skipping Stripe update');
        result.stripeUpdated = false;
      } else {
        const { data: stripeResult, error: stripeError } = await supabase.functions.invoke('update-customer-stripe', {
        body: {
          customer_id: customerData.stripeCustomerId,
          updates: {
            email: customerData.email,
            name: customerData.name,
            metadata
          }
        }
      });

        if (stripeError) {
          throw new Error(`Stripe update failed: ${stripeError.message}`);
        }

        result.stripeUpdated = true;
      }

      // Update local data regardless of Stripe update status
      const updateResult = await customerManager.update(userId, {
        email: customerData.email,
        name: customerData.name,
        metadata
      });
    } catch (stripeError) {
      console.error('Stripe customer update failed:', stripeError);

      // Use the extracted retry helper function (only if we have a customer ID)
      if (customerData.stripeCustomerId) {
        const stripeResult = await updateStripeWithRetry(
          customerData.stripeCustomerId,
          {
            email: customerData.email,
            name: customerData.name,
            metadata
          },
          3 // maxRetries
        );

        if (stripeResult.success) {
          result.stripeUpdated = true;
        } else {
          // Fallback to local update only and track failure
          result.errors.push(`Stripe update failed after retries: ${stripeResult.error}`);
          result.stripeUpdated = false;
        }
      } else {
        result.stripeUpdated = false;
      }

      // Update local data regardless of Stripe status
      const updateResult = await customerManager.update(userId, {
        email: customerData.email,
        name: customerData.name,
        metadata,
        stripeUpdateFailed: !result.stripeUpdated
      });

      if (!updateResult.success) {
        result.errors.push(updateResult.error || 'Failed to update customer');
        return result;
      }
    } catch (localUpdateError) {
      console.error('Error updating local customer data:', localUpdateError);
      result.errors.push('Failed to update local customer data');
      return result;
    }

    // Track changes made
    result.changes.push('Customer metadata updated');
    result.changes.push(`Email: ${customerData.email}`);
    
    if (customerData.name) {
      result.changes.push(`Name: ${customerData.name}`);
    }
    
    if (customerData.companyName) {
      result.changes.push(`Company: ${customerData.companyName}`);
    }

    if (customerData.totalOrders !== undefined) {
      result.changes.push(`Total orders: ${customerData.totalOrders}`);
    }

    result.success = true;

  } catch (error) {
    console.error('Error syncing customer metadata:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
};

/**
 * Syncs customer data for all users (admin function)
 */
export const syncAllCustomers = async (): Promise<{
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}> => {
  const report = {
    success: false,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    // Get all profiles with Stripe customer IDs
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, stripe_customer_id')
      .not('stripe_customer_id', 'is', null);

    if (profilesError) {
      report.errors.push(`Failed to fetch profiles: ${profilesError.message}`);
      return report;
    }

    if (!profiles || profiles.length === 0) {
      report.success = true;
      return report;
    }

    // Process customers in batches with concurrency control
    const batchSize = 10; // Process 10 customers at a time
    const concurrencyLimit = 5; // Allow 5 concurrent operations
    const batches = [];

    // Split profiles into batches
    for (let i = 0; i < profiles.length; i += batchSize) {
      batches.push(profiles.slice(i, i + batchSize));
    }

    console.log(`Processing ${profiles.length} customers in ${batches.length} batches of ${batchSize}`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} customers)`);

      // Process batch items concurrently with rate limiting
      const batchPromises = batch.map(async (profile) => {
        report.processed++;

        try {
          const syncResult = await syncCustomerMetadata(profile.user_id);

          if (syncResult.success) {
            report.successful++;
          } else {
            report.failed++;
            report.errors.push(`User ${profile.user_id}: ${syncResult.errors.join(', ')}`);
          }
        } catch (error) {
          report.failed++;
          report.errors.push(`User ${profile.user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      // Wait for current batch to complete before starting next batch
      await Promise.all(batchPromises);

      // Add delay between batches to prevent API rate limiting
      if (batchIndex < batches.length - 1) {
        const batchDelay = 2000; // 2 second delay between batches
        console.log(`Waiting ${batchDelay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    report.success = true;

  } catch (error) {
    console.error('Error syncing all customers:', error);
    report.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return report;
};

/**
 * Validates customer data for consistency
 */
export const validateCustomerData = async (userId: string): Promise<{
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}> => {
  const validation = {
    isValid: true,
    issues: [] as string[],
    suggestions: [] as string[]
  };

  try {
    const customerData = await collectCustomerData(userId);
    if (!customerData) {
      validation.isValid = false;
      validation.issues.push('Could not collect customer data');
      return validation;
    }

    // Check email
    if (!customerData.email) {
      validation.isValid = false;
      validation.issues.push('Customer email is missing');
    } else if (!customerData.email.includes('@')) {
      validation.isValid = false;
      validation.issues.push('Customer email format is invalid');
    }

    // Check name
    if (!customerData.name || customerData.name.trim().length < 2) {
      validation.suggestions.push('Consider adding a customer name for better personalization');
    }

    // Check company information
    if (!customerData.companyName) {
      validation.suggestions.push('Company name can help with invoicing and support');
    }

    // Check order history
    if (!customerData.totalOrders || customerData.totalOrders === 0) {
      validation.suggestions.push('Customer has no order history');
    }

    // Check preferences
    if (!customerData.preferences?.currency) {
      validation.suggestions.push('Currency preference not set');
    }

  } catch (error) {
    validation.isValid = false;
    validation.issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return validation;
};

/**
 * Customer synchronization utilities interface
 */
export const customerSync = {
  // Data collection
  collectData: collectCustomerData,
  generateMetadata: generateStripeMetadata,

  // Synchronization
  syncMetadata: syncCustomerMetadata,
  syncAll: syncAllCustomers,

  // Validation
  validate: validateCustomerData,

  // Batch operations
  bulkSync: async (userIds: string[]) => {
    const results = [];
    
    for (const userId of userIds) {
      const result = await syncCustomerMetadata(userId);
      results.push({ userId, ...result });
    }
    
    return results;
  }
};

// Make customer sync available globally in development
if (import.meta.env.DEV) {
  (window as any).customerSync = customerSync;
  console.log('🔧 Customer sync available globally as: window.customerSync');
  console.log('📚 Usage examples:');
  console.log('  - customerSync.syncMetadata(userId) - Sync specific customer');
  console.log('  - customerSync.syncAll() - Sync all customers (admin)');
  console.log('  - customerSync.validate(userId) - Validate customer data');
}
