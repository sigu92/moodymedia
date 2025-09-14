/**
 * Customer Metadata Synchronization Utilities
 * 
 * Handles synchronization of customer data and metadata between
 * the application database and Stripe customer records.
 */

import { supabase } from '@/integrations/supabase/client';
import { customerManager } from '@/utils/customerUtils';

export interface CustomerSyncData {
  userId: string;
  email: string;
  name?: string;
  companyName?: string;
  phone?: string;
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

    // Update customer in Stripe (in production, this would call Stripe API)
    // For now, we'll just update local data and track changes
    const updateResult = await customerManager.update(userId, {
      email: customerData.email,
      name: customerData.name,
      metadata
    });

    if (!updateResult.success) {
      result.errors.push(updateResult.error || 'Failed to update customer');
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

    // Process each customer
    for (const profile of profiles) {
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
