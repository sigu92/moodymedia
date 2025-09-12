# Product Requirements Document: Marketplace Manager System

## Introduction/Overview

**Product Name:** Marketplace Manager System

**Problem Statement:**
The current system allows publishers to directly upload and activate websites on the marketplace without any oversight or pricing strategy. This creates several issues:
- No quality control or verification of submitted websites
- No ability to set strategic marketplace pricing based on costs
- No profit margin management or analytics
- No centralized approval workflow for new marketplace listings

**Solution Overview:**
Implement a comprehensive marketplace manager system within the system admin interface that creates an approval workflow for publisher website submissions. The system will introduce dual pricing (purchase price vs marketplace price), pending approval states, and centralized management of marketplace listings.

**Goal:**
Transform the current direct-publishing system into a managed marketplace where system administrators can review, price, and approve publisher submissions to maximize profitability and maintain quality standards.

## Goals

1. **Implement Approval Workflow:** Create a pending state for new publisher submissions requiring admin review
2. **Dual Pricing System:** Add purchase_price (cost from publisher) and maintain price (marketplace selling price)
3. **Profit Margin Management:** Enable admins to set marketplace prices based on purchase costs and market strategy
4. **Quality Control:** Give admins tools to review and verify website submissions before marketplace activation
5. **Centralized Management:** Create a unified admin interface for managing all marketplace listings and pending approvals

## User Stories

### System Admin Stories
- **As a system admin,** I want to see all pending publisher submissions so I can review them before marketplace activation
- **As a system admin,** I want to review website details, metrics, and pricing when evaluating submissions
- **As a system admin,** I want to set the marketplace price independently from the purchase price so I can control profit margins
- **As a system admin,** I want to approve or reject submissions with feedback so publishers understand decisions
- **As a system admin,** I want to see profit analytics across all marketplace listings so I can optimize pricing strategy

### Publisher Stories
- **As a publisher,** I want to submit my websites for marketplace inclusion so I can start earning from link sales
- **As a publisher,** I want to set my asking price when submitting websites so I can control my revenue expectations
- **As a publisher,** I want to receive feedback on rejected submissions so I can improve future submissions
- **As a publisher,** I want to track the status of my submissions so I know when they're approved

### Buyer Stories (No Change)
- **As a buyer,** I want to see marketplace prices that reflect fair value so I can make informed purchasing decisions

## Functional Requirements

### Database Schema Changes
1. **Add purchase_price column** to media_outlets table (numeric, nullable)
2. **Add status column** to media_outlets table (enum: 'pending', 'approved', 'rejected', 'active')
3. **Add submitted_by column** to media_outlets table (UUID, references auth.users)
4. **Add submitted_at column** to media_outlets table (timestamp)
5. **Add reviewed_by column** to media_outlets table (UUID, nullable, references auth.users)
6. **Add reviewed_at column** to media_outlets table (timestamp, nullable)
7. **Add review_notes column** to media_outlets table (text, nullable)

### Publisher Interface Changes
8. **Modify CreateSiteModal** to include purchase price field and submission workflow
9. **Add submission confirmation** showing publisher they need admin approval
10. **Update publisher dashboard** to show submission status (pending, approved, rejected)
11. **Add submission history** with status tracking and admin feedback

### System Admin Interface Changes
12. **Create MarketplaceManager component** in admin section with tabs for:
    - Pending Approvals
    - Approved Listings
    - Rejected Submissions
    - Profit Analytics
13. **Add approval workflow** allowing admins to:
    - Review submission details and metrics
    - Set marketplace price independently
    - View profit margin calculations
    - Approve or reject with feedback
14. **Add bulk approval actions** for efficient processing
15. **Add filtering and search** for pending submissions

### Backend/Edge Function Changes
16. **Update publisher-upload edge function** to handle pending status
17. **Create admin-approval edge function** for approval workflow
18. **Update marketplace queries** to only show approved/active listings
19. **Add audit logging** for all approval decisions

### RLS Policy Updates
20. **Update media_outlets policies** to allow publishers to see their own submissions (all statuses)
21. **Allow system admins** to view and modify all submissions
22. **Restrict buyers** to only see approved/active marketplace listings

## Non-Goals (Out of Scope)

1. **Automated pricing algorithms** - Manual admin pricing for initial implementation
2. **Publisher negotiation system** - Simple accept/reject workflow
3. **Dynamic pricing** based on demand/supply
4. **Integration with external pricing APIs**
5. **Publisher rating/review system**
6. **Automated website verification tools**

## Design Considerations

### UI/UX Requirements
- **Admin Interface:** Clean, efficient approval workflow with clear profit margin displays
- **Publisher Interface:** Clear submission status indicators and feedback displays
- **Mobile Responsive:** Admin approval workflow must work on tablets
- **Consistent Design:** Use existing Shadcn UI components and design patterns

### Information Architecture
- **Admin Navigation:** Add "Marketplace Manager" to admin sidebar
- **Publisher Navigation:** Add submission status to publisher dashboard
- **Status Flow:** pending → approved/rejected → active (for approved only)

## Technical Considerations

### Database Performance
- Add indexes on status, submitted_at, reviewed_at columns
- Consider partitioning for large submission volumes
- Optimize queries for admin dashboard performance

### Security
- RLS policies must prevent unauthorized access to pending submissions
- Audit logging for all approval decisions
- Input validation for price fields

### Scalability
- Handle bulk submissions efficiently
- Support for multiple admins processing simultaneously
- Queue system for high-volume approval workflows

## Success Metrics

1. **Approval Time:** Average time from submission to approval < 24 hours
2. **Rejection Rate:** < 20% of submissions require rejection
3. **Profit Margin:** Average profit margin > 30% across approved listings
4. **Admin Efficiency:** Admin can process 50+ submissions per hour
5. **Publisher Satisfaction:** > 80% of publishers report clear feedback on decisions

## Open Questions

1. **Should publishers be able to edit submissions after rejection?**
2. **What metrics should be displayed for admin review (SEO scores, traffic, etc.)?**
3. **Should there be different approval workflows for different website categories?**
4. **How should we handle websites that were directly imported by admins vs publisher submissions?**
5. **Should purchase_price be visible to publishers after approval?**

---

**Next Steps:**
1. Review and approve this PRD
2. Create detailed task breakdown using the generate-tasks.md workflow
3. Begin implementation with database schema changes
