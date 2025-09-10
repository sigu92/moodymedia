import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;
  mediaOutletId: string;
  price: number;
  currency: string;
  addedAt: string;
  domain?: string;
  category?: string;
  nicheId?: string;
  basePrice?: number;
  priceMultiplier?: number;
  finalPrice?: number;
  nicheName?: string;
}

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCartItems = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          media_outlets!inner (
            domain,
            category
          ),
          niches (
            slug,
            label
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      const items: CartItem[] = (data || []).map(item => ({
        id: item.id,
        mediaOutletId: item.media_outlet_id,
        price: Number(item.final_price || item.price),
        currency: item.currency,
        addedAt: item.added_at,
        domain: item.media_outlets?.domain,
        category: item.media_outlets?.category,
        nicheId: item.niche_id,
        basePrice: Number(item.base_price || item.price),
        priceMultiplier: Number(item.price_multiplier || 1.0),
        finalPrice: Number(item.final_price || item.price),
        nicheName: item.niches?.label,
      }));

      setCartItems(items);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      toast({
        title: "Error",
        description: "Failed to load cart items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (
    mediaOutletId: string, 
    price: number, 
    currency: string = 'EUR',
    nicheId?: string,
    priceMultiplier: number = 1.0
  ) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if item already exists in cart
      const existingItem = cartItems.find(item => item.mediaOutletId === mediaOutletId);
      if (existingItem) {
        toast({
          title: "Already in cart",
          description: "This item is already in your cart",
        });
        return;
      }

      const finalPrice = Math.round(price * priceMultiplier);

      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          media_outlet_id: mediaOutletId,
          price,
          currency,
          niche_id: nicheId,
          base_price: price,
          price_multiplier: priceMultiplier,
          final_price: finalPrice
        });

      if (error) throw error;

      await fetchCartItems();

      toast({
        title: "Added to cart",
        description: "Media outlet added to your cart",
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId)
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems(items => items.filter(item => item.id !== cartItemId));

      toast({
        title: "Removed from cart",
        description: "Item removed from your cart",
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems([]);

      toast({
        title: "Cart cleared",
        description: "All items removed from your cart",
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCartItems();
  }, [user]);

  return {
    cartItems,
    loading,
    addToCart,
    removeFromCart,
    clearCart,
    refetch: fetchCartItems
  };
};