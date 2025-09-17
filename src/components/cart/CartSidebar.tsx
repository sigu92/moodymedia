import React, { useEffect, useRef, useState, useCallback } from 'react';
import { announceToScreenReader } from '@/utils/accessibility';
import { X, ShoppingBag, Trash2, Plus, Minus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface CartSidebarProps {
  id?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCheckout?: () => void;
}

export function CartSidebar({ id, open, onOpenChange, onOpenCheckout }: CartSidebarProps) {
  const { cartItems, loading, removeFromCart, updateCartItemQuantity, refetch, clearAllCartData } = useCart();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const announcementElementRef = useRef<HTMLDivElement | null>(null);

  // Mobile-specific state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pullThreshold = 80; // Minimum distance to trigger refresh

  // Calculate totals (excluding read-only items)
  const subtotal = cartItems
    .filter(item => !item.readOnly)
    .reduce((sum, item) => {
      const quantity = item.quantity ?? 1; // Safe fallback for null/undefined
      const price = item.finalPrice ?? item.price ?? 0;
      return sum + (price * quantity);
    }, 0);
  // VAT rate configurable with fallback
  const defaultVatRate = 0.25;
  const configuredVat = Number((import.meta.env as Record<string, string | undefined>)?.VITE_VAT_RATE ?? defaultVatRate);
  const vatRate = Number.isFinite(configuredVat) && configuredVat >= 0 ? configuredVat : defaultVatRate;
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  // Keyboard navigation and accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      // Close on Escape key
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
      }

      // Focus management when sidebar opens
      if (event.key === 'Tab' && open) {
        const focusableElements = sidebarRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements?.[0] as HTMLElement;
        const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange, cartItems.length]);

  // Handle accessibility announcement and focus when sidebar opens
  useEffect(() => {
    if (open) {
      // Announce cart opening to screen readers
      announceToScreenReader(`Shopping cart opened with ${cartItems.length} items`, 'polite');

      // Focus close button when sidebar opens (with delay for animation)
      const focusTimeout = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 300);

      return () => {
        // Clean up focus timeout
        clearTimeout(focusTimeout);

        // Clean up announcement timeout and element
        if (announcementTimeoutRef.current) {
          clearTimeout(announcementTimeoutRef.current);
          announcementTimeoutRef.current = null;
        }

        if (announcementElementRef.current && document.body.contains(announcementElementRef.current)) {
          document.body.removeChild(announcementElementRef.current);
          announcementElementRef.current = null;
        }
      };
    }
  }, [open, cartItems.length]);

  // Mobile-specific interaction functions
  const simulateHapticFeedback = useCallback(() => {
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration for feedback
    }
  }, [isMobile]);

  const handlePullToRefresh = useCallback(async () => {
    if (!isRefreshing) {
      setIsRefreshing(true);
      simulateHapticFeedback();

      try {
        await refetch(); // Refresh cart data
        // Small delay for better UX
        setTimeout(() => setIsRefreshing(false), 500);
      } catch (error) {
        console.error('Refresh error:', error);
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing, refetch, simulateHapticFeedback]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;

    const touch = e.touches[0];
    setStartY(touch.clientY);
    setIsDragging(true);
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isDragging || !sidebarRef.current) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const diff = currentY - startY;

    // Only allow downward pull from top of content
    if (diff > 0 && sidebarRef.current.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, 120)); // Dampen the pull
      e.preventDefault(); // Prevent default scroll behavior
    }
  }, [isMobile, isDragging, startY]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !isDragging) return;

    setIsDragging(false);

    if (pullDistance >= pullThreshold) {
      handlePullToRefresh();
    }

    // Animate back to original position
    setPullDistance(0);
  }, [isMobile, isDragging, pullDistance, pullThreshold, handlePullToRefresh]);

  // Swipe-to-close functionality for mobile
  const handleSwipeClose = useCallback((direction: 'left' | 'right') => {
    if (!isMobile || direction !== 'left') return;

    // Close sidebar when swiping left
    onOpenChange(false);
    simulateHapticFeedback();
  }, [isMobile, onOpenChange, simulateHapticFeedback]);

  const handleCheckout = async () => {
    if (checkoutLoading) return;

    setCheckoutLoading(true);
    simulateHapticFeedback(); // Haptic feedback for button press

    try {
      // Close the cart sidebar first
      onOpenChange(false);
      // Then open the checkout modal
      onOpenCheckout?.();
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Announce quantity changes to screen readers
  const announceQuantityChange = (itemName: string, newQuantity: number) => {
    announceToScreenReader(`${itemName} quantity updated to ${newQuantity}`, 'polite');
  };

  const handleRemoveItem = async (itemId: string) => {
    simulateHapticFeedback(); // Haptic feedback for remove action
    await removeFromCart(itemId);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id={id}
        side="right"
        className={`${
          isMobile
            ? 'w-full h-full max-w-none'
            : 'w-full sm:max-w-lg'
        } flex flex-col`}
        ref={sidebarRef}
        aria-label="Shopping cart sidebar"
        aria-describedby="cart-description"
      >
        {/* Hidden description for screen readers */}
        <div id="cart-description" className="sr-only">
          Shopping cart with {cartItems.length} items.
          {cartItems.filter(item => !item.readOnly).length > 0 &&
            ` ${cartItems.filter(item => !item.readOnly).length} items available for checkout.`
          }
          {cartItems.filter(item => item.readOnly).length > 0 &&
            ` ${cartItems.filter(item => item.readOnly).length} items are read-only and were recovered from backup.`
          }
          {cartItems.length > 0 && ' Use quantity controls to adjust item amounts or remove items from your cart.'}
        </div>

        <SheetHeader className={`flex-shrink-0 ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
          <div className="flex items-center justify-between">
            <SheetTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <ShoppingBag className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Shopping Cart
              {cartItems.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {cartItems.length}
                </Badge>
              )}
            </SheetTitle>
            <Button
              ref={closeButtonRef}
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className={`${isMobile ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0'} hover:bg-muted`}
              aria-label="Close shopping cart"
            >
              <X className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </Button>
          </div>
        </SheetHeader>

        <div
          className={`flex-1 overflow-y-auto ${isMobile ? 'py-2 px-4' : 'py-4 px-6'}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={isMobile ? {
            transform: `translateY(${pullDistance}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          } : undefined}
        >
          {/* Pull-to-refresh indicator for mobile */}
          {isMobile && (
            <div
              className={`flex items-center justify-center py-2 transition-all duration-300 ${
                pullDistance > 0 ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transform: `translateY(${pullDistance > 0 ? -40 : 0}px)` }}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw
                  className={`h-4 w-4 transition-transform duration-300 ${
                    pullDistance >= pullThreshold ? 'rotate-180 text-primary' : ''
                  }`}
                />
                <span className="text-sm">
                  {pullDistance >= pullThreshold ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
                Loading cart...
              </div>
            </div>
          ) : cartItems.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-8 text-center ${isMobile ? 'px-4' : 'px-8'}`}>
              <ShoppingBag className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-muted-foreground mb-4`} />
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium mb-2`}>
                Your cart is empty
              </h3>
              <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
                Add some websites to get started with your content marketing campaign.
              </p>
              {import.meta.env?.DEV && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearAllCartData}
                  className="mt-4"
                >
                  [DEV] Force Clear All Cart Data
                </Button>
              )}
            </div>
          ) : (
            <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className={`${
                    isMobile ? 'p-3' : 'p-4'
                  } rounded-lg border transition-all duration-200 ease-in-out hover:shadow-sm ${
                    item.readOnly ? 'bg-muted/50 border-muted' : 'bg-card hover:bg-accent/50'
                  }`}
                  role="listitem"
                  aria-label={`Cart item: ${item.domain || 'Unknown Domain'}${item.readOnly ? ', read-only' : ''}`}
                  aria-describedby={`item-price-${item.id} item-quantity-${item.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                        {item.domain || 'Unknown Domain'}
                      </h4>
                      <p className={`text-muted-foreground truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        {item.category || 'Unknown Category'}
                      </p>
                      <div className={`flex flex-wrap gap-1 ${isMobile ? 'mt-1' : 'mt-2'}`}>
                        {item.nicheName && (
                          <Badge variant="outline" className={`${isMobile ? 'text-xs px-2 py-0' : 'text-xs'}`}>
                            {item.nicheName}
                          </Badge>
                        )}
                        {item.readOnly && (
                          <Badge variant="secondary" className={`${isMobile ? 'text-xs px-2 py-0' : 'text-xs'}`}>
                            Read-only
                          </Badge>
                        )}
                      </div>
                    </div>
                      <div className={`flex items-center flex-shrink-0 ${isMobile ? 'gap-2' : 'gap-3'}`}>
                        {/* Quantity Controls */}
                        {!item.readOnly && (
                          <div className="flex items-center gap-1" role="group" aria-label={`Quantity controls for ${item.domain || 'item'}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                simulateHapticFeedback();
                                const currentQuantity = item.quantity ?? 1;
                                const newQuantity = currentQuantity - 1;
                                updateCartItemQuantity(item.id, newQuantity);
                                announceQuantityChange(item.domain || 'item', newQuantity);
                              }}
                              disabled={(item.quantity ?? 1) <= 1}
                              className={`${
                                isMobile ? 'h-6 w-6' : 'h-7 w-7'
                              } p-0 text-xs transition-all duration-150 hover:scale-105 active:scale-95 ${
                                (item.quantity ?? 1) <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-destructive hover:text-destructive-foreground'
                              }`}
                              aria-label={`Decrease quantity of ${item.domain || 'item'}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span
                              id={`item-quantity-${item.id}`}
                              className={`${
                                isMobile ? 'text-xs min-w-[20px]' : 'text-sm min-w-[24px]'
                              } text-center font-medium transition-all duration-150`}
                              aria-label={`Current quantity: ${item.quantity ?? 1}`}
                            >
                              {item.quantity ?? 1}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                simulateHapticFeedback();
                                const currentQuantity = item.quantity ?? 1;
                                const newQuantity = currentQuantity + 1;
                                updateCartItemQuantity(item.id, newQuantity);
                                announceQuantityChange(item.domain || 'item', newQuantity);
                              }}
                              className={`${
                                isMobile ? 'h-6 w-6' : 'h-7 w-7'
                              } p-0 text-xs transition-all duration-150 hover:scale-105 active:scale-95 hover:bg-green-500 hover:text-white`}
                              aria-label={`Increase quantity of ${item.domain || 'item'}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <span
                          id={`item-price-${item.id}`}
                          className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}
                          aria-label={`Item price: ${formatPrice((item.finalPrice ?? item.price ?? 0) * (item.quantity ?? 1))}`}
                        >
                          {formatPrice((item.finalPrice ?? item.price ?? 0) * (item.quantity ?? 1))}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            simulateHapticFeedback();
                            handleRemoveItem(item.id);
                          }}
                          disabled={item.readOnly}
                          className={`${
                            isMobile ? 'h-7 w-7' : 'h-8 w-8'
                          } p-0 transition-all duration-150 hover:scale-110 active:scale-95 ${
                            item.readOnly
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-destructive hover:text-destructive-foreground'
                          }`}
                          aria-label={`Remove ${item.domain || 'item'} from cart`}
                        >
                          <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                        </Button>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className={`flex-shrink-0 border-t ${isMobile ? 'pt-3 px-4 pb-4' : 'pt-4 px-6 pb-6'} space-y-4`}>
            <div className="space-y-2">
              <div className={`flex justify-between ${isMobile ? 'text-sm' : 'text-base'}`}>
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className={`flex justify-between ${isMobile ? 'text-sm' : 'text-base'}`}>
                <span>VAT ({Math.round(vatRate * 100)}%)</span>
                <span>{formatPrice(vatAmount)}</span>
              </div>
              <Separator />
              <div className={`flex justify-between ${isMobile ? 'font-semibold text-base' : 'font-semibold'}`}>
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <Button
              className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              size={isMobile ? "default" : "lg"}
              onClick={handleCheckout}
              disabled={cartItems.filter(item => !item.readOnly).length === 0 || checkoutLoading}
              aria-describedby="checkout-description"
            >
              {checkoutLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                'Proceed to Checkout'
              )}
            </Button>

            {/* Hidden checkout description */}
            <div id="checkout-description" className="sr-only">
              {cartItems.filter(item => !item.readOnly).length === 0
                ? "No items available for checkout"
                : `Proceed to checkout with ${cartItems.filter(item => !item.readOnly).length} items totaling ${formatPrice(total)}`
              }
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
