# Settings System

This directory contains the organization settings system that enforces completion before certain features work.

## Components

### `useSettings.ts` Hook
- `useSettingsStatus()`: Loads settings and completion status
- `isSettingsComplete(settings)`: Validates if all required fields are present
- `getSettings(userId)`: Fetches settings for a user
- `updateSettings(userId, payload)`: Updates or creates settings

### `CompletionGuard` Component
Guards features requiring complete settings. Usage:

```tsx
import { CompletionGuard } from '@/components/settings/CompletionGuard';

// Show banner when incomplete
<CompletionGuard showBanner={true}>
  <YourComponent />
</CompletionGuard>

// Block action when incomplete
<CompletionGuard blockAction={true} actionLabel="place orders">
  <Button>Checkout</Button>
</CompletionGuard>
```

### `GlobalSettingsWarning` Component
Shows a global warning banner when settings are incomplete. Already integrated in the main App layout.

## Integration Points

The completion guards are integrated into:

1. **Notifications page**: Shows banner when settings incomplete
2. **Cart/Checkout flow**: Blocks checkout with modal
3. **Orders flow**: Shows completion banner
4. **Global warning**: Top-level warning across all pages

## Required Settings Fields

All fields must be present and valid:
- `name` (2-100 characters)
- `company_name` (2-150 characters) 
- `primary_email` (valid email)
- `notification_email` (valid email)
- `orders_email` (valid email)

## Database Schema

The `org_settings` table stores settings with RLS policies ensuring users can only access their own data.

## Usage Pattern

1. Check `useSettingsStatus()` to get completion status
2. Use `CompletionGuard` to wrap components that need protection
3. Use guards with `showBanner` for informational flows
4. Use guards with `blockAction` for critical actions
5. Implement pre-flight checks in action handlers

Example pre-flight check:
```tsx
const handleCriticalAction = () => {
  if (!isComplete) {
    // Show modal or redirect to settings
    return;
  }
  // Proceed with action
};
```