
## Relevant Files

- `supabase/migrations/20250912000000_add_purchase_price_column.sql` - Database migration to add purchase_price column to media_outlets table
- `supabase/migrations/20250912000001_add_status_enum_column.sql` - Database migration to add status enum column with approval workflow states
- `supabase/migrations/20250912000002_add_submission_tracking_columns.sql` - Database migration to add submission tracking columns (submitted_by, submitted_at, reviewed_by, reviewed_at, review_notes)
- `supabase/migrations/20250912000003_add_performance_indexes.sql` - Database migration to add performance indexes on status and timestamp columns
- `supabase/functions/publisher-submit/index.ts` - Edge function for handling publisher website submissions with pending status
- `supabase/functions/admin-approve/index.ts` - Edge function for admin approval/rejection workflow with audit logging
- `src/types/index.ts` - TypeScript interfaces for new fields and status types
- `src/components/publisher/CreateSiteModal.tsx` - Publisher submission interface updates
- `src/components/admin/MarketplaceManager.tsx` - New admin approval interface (to be created)
- `src/pages/AdminSystem.tsx` - Add MarketplaceManager to admin navigation
- `src/pages/publisher/Dashboard.tsx` - Update publisher dashboard with submission status
- `supabase/functions/admin-approve/index.ts` - New edge function for approvals
- `src/integrations/supabase/types.ts` - Update generated types for new schema
- `src/components/publisher/SubmissionHistory.tsx` - New component for tracking submissions with enhanced status messaging
- `src/components/admin/MarketplaceManager.tsx` - New marketplace manager admin interface with tabbed layout
- `src/components/admin/PendingApprovalsTab.tsx` - Comprehensive pending approvals interface with grid/list views, filtering, and approval workflow
- `src/components/admin/EnhancedImport.tsx` - Admin import component updated to handle status field mapping
- `supabase/functions/admin-import-batch/index.ts` - Updated to set appropriate status and tracking fields for admin-imported sites
- `src/components/admin/ProfitAnalyticsTab.tsx` - Profit margin analytics

### Notes

- Unit tests should be created alongside new components following existing patterns
- RLS policies will need comprehensive testing to ensure proper access control
- Edge functions should include proper error handling and validation
- Status enum values: 'pending', 'approved', 'rejected', 'active'

## Tasks

- [x] 1.0 Database Schema Migration
  - [x] 1.1 Create database migration to add purchase_price column (numeric, nullable) to media_outlets table
  - [x] 1.2 Create database migration to add status column with enum ('pending', 'approved', 'rejected', 'active') to media_outlets table, defaulting existing records to 'active'
  - [x] 1.3 Create database migration to add submission tracking columns: submitted_by (UUID), submitted_at (timestamp), reviewed_by (UUID, nullable), reviewed_at (timestamp, nullable), review_notes (text, nullable)
  - [x] 1.4 Create database migration to add performance indexes on status, submitted_at, and reviewed_at columns
  - [x] 1.5 Update TypeScript interfaces in src/types/index.ts to include new fields and status types
  - [x] 1.6 Regenerate Supabase types to reflect schema changes in src/integrations/supabase/types.ts

- [x] 2.0 Backend Infrastructure Setup
  - [x] 2.1 Create publisher-submit edge function to handle website submissions with pending status
  - [x] 2.2 Create admin-approve edge function to handle approval/rejection workflow with audit logging
  - [x] 2.3 Update RLS policies for media_outlets to allow publishers to see their own submissions (all statuses) and buyers to only see approved/active listings
  - [x] 2.4 Update RLS policies to allow system admins full access to all submissions for review and modification
  - [x] 2.5 Update marketplace queries throughout the app to filter by status='active' for buyer-facing views
  - [x] 2.6 Add audit logging integration for all approval decisions and status changes

- [x] 3.0 Publisher Submission System
  - [x] 3.1 Modify CreateSiteModal to include purchase_price input field (only for non-moody sites)
  - [x] 3.2 Update CreateSiteModal to show submission confirmation dialog explaining the approval process
  - [x] 3.3 Modify CreateSiteModal submission logic to set status='pending' and populate submission tracking fields
  - [x] 3.4 Create SubmissionHistory component to display publisher's submission status and admin feedback
  - [x] 3.5 Update publisher dashboard to include SubmissionHistory component and pending submission indicators
  - [x] 3.6 Add status badges and progress indicators to publisher interface showing submission workflow

- [x] 4.0 Marketplace Manager Admin Interface
  - [x] 4.1 Create MarketplaceManager component with tabbed interface (Pending Approvals, Approved Listings, Rejected Submissions, Profit Analytics)
  - [x] 4.2 Implement PendingApprovalsTab with grid/list view of pending submissions showing key metrics and pricing
  - [x] 4.3 Create detailed review modal/interface for individual submissions with full metrics, pricing, and profit calculations
  - [x] 4.4 Implement approval workflow allowing admins to set marketplace price, add review notes, and approve/reject submissions
  - [x] 4.5 Add bulk approval actions for processing multiple submissions efficiently
  - [ ] 4.6 Create ProfitAnalyticsTab showing profit margins, pricing trends, and analytics across approved listings
  - [x] 4.7 Add filtering and search functionality for pending submissions by domain, category, price range, etc.
  - [x] 4.8 Update AdminSystem navigation to include MarketplaceManager link in sidebar

- [x] 5.0 Integration and Status Updates
  - [x] 5.1 Update all marketplace queries and components to respect status filtering (only show active listings to buyers)
  - [x] 5.2 Update EnhancedImport component to handle new status field and admin_tags logic for company-owned sites
  - [x] 5.3 Update publisher components to show appropriate messaging based on submission status
  - [x] 5.4 Add status transition logic to handle approved submissions becoming active listings
  - [x] 5.5 Update any existing admin bulk operations to work with new approval workflow
  - [x] 5.6 Add status validation and error handling throughout the submission and approval flows
