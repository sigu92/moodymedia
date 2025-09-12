# Product Requirements Document: Marketplace Manager Improvements

## Introduction/Overview

The current Marketplace Manager system requires significant improvements to handle the growing volume of publisher submissions efficiently. Admins currently process submissions individually, which becomes overwhelming when publishers submit multiple websites. The system needs a streamlined workflow with user grouping, bulk margin operations, and clear profit visibility to improve admin efficiency and decision-making.

**Problem Statement:**
- Admins see all submissions in one unorganized table
- No way to process multiple submissions from the same user efficiently
- Margin calculations are hidden and require manual calculations
- Individual approval process is time-consuming for bulk submissions
- No quick margin adjustment tools for common scenarios

**Solution:**
Implement a user-centric approval workflow with bulk operations, quick margin buttons, and integrated profit analytics to reduce approval time by 70% and improve admin experience.

## Goals

1. **Streamline Admin Workflow:** Reduce time to process submissions by implementing user grouping and bulk operations
2. **Improve Profit Visibility:** Show profit margins clearly during approval process
3. **Add Quick Margin Tools:** Provide preset margin buttons for common profit targets
4. **Enhance User Experience:** Make it easy to process multiple submissions from the same publisher
5. **Maintain Data Integrity:** Ensure all margin calculations are accurate and auditable

## User Stories

### System Admin Stories
- **As a system admin,** I want to see submissions grouped by user so I can efficiently process all websites from one publisher at once
- **As a system admin,** I want quick margin buttons (add €100, €200, €300) so I can rapidly set marketplace prices
- **As a system admin,** I want percentage margin buttons (100%, 200%, 300%, 400%, 500%) so I can set competitive profit margins quickly
- **As a system admin,** I want to see profit margins clearly displayed in the approval table so I can make informed pricing decisions
- **As a system admin,** I want bulk approval functionality so I can approve multiple websites with the same margin settings
- **As a system admin,** I want custom margin input for specific pricing requirements
- **As a system admin,** I want the same margin tools available for single website submissions so the workflow is consistent

## Functional Requirements

### User Grouping & Summary View (FR-1)
1. **User Submission Summary Cards:** Display submissions grouped by user with format "User Name: X websites pending"
2. **Click-to-Filter:** Clicking a user card shows only their pending submissions
3. **User Information Display:** Show user email, registration date, and total submission history
4. **Bulk Selection Toggle:** Allow selecting all submissions from a user at once

### Quick Margin Operations (FR-2)
5. **Fixed Amount Buttons:** Add €100, €200, €300 buttons that increase publisher asking price by that amount
6. **Percentage Buttons:** Add 100%, 200%, 300%, 400%, 500% buttons that multiply publisher asking price
7. **Custom Margin Input:** Text field for entering specific margin amounts or percentages
8. **Margin Preview:** Show calculated marketplace price before applying

### Profit Margin Display (FR-3)
9. **Margin Column:** Display profit margin (€ and %) in approval table
10. **Color Coding:** Green for profitable (>20%), yellow for low profit (5-20%), red for loss/unprofitable
11. **Cost vs Price Display:** Show "Cost: €X | Price: €Y | Profit: €Z (ZZ%)"
12. **Bulk Margin Calculations:** Show aggregate profit when multiple submissions selected

### Bulk Approval Workflow (FR-4)
13. **Multi-Select Interface:** Checkbox system for selecting multiple submissions
14. **Apply Margin to Selection:** Apply chosen margin to all selected submissions
15. **Bulk Approval Button:** Approve all selected submissions with current margin settings
16. **Confirmation Dialog:** Show summary of changes before bulk approval
17. **Progress Feedback:** Real-time progress for bulk operations

### Single Website Integration (FR-5)
18. **Consistent Margin Tools:** Same margin buttons available in single website approval modal
19. **Unified Interface:** Single website approval uses same margin calculation logic
20. **Quick Actions:** Allow admins to apply margin and approve in one click for single submissions

### Data Integrity & Audit (FR-6)
21. **Audit Trail:** Log all margin changes and bulk operations
22. **Rollback Capability:** Allow undoing bulk operations within time window
23. **Validation Rules:** Prevent negative prices and excessive margins (>1000%)
24. **Real-time Updates:** Refresh data after bulk operations complete

## Non-Goals (Out of Scope)

1. **Dynamic Pricing Algorithms:** Manual admin pricing decisions
2. **Publisher Negotiation System:** Simple accept/reject with margin setting
3. **Automated Profit Optimization:** Manual margin decisions
4. **External Pricing APIs:** Internal margin calculations only
5. **Advanced Analytics:** Focus on approval workflow, not deep analytics

## Technical Considerations

### Database Changes
- No schema changes required (leverage existing `price` and `purchase_price` fields)
- Add audit logging table for bulk operations if needed

### Frontend Architecture
- Extend existing `PendingApprovalsTab` component
- Add user grouping logic to `MarketplaceManager`
- Create reusable margin calculation utilities
- Implement bulk operation handlers

### Performance Considerations
- Efficient user grouping queries with proper indexing
- Batch database operations for bulk approvals
- Lazy loading for large submission lists
- Real-time updates without full page refreshes

## Design Considerations

### UI/UX Requirements
- **User Cards:** Clean cards showing "John Doe (john@example.com): 5 websites pending"
- **Margin Buttons:** Prominent button group with € and % options
- **Profit Display:** Clear margin indicators with color coding
- **Bulk Actions Bar:** Fixed bottom bar when submissions selected
- **Responsive Design:** Works on tablets for mobile admin access

### Information Architecture
- **Primary View:** User summary cards
- **Secondary View:** Filtered submission table for selected user
- **Tertiary View:** Individual submission details modal
- **Navigation:** Clear breadcrumbs (All Users → User X → Submissions)

## Success Metrics

1. **Processing Speed:** Reduce average approval time from 5 minutes to 2 minutes per submission
2. **Bulk Efficiency:** 80% of multi-submission users processed via bulk operations
3. **Margin Consistency:** 90% of approvals use quick margin buttons (not custom input)
4. **Admin Satisfaction:** 4.5/5 rating for new approval workflow
5. **Error Reduction:** <1% margin calculation errors

## Open Questions

1. **Margin Calculation Base:** Should percentages be calculated from publisher asking price or estimated costs?
2. **User Card Design:** Show user avatar, registration date, or other identifying information?
3. **Bulk Operation Limits:** Maximum number of submissions that can be bulk processed at once?
4. **Margin Persistence:** Should last-used margin settings be remembered per admin?
5. **Mobile Experience:** Optimize bulk operations for tablet admin usage?

---

**Next Steps:**
1. Review and approve this PRD
2. Create detailed task breakdown for implementation
3. Begin with user grouping and summary view implementation
