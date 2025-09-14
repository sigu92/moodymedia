import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Minus, Plus, Trash2, Info, CheckCircle2 } from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';
import { useCart } from '@/hooks/useCart';
import { calculateItemTotal, calculateSubtotal, calculateVAT, calculateTotal, formatCurrency } from '@/utils/checkoutUtils';
import { NICHES } from '@/components/marketplace/niches';

interface Step1CartReviewProps {
  onValidationChange?: (isValid: boolean) => void;
}

export const Step1CartReview: React.FC<Step1CartReviewProps> = ({ onValidationChange }) => {
  const { cartItems, updateCartItemQuantity, removeFromCart } = useCart();
  const { formData, updateFormData } = useCheckout();
  const [guidelinesAcknowledged, setGuidelinesAcknowledged] = useState(false);

  // Update cart items in checkout form when cart changes
  useEffect(() => {
    if (cartItems.length > 0) {
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
  }, [cartItems, formData.cartItems, updateFormData]);

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

  const getNicheMultiplier = (nicheId?: string) => {
    if (!nicheId) return 1.0;
    const niche = NICHES.find(n => n.id === nicheId);
    return niche?.multiplier || 1.0;
  };

  const getItemTotal = (item: typeof cartItems[0], formItem: typeof formData.cartItems[0]) => {
    if (!formItem) return item.finalPrice || item.price;

    const nicheMultiplier = getNicheMultiplier(formItem.nicheId);
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
      {/* Cart Items */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Review Your Cart Items</h3>

        {cartItems.map((item) => {
          const formItem = formData.cartItems?.find(fi => fi.id === item.id);
          const nicheMultiplier = getNicheMultiplier(formItem?.nicheId);
          const itemTotal = getItemTotal(item, formItem);

          return (
            <Card key={item.id} className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Item Details */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-base">{item.domain}</h4>
                      <p className="text-sm text-muted-foreground">
                        Category: {item.category} • Niche: {item.niche}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          DR: {item.domainRating}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Traffic: {item.monthlyTraffic?.toLocaleString() || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium">Quantity:</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, (formItem?.quantity || 1) - 1)}
                        disabled={(formItem?.quantity || 1) <= 1}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={formItem?.quantity || 1}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-center"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, (formItem?.quantity || 1) + 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Niche Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      Target Niche
                      {!formItem?.nicheId && (
                        <span className="text-destructive text-xs">*</span>
                      )}
                    </Label>
                    <Select
                      value={formItem?.nicheId || ''}
                      onValueChange={(value) => handleNicheChange(item.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select target niche" />
                      </SelectTrigger>
                      <SelectContent>
                        {NICHES.map((niche) => (
                          <SelectItem key={niche.id} value={niche.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{niche.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {niche.multiplier}x
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Content Options */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Content Option</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          formItem?.contentOption === 'self-provided'
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => handleContentOptionChange(item.id, 'self-provided')}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            formItem?.contentOption === 'self-provided'
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`} />
                          <div>
                            <p className="font-medium text-sm">Self-Provided Content</p>
                            <p className="text-xs text-muted-foreground">Upload your own content</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          formItem?.contentOption === 'professional'
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => handleContentOptionChange(item.id, 'professional')}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            formItem?.contentOption === 'professional'
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`} />
                          <div>
                            <p className="font-medium text-sm">Professional Writing</p>
                            <p className="text-xs text-muted-foreground">+ €25 for expert content</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="sm:w-48">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Base Price:</span>
                      <span className="float-right font-medium">
                        €{(item.finalPrice || item.price).toFixed(2)}
                      </span>
                    </div>

                    {formItem?.nicheId && nicheMultiplier > 1 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Niche Multiplier:</span>
                        <span className="float-right font-medium">
                          {nicheMultiplier}x
                        </span>
                      </div>
                    )}

                    {formItem?.contentOption === 'professional' && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Content Writing:</span>
                        <span className="float-right font-medium">
                          €25.00
                        </span>
                      </div>
                    )}

                    <Separator />

                    <div className="text-base font-semibold">
                      <span>Total:</span>
                      <span className="float-right">
                        €{itemTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
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
