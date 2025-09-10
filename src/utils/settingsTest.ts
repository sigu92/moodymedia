/**
 * Simple utility functions to test settings completion logic
 * Use these in browser console for quick debugging
 */

import { isSettingsComplete, type OrgSettings } from '@/hooks/useSettings';

export const testSettingsCompletion = () => {
  // Test empty settings
  console.log('Empty settings:', isSettingsComplete(null)); // Should be false
  
  // Test incomplete settings
  const incomplete: Partial<OrgSettings> = {
    name: 'John Doe',
    company_name: '', // Missing
    primary_email: 'john@example.com',
    notification_email: 'notifications@example.com',
    orders_email: 'orders@example.com',
  };
  console.log('Incomplete settings:', isSettingsComplete(incomplete as OrgSettings)); // Should be false
  
  // Test invalid email
  const invalidEmail: OrgSettings = {
    name: 'John Doe',
    company_name: 'ACME Corp',
    primary_email: 'invalid-email', // Invalid
    notification_email: 'notifications@example.com',
    orders_email: 'orders@example.com',
  };
  console.log('Invalid email:', isSettingsComplete(invalidEmail)); // Should be false
  
  // Test complete valid settings
  const complete: OrgSettings = {
    name: 'John Doe',
    company_name: 'ACME Corp',
    primary_email: 'john@example.com',
    notification_email: 'notifications@example.com',
    orders_email: 'orders@example.com',
  };
  console.log('Complete settings:', isSettingsComplete(complete)); // Should be true
  
  // Test edge cases
  const tooShortName: OrgSettings = {
    ...complete,
    name: 'J', // Too short
  };
  console.log('Too short name:', isSettingsComplete(tooShortName)); // Should be false
  
  const tooLongName: OrgSettings = {
    ...complete,
    name: 'A'.repeat(101), // Too long
  };
  console.log('Too long name:', isSettingsComplete(tooLongName)); // Should be false
  
  console.log('Settings completion tests completed!');
};

// For debugging in browser console:
// window.testSettingsCompletion = testSettingsCompletion;