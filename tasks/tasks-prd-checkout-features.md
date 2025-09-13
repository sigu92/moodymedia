## Relevant Files

- `src/components/marketplace/MarketplaceGridView.tsx` - Enhanced with instant visual feedback (< 500ms) and optimistic UI updates
- `src/components/marketplace/MarketplaceTable.tsx` - Enhanced with instant visual feedback (< 500ms) and optimistic UI updates
- `src/components/TopNav.tsx` - Updated cart badge to show live count updates using cartCount from useCart hook
- `src/hooks/useCart.ts` - Enhanced with cartCount property for live badge updates
- `src/components/cart/CartSidebar.tsx` - New slide-out sidebar component for cart display
- `src/components/cart/CartIcon.tsx` - Enhanced cart icon with instant feedback
- `src/components/checkout/CheckoutModal.tsx` - Main checkout modal with 4-step process
- `src/components/checkout/Step1CartReview.tsx` - Step 1: Cart items, niches, content options
- `src/components/checkout/Step2BillingPayment.tsx` - Step 2: Billing info, payment methods, PO numbers
- `src/components/checkout/Step3ContentUpload.tsx` - Step 3: File upload for self-provided content
- `src/components/checkout/Step4OrderConfirmation.tsx` - Step 4: Final review and order submission
- `src/components/checkout/ProgressIndicator.tsx` - 4-step progress bar component
- `src/hooks/useCheckout.ts` - New hook for checkout state management
- `src/hooks/useFileUpload.ts` - File upload handling with validation
- `src/utils/checkoutUtils.ts` - Utility functions for pricing, validation
- `src/types/checkout.ts` - TypeScript interfaces for checkout data

### Notes

- Unit tests should be created alongside new components following existing patterns
- File upload functionality should prepare for future storage integration
- RLS policies may need updates for order content handling
- Leverage existing cart persistence and database structure
- Follow existing component patterns from cart and marketplace components
- Mobile responsiveness should be tested across all components

## Tasks

- [x] 1.0 Instant Cart Feedback System
  - [x] 1.1 Enhance marketplace buy buttons with instant visual feedback (< 500ms)
  - [x] 1.2 Update cart icon badge to show live count updates
  - [x] 1.3 Add optimistic UI updates for cart operations
  - [x] 1.4 Implement error handling with rollback for failed cart additions
  - [x] 1.5 Add toast notifications for cart actions (add, remove, error)

- [ ] 2.0 Cart Sidebar Component
  - [ ] 2.1 Create CartSidebar component with slide-in animation from right
  - [ ] 2.2 Implement mobile-responsive design (full-screen modal on mobile)
  - [ ] 2.3 Add item display with quantity controls and remove buttons
  - [ ] 2.4 Create price summary section (subtotal, VAT, total)
  - [ ] 2.5 Add "Proceed to Checkout" button opening checkout modal
  - [ ] 2.6 Implement smooth open/close animations and transitions
  - [ ] 2.7 Add keyboard navigation and accessibility features

- [ ] 3.0 Checkout Modal Infrastructure
  - [ ] 3.1 Create CheckoutModal component with modal overlay
  - [ ] 3.2 Build ProgressIndicator component showing 4 steps
  - [ ] 3.3 Implement step navigation (back/next buttons)
  - [ ] 3.4 Add form validation and error handling
  - [ ] 3.5 Create checkout state management (useCheckout hook)
  - [ ] 3.6 Implement responsive design for all screen sizes
  - [ ] 3.7 Add loading states and progress feedback

- [ ] 4.0 Step 1: Cart Review & Configuration
  - [ ] 4.1 Create Step1CartReview component displaying cart items
  - [ ] 4.2 Implement quantity adjustment controls for each item
  - [ ] 4.3 Add niche selection dropdown for each cart item
  - [ ] 4.4 Implement dynamic pricing based on niche multipliers
  - [ ] 4.5 Create content options (self-provided vs professional writing +25€)
  - [ ] 4.6 Add publisher guidelines acknowledgment checkbox
  - [ ] 4.7 Build real-time order summary with content writing fees
  - [ ] 4.8 Add validation to ensure niche selection before proceeding

- [ ] 5.0 Step 2: Billing & Payment
  - [ ] 5.1 Create Step2BillingPayment component
  - [ ] 5.2 Build billing information form (name, company, address, tax info)
  - [ ] 5.3 Implement payment method selection (Stripe, PayPal, Invoice)
  - [ ] 5.4 Add PO number input field (optional)
  - [ ] 5.5 Create payment method validation and configuration checks
  - [ ] 5.6 Add billing information save option for future orders
  - [ ] 5.7 Implement dummy payment system for testing
  - [ ] 5.8 Add form validation and error handling

- [ ] 6.0 Step 3: Content Upload (Conditional)
  - [ ] 6.1 Create Step3ContentUpload component with conditional rendering
  - [ ] 6.2 Implement file upload for Word docs (.doc, .docx) and Google Docs links
  - [ ] 6.3 Add file size validation (10MB limit) and type checking
  - [ ] 6.4 Create upload progress indicators and drag-drop interface
  - [ ] 6.5 Build file preview showing names and metadata
  - [ ] 6.6 Add multiple file upload support for different cart items
  - [ ] 6.7 Implement file removal and replacement functionality
  - [ ] 6.8 Prepare for future file storage integration

- [ ] 7.0 Step 4: Order Confirmation & Processing
  - [ ] 7.1 Create Step4OrderConfirmation component
  - [ ] 7.2 Build final order summary showing all selections and pricing
  - [ ] 7.3 Add terms and conditions acceptance checkbox
  - [ ] 7.4 Implement order submission with payment processing
  - [ ] 7.5 Create order records with "action_needed" status
  - [ ] 7.6 Add notification system for user confirmation
  - [ ] 7.7 Prepare admin alerts for content review (notifications)
  - [ ] 7.8 Implement order number generation and display

- [ ] 8.0 Enhanced Cart Persistence
  - [ ] 8.1 Improve cart recovery from localStorage backups
  - [ ] 8.2 Add read-only mode handling for restored cart items
  - [ ] 8.3 Implement automatic cleanup of old cart backups
  - [ ] 8.4 Add cart persistence across browser sessions
  - [ ] 8.5 Create concurrent cart modification protection
  - [ ] 8.6 Add cart data integrity validation

- [ ] 9.0 Navigation & UI Updates
  - [ ] 9.1 Remove cart navigation link from header (keep icon only)
  - [ ] 9.2 Update cart icon click to open sidebar instead of navigating
  - [ ] 9.3 Remove or redirect existing /cart page
  - [ ] 9.4 Add mobile-specific cart interactions
  - [ ] 9.5 Update marketplace buy buttons for instant feedback
  - [ ] 9.6 Add cart-related accessibility improvements

- [ ] 10.0 Database & Backend Preparation
  - [ ] 10.1 Add database fields for content preferences and PO numbers
  - [ ] 10.2 Update order status handling for "action_needed" state
  - [ ] 10.3 Prepare file storage integration (future-ready)
  - [ ] 10.4 Add order content tracking fields
  - [ ] 10.5 Create admin notification triggers for content uploads
  - [ ] 10.6 Update RLS policies for order content access

- [ ] 11.0 Testing & Quality Assurance
  - [ ] 11.1 Create unit tests for checkout components and hooks
  - [ ] 11.2 Add integration tests for cart sidebar functionality
  - [ ] 11.3 Test mobile responsiveness across all components
  - [ ] 11.4 Validate file upload functionality and error handling
  - [ ] 11.5 Test cart persistence and recovery scenarios
  - [ ] 11.6 Perform accessibility testing (WCAG compliance)
  - [ ] 11.7 Test edge cases (network failures, invalid inputs, etc.)

- [ ] 12.0 Performance Optimization
  - [ ] 12.1 Optimize cart operations for < 500ms response time
  - [ ] 12.2 Implement lazy loading for checkout components
  - [ ] 12.3 Add skeleton loaders for better perceived performance
  - [ ] 12.4 Optimize file upload handling and memory usage
  - [ ] 12.5 Cache cart data for faster loading
  - [ ] 12.6 Implement proper cleanup of event listeners and timers
