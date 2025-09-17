import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Minus, Plus, Trash2, Info, CheckCircle2 } from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';
import { useCart } from '@/hooks/useCart';
import { calculateItemTotal, calculateSubtotal, calculateVAT, calculateTotal, formatCurrency } from '@/utils/checkoutUtils';
import { NICHES } from '@/components/marketplace/niches';
import { NicheSelect } from '@/components/checkout/components/NicheSelect';

interface Step1CartReviewProps {
  onValidationChange?: (isValid: boolean) => void;
}

export const Step1CartReview: React.FC<Step1CartReviewProps> = ({ onValidationChange }) => {
  const { cartItems, updateCartItemQuantity, removeFromCart } = useCart();
  const { formData, updateFormData } = useCheckout();
  const [guidelinesAcknowledged, setGuidelinesAcknowledged] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Bulk selection functions
  const isAllSelected = cartItems.length > 0 && selectedItems.size === cartItems.length;
  const isPartiallySelected = selectedItems.size > 0 && selectedItems.size < cartItems.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(cartItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Bulk action handlers
  const handleBulkNicheChange = useCallback((nicheSlug: string) => {
    if (selectedItems.size === 0) return;
    
    const updatedCartItems = formData.cartItems?.map(item => {
      if (selectedItems.has(item.id)) {
        return { ...item, nicheId: nicheSlug };
      }
      return item;
    }) || [];
    
    updateFormData({ cartItems: updatedCartItems });
  }, [selectedItems, formData.cartItems, updateFormData]);

  const handleBulkContentChange = useCallback((contentOption: 'self-provided' | 'professional') => {
    if (selectedItems.size === 0) return;
    
    const updatedCartItems = formData.cartItems?.map(item => {
      if (selectedItems.has(item.id)) {
        return { ...item, contentOption };
      }
      return item;
    }) || [];
    
    updateFormData({ cartItems: updatedCartItems });
  }, [selectedItems, formData.cartItems, updateFormData]);

  // Update cart items in checkout form when cart changes
  useEffect(() => {
    if (cartItems.length > 0 && !formData.cartItems?.length) {
      const updatedCartItems = cartItems.map(item => {
        const existingItem = formData.cartItems?.find(formItem => formItem.id === item.id);
        return {
          id: item.id,
          quantity: item.quantity ?? 1,
          nicheId: existingItem?.nicheId || undefined,
          contentOption: existingItem?.contentOption || 'self-provided' as const,
        };
      });
      updateFormData({ cartItems: updatedCartItems });
    }
  }, [cartItems, updateFormData, formData.cartItems?.length]);

  // Clear selected items only when cart items array changes (not form data)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSelectedItems(new Set());
  }, [cartItems.length]);

  // Validation check
  useEffect(() => {
    const isValid = guidelinesAcknowledged &&
                    cartItems.length > 0 &&
                    formData.cartItems?.every(item => item.nicheId && item.contentOption);

    onValidationChange?.(isValid);
  }, [guidelinesAcknowledged, cartItems, formData.cartItems, onValidationChange]);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const success = await updateCartItemQuantity(itemId, newQuantity);
    if (success) {
      // Update form data with new quantity
      const updatedItems = formData.cartItems?.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      updateFormData({ cartItems: updatedItems });
    }
  };

  const handleNicheChange = (itemId: string, nicheId: string) => {
    const updatedItems = formData.cartItems?.map(item =>
      item.id === itemId ? { ...item, nicheId } : item
    );
    updateFormData({ cartItems: updatedItems });
  };

  const handleContentOptionChange = (itemId: string, contentOption: 'self-provided' | 'professional') => {
    const updatedItems = formData.cartItems?.map(item =>
      item.id === itemId ? { ...item, contentOption } : item
    );
    updateFormData({ cartItems: updatedItems });
  };

  const handleRemoveItem = async (itemId: string) => {
    const success = await removeFromCart(itemId);
    if (success) {
      // Update form data to remove the item
      const updatedItems = formData.cartItems?.filter(item => item.id !== itemId);
      updateFormData({ cartItems: updatedItems });
    }
  };

  const getNicheMultiplier = (nicheSlug?: string, itemId?: string) => {
    if (!nicheSlug) return 1.0;
    // Prefer outlet-specific rules from cart item
    const cartItem = cartItems.find(ci => ci.id === itemId);
    const rule = cartItem?.outletNicheRules?.find(r => r.nicheSlug === nicheSlug && r.accepted);
    if (rule) return rule.multiplier || 1.0;
    // Fall back to default NICHES list
    const niche = NICHES.find(n => n.slug === nicheSlug);
    return niche?.defaultMultiplier ?? 1.0;
  };

  const getItemTotal = (item: typeof cartItems[0], formItem: typeof formData.cartItems[0]) => {
    if (!formItem) return item.finalPrice || item.price;

    const nicheMultiplier = getNicheMultiplier(formItem.nicheId, item.id);
    return calculateItemTotal(
      item.finalPrice || item.price,
      formItem.quantity,
      formItem.contentOption,
      nicheMultiplier
    );
  };

  const calculateOrderSummary = () => {
    if (!cartItems.length || !formData.cartItems) return { subtotal: 0, vat: 0, total: 0 };

    const itemsWithPrices = cartItems.map(item => {
      const formItem = formData.cartItems?.find(fi => fi.id === item.id);
      return {
        price: item.finalPrice || item.price,
        quantity: formItem?.quantity || 1,
        contentOption: formItem?.contentOption || 'self-provided' as const,
        nicheMultiplier: getNicheMultiplier(formItem?.nicheId),
      };
    });

    const subtotal = calculateSubtotal(itemsWithPrices);
    const vat = calculateVAT(subtotal);
    const total = calculateTotal(subtotal, vat);

    return { subtotal, vat, total };
  };

  const { subtotal, vat, total } = calculateOrderSummary();

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
        <p className="text-muted-foreground">
          Add some items to your cart before proceeding with checkout.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cart Items Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Review Your Cart Items</h3>
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedItems.size} selected:
              </span>
              <Select onValueChange={(value) => {
                if (value !== "placeholder") {
                  handleBulkNicheChange(value);
                }
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Set niche for all" />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map(niche => (
                    <SelectItem key={niche.slug} value={niche.slug}>
                      {niche.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(value) => {
                if (value !== "placeholder") {
                  handleBulkContentChange(value as 'self-provided' | 'professional');
                }
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Set content for all" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self-provided">Self-Provided</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItems(new Set())}
                className="text-xs"
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      {...(isPartiallySelected && { 'data-state': 'indeterminate' })}
                    />
                  </TableHead>
                  <TableHead className="w-[30%] min-w-[150px]">MEDIA</TableHead>
                  <TableHead className="w-[25%] min-w-[140px]">RESTRICTED NICHE *</TableHead>
                  <TableHead className="w-[25%] min-w-[140px]">CONTENT PRODUCT *</TableHead>
                  <TableHead className="w-[20%] min-w-[120px]">MEDIA PRICE</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
        {cartItems.map((item) => {
          const formItem = formData.cartItems?.find(fi => fi.id === item.id);
                const nicheMultiplier = getNicheMultiplier(formItem?.nicheId, item.id);
          const itemTotal = getItemTotal(item, formItem);

          return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.domain}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.category}
                        </div>
                        <div className="flex gap-1">
                        <Badge variant="secondary" className="text-xs">
                            DR: {item.domainRating || 'N/A'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            {item.monthlyTraffic?.toLocaleString() || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                    </TableCell>
                    <TableCell>
                      <NicheSelect
                        value={formItem?.nicheId || ''}
                        onChange={(value) => handleNicheChange(item.id, value)}
                        rules={(() => {
                          const outletRules = cartItems.find(ci => ci.id === item.id)?.outletNicheRules || [];
                          if (outletRules.length > 0) {
                            return outletRules.map(r => ({
                              nicheSlug: r.nicheSlug,
                              nicheLabel: r.nicheLabel,
                              accepted: r.accepted,
                              multiplier: r.multiplier,
                            }));
                          }
                          // Fallback to default niches if no outlet rules
                          return NICHES.map(n => ({
                            nicheSlug: n.slug,
                            nicheLabel: n.label,
                            accepted: true,
                            multiplier: n.defaultMultiplier,
                          }));
                        })()}
                        placeholder="Choose..."
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={formItem?.contentOption || ''}
                        onValueChange={(value: 'self-provided' | 'professional') => 
                          handleContentOptionChange(item.id, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self-provided">Self-Provided Content</SelectItem>
                          <SelectItem value="professional">Professional Writing (+€25)</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, (formItem?.quantity || 1) - 1)}
                        disabled={(formItem?.quantity || 1) <= 1}
                            className="h-7 w-7 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                          <div className="w-16 text-center">
                            <div className="font-semibold text-sm">
                              €{itemTotal.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Qty: {formItem?.quantity || 1}
                            </div>
                          </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, (formItem?.quantity || 1) + 1)}
                            className="h-7 w-7 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button variant="link" className="text-primary p-0">
            Add more sites →
          </Button>
                        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Remove all from cart
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              After placing your order, please provide us with your final content creation instructions.
              We'll begin promptly once we have your details.
                      </span>
                    </div>
                  </div>
      </div>

      {/* Publisher Guidelines Acknowledgment */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="guidelines"
            checked={guidelinesAcknowledged}
            onCheckedChange={(checked) => setGuidelinesAcknowledged(checked as boolean)}
            className="mt-1"
          />
          <div className="flex-1">
            <Label htmlFor="guidelines" className="text-sm font-medium cursor-pointer">
              Publisher Guidelines Acknowledgment *
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              I acknowledge that I have reviewed and agree to follow the publisher's content guidelines,
              editorial standards, and submission requirements for each selected media outlet.
            </p>
          </div>
        </div>
      </Card>

      {/* Order Summary */}
      <Card className="p-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({cartItems.length} item{cartItems.length > 1 ? 's' : ''})</span>
            <span>€{subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>VAT (25%)</span>
            <span>€{vat.toFixed(2)}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>€{total.toFixed(2)}</span>
          </div>

          {formData.cartItems?.some(item => item.contentOption === 'professional') && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Professional Content Writing Included</p>
                  <p className="mt-1">
                    Expert writers will create high-quality content tailored to your selected niches
                    and publisher guidelines. Content will be delivered within 3-5 business days.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!guidelinesAcknowledged && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <span>Please acknowledge the publisher guidelines to proceed.</span>
              </div>
            </div>
          )}

          {formData.cartItems?.some(item => !item.nicheId) && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <span>Please select target niches for all items to proceed.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
