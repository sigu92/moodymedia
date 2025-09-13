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
  readOnly?: boolean; // For items recovered from backup when database is unavailable
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

      let items: CartItem[] = (data || []).map(item => ({
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

      // If no items in database, try to recover from localStorage backup
      if (items.length === 0) {
        const backupKey = `cart_backup_${user.id}`;
        const backupData = localStorage.getItem(backupKey);

        if (backupData) {
          try {
            const parsedBackup = JSON.parse(backupData);

            // Only restore if backup is less than 24 hours old
            if (parsedBackup.timestamp && Date.now() - parsedBackup.timestamp < 24 * 60 * 60 * 1000) {
              console.log('Restoring cart from localStorage backup');

              // Try to restore items to database
              const restoredItems = await restoreCartFromBackup(parsedBackup.cartItems);

              if (restoredItems.length > 0) {
                items = restoredItems;
                toast({
                  title: "Cart Restored",
                  description: "Your cart items have been restored from a previous session.",
                });
              }
            } else {
              // Remove old backup
              localStorage.removeItem(backupKey);
            }
          } catch (backupError) {
            console.warn('Failed to restore cart from backup:', backupError);
            localStorage.removeItem(backupKey);
          }
        }
      }

      setCartItems(items);
    } catch (error) {
      console.error('Error fetching cart items:', error);

      // Even if database fails, try localStorage backup as last resort
      try {
        const backupKey = `cart_backup_${user.id}`;
        const backupData = localStorage.getItem(backupKey);

        if (backupData) {
          const parsedBackup = JSON.parse(backupData);
          if (parsedBackup.cartItems && parsedBackup.timestamp &&
              Date.now() - parsedBackup.timestamp < 24 * 60 * 60 * 1000) {

            // Show items from backup (read-only mode)
            const backupItems: CartItem[] = parsedBackup.cartItems.map((item: any) => ({
              ...item,
              // Mark as read-only since we can't save to database
              readOnly: true
            }));

            setCartItems(backupItems);

            toast({
              title: "Cart Recovered",
              description: "Cart loaded from backup. Some features may be limited.",
              variant: "destructive",
            });

            return;
          }
        }
      } catch (backupError) {
        console.warn('Backup recovery also failed:', backupError);
      }

      toast({
        title: "Error",
        description: "Failed to load cart items. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreCartFromBackup = async (backupItems: any[]): Promise<CartItem[]> => {
    const restoredItems: CartItem[] = [];

    for (const backupItem of backupItems) {
      try {
        // Try to re-add the item to the database
        const finalPrice = Math.round((backupItem.basePrice || backupItem.price) * (backupItem.priceMultiplier || 1.0));

        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user!.id,
            media_outlet_id: backupItem.mediaOutletId,
            price: backupItem.price,
            currency: backupItem.currency,
            niche_id: backupItem.nicheId,
            base_price: backupItem.basePrice || backupItem.price,
            price_multiplier: backupItem.priceMultiplier || 1.0,
            final_price: finalPrice
          })
          .select(`
            *,
            media_outlets!inner (domain, category),
            niches (slug, label)
          `)
          .single();

        if (!error && data) {
          restoredItems.push({
            id: data.id,
            mediaOutletId: data.media_outlet_id,
            price: Number(data.final_price || data.price),
            currency: data.currency,
            addedAt: data.added_at,
            domain: data.media_outlets?.domain,
            category: data.media_outlets?.category,
            nicheId: data.niche_id,
            basePrice: Number(data.base_price || data.price),
            priceMultiplier: Number(data.price_multiplier || 1.0),
            finalPrice: Number(data.final_price || data.price),
            nicheName: data.niches?.label,
          });
        }
      } catch (restoreError) {
        console.warn('Failed to restore cart item:', backupItem.mediaOutletId, restoreError);
      }
    }

    // Remove backup after successful restoration
    if (restoredItems.length > 0) {
      localStorage.removeItem(`cart_backup_${user!.id}`);
    }

    return restoredItems;
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
      return false;
    }

    try {
      // Check if item already exists in cart
      const existingItem = cartItems.find(item => item.mediaOutletId === mediaOutletId);
      if (existingItem) {
        toast({
          title: "Already in cart",
          description: "This item is already in your cart",
        });
        return true;
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
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    if (!user) return false;

    // Check if item is read-only (recovered from backup)
    const item = cartItems.find(item => item.id === cartItemId);
    if (item?.readOnly) {
      toast({
        title: "Cannot Remove Item",
        description: "This item was recovered from backup and cannot be modified.",
        variant: "destructive",
      });
      return false;
    }

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
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const clearCart = async () => {
    if (!user) return false;

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
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchCartItems();
  }, [user?.id]); // Use user.id to trigger when user changes

  return {
    cartItems,
    loading,
    addToCart,
    removeFromCart,
    clearCart,
    refetch: fetchCartItems,
    cartCount: cartItems.length
  };
};