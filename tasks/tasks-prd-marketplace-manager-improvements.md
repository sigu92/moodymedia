## Relevant Files

- `src/components/admin/MarketplaceManager.tsx` - Main admin interface component with user grouping logic and summary cards
- `src/components/admin/PendingApprovalsTab.tsx` - Current approval table that needs margin display and bulk operations
- `src/components/admin/UserSummaryCard.tsx` - New component for user submission summary cards (integrated into MarketplaceManager for now)
- `src/components/admin/MarginControls.tsx` - New component for margin calculation buttons
- `src/components/admin/BulkActionsBar.tsx` - Fixed-position bulk actions bar with margin application
- `src/components/admin/BulkMarginSummary.tsx` - Margin summary component for bulk operations
- `src/components/admin/ProfitMarginDisplay.tsx` - Component for displaying profit margins with color coding and tooltips
- `src/hooks/useMarginCalculations.ts` - Utility hook for margin calculations
- `src/hooks/useBulkOperations.ts` - Hook for managing bulk approval operations with audit logging
- `src/hooks/useAuditLogger.ts` - Hook for logging margin operations and approvals
- `src/components/admin/BulkOperationErrorBoundary.tsx` - Error boundary for bulk operations
- `src/utils/marginUtils.ts` - Utility functions for margin calculations, validation, and predefined margin options
- `src/types/margin.ts` - TypeScript interfaces for margin operations

## Importer System Fixes (Completed)
- ✅ Fixed critical `.single()` bug causing import failures
- ✅ Implemented robust CSV parser handling quoted fields
- ✅ Enhanced Google Sheets URL validation
- ✅ Added proper error handling for database operations

### Notes

- Unit tests should be created alongside new components following existing patterns
- RLS policies will need comprehensive testing to ensure proper access control
- Edge functions should include proper error handling and validation
- Leverage existing `price` and `purchase_price` fields in database
- Follow existing component patterns from `PendingApprovalsTab.tsx`

## Tasks

- [x] 1.0 User Grouping & Summary View
  - [x] 1.1 Create database query to group pending submissions by user with counts
  - [x] 1.2 Build UserSummaryCard component showing "User Name: X websites pending"
  - [x] 1.3 Add user filtering logic to MarketplaceManager component
  - [x] 1.4 Implement click-to-filter functionality for user cards
  - [x] 1.5 Add bulk selection toggle for all submissions from a user
  - [x] 1.6 Update MarketplaceManager layout to show user cards above table

- [x] 2.0 Quick Margin Operations Infrastructure
  - [x] 2.1 Create marginUtils.ts with calculation functions for fixed amounts and percentages
  - [x] 2.2 Build MarginControls component with €100, €200, €300 buttons
  - [x] 2.3 Add percentage buttons (100%, 200%, 300%, 400%, 500%) to MarginControls
  - [x] 2.4 Implement custom margin input field with validation
  - [x] 2.5 Create useMarginCalculations hook for state management
  - [x] 2.6 Add margin preview functionality showing calculated marketplace prices
  - [x] 2.7 Implement margin validation (prevent negative prices, excessive margins)

- [x] 3.0 Profit Margin Display
  - [x] 3.1 Create ProfitMarginDisplay component with color-coded margin indicators
  - [x] 3.2 Add profit margin column to PendingApprovalsTab table
  - [x] 3.3 Implement margin calculation: "Cost: €X | Price: €Y | Profit: €Z (ZZ%)"
  - [x] 3.4 Add color coding: green (>20%), yellow (5-20%), red (<5% or loss)
  - [x] 3.5 Update table headers to include margin information
  - [x] 3.6 Add bulk margin calculations for selected submissions

- [x] 4.0 Bulk Approval Workflow
  - [x] 4.1 Extend multi-select checkbox system in PendingApprovalsTab
  - [x] 4.2 Create BulkActionsBar component with fixed positioning
  - [x] 4.3 Implement "Apply Margin to Selection" functionality
  - [x] 4.4 Add bulk approval button with confirmation dialog
  - [x] 4.5 Create confirmation dialog showing bulk operation summary
  - [x] 4.6 Implement progress feedback for bulk operations
  - [x] 4.7 Add bulk operation error handling and rollback capability
  - [x] 4.8 Create useBulkOperations hook for state management

- [x] 5.0 Single Website Integration
  - [x] 5.1 Update individual approval modal to include MarginControls component
  - [x] 5.2 Ensure single website approval uses same margin calculation logic
  - [x] 5.3 Add "Apply & Approve" quick action button for single submissions
  - [x] 5.4 Test margin tools consistency between bulk and single operations
  - [x] 5.5 Update approval modal layout to accommodate margin controls

- [x] 6.0 Data Integrity & Audit
  - [x] 6.1 Add comprehensive validation rules for margin operations
  - [x] 6.2 Implement audit logging for all margin changes and bulk operations
  - [x] 6.3 Create rollback functionality for bulk operations within time window
  - [x] 6.4 Add real-time data refresh after bulk operations complete
  - [x] 6.5 Implement proper error boundaries for bulk operations
  - [x] 6.6 Add operation progress tracking and user feedback
