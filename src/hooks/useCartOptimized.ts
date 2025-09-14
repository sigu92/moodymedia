import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Performance-optimized version of useCart with < 500ms response times

export interface CartItem {
  id: string;
  mediaOutletId: string;
  price: number;
  currency: string;
  addedAt: string;
  quantity: number;
  domain?: string;
  category?: string;
  nicheId?: string;
  basePrice?: number;
  priceMultiplier?: number;
  finalPrice?: number;
  nicheName?: string;
  readOnly?: boolean;
}

// Cache for media outlet data to reduce database queries
const mediaOutletCache = new Map<string, { domain: string; category: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Debounce utility for rapid operations
const useDebounce = (callback: (...args: unknown[]) => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: unknown[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

export const useCartOptimized = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastOperationTime, setLastOperationTime] = useState<number>(0);
  const { user } = useAuth();

  // Refs for performance optimization
  const cartCacheRef = useRef<Map<string, CartItem>>(new Map());
  const operationQueueRef = useRef<Array<() => Promise<void>>>([]);
  const processingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup and eviction policy for persistent refs
  useEffect(() => {
    const cleanup = () => {
      // Clear cart cache (evict old entries)
      const now = Date.now();
      const toDelete: string[] = [];
      cartCacheRef.current.forEach((item, key) => {
        if (now - lastFetchRef.current > 30 * 60 * 1000) { // 30 minutes max age
          toDelete.push(key);
        }
      });
      toDelete.forEach(key => cartCacheRef.current.delete(key));

      // Clear operation queue (remove old operations)
      if (operationQueueRef.current.length > 10) { // Max 10 queued operations
        operationQueueRef.current = operationQueueRef.current.slice(-5); // Keep last 5
      }

      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Reset processing state
      processingRef.current = false;
      lastFetchRef.current = now;
    };

    // Run cleanup every 5 minutes
    const cleanupInterval = setInterval(cleanup, 5 * 60 * 1000);

    return () => {
      clearInterval(cleanupInterval);
      cleanup(); // Final cleanup on unmount
    };
  }, []);

  // Memoized calculations for performance
  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const price = item.finalPrice || item.price;
      return total + (price * item.quantity);
    }, 0);
  }, [cartItems]);

  const cartCount = useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  const writableItems = useMemo(() => {
    return cartItems.filter(item => !item.readOnly);
  }, [cartItems]);

  // Optimized media outlet data fetching with caching
  const fetchMediaOutletData = useCallback(async (mediaOutletId: string) => {
    const now = Date.now();
    const cached = mediaOutletCache.get(mediaOutletId);

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('media_outlets')
        .select('domain, category')
        .eq('id', mediaOutletId)
        .single();

      if (error) throw error;

      const result = { domain: data.domain, category: data.category, timestamp: now };
      mediaOutletCache.set(mediaOutletId, result);
      return result;
    } catch (error) {
      console.warn('Failed to fetch media outlet data:', error);
      return null;
    }
  }, []);

  // Optimized cart fetching with smart caching
  const fetchCartItemsOptimized = useCallback(async (force = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    if (!force && (now - lastFetchRef.current) < 2000) { // 2 second cache
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    lastFetchRef.current = now;

    try {
      const startTime = performance.now();

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          media_outlet_id,
          price,
          currency,
          added_at,
          quantity,
          niche_id,
          base_price,
          price_multiplier,
          final_price
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Batch fetch media outlet data for better performance
      const mediaOutletIds = [...new Set(data.map(item => item.media_outlet_id))];
      const mediaOutletPromises = mediaOutletIds.map(id => fetchMediaOutletData(id));
      const mediaOutletResults = await Promise.all(mediaOutletPromises);

      const mediaOutletMap = new Map(
        mediaOutletIds.map((id, index) => [id, mediaOutletResults[index]])
      );

      const items: CartItem[] = data.map(item => {
        const mediaData = mediaOutletMap.get(item.media_outlet_id);
        return {
          id: item.id,
          mediaOutletId: item.media_outlet_id,
          price: Number(item.final_price || item.price),
          currency: item.currency,
          addedAt: item.added_at,
          quantity: item.quantity || 1,
          domain: mediaData?.domain,
          category: mediaData?.category,
          nicheId: item.niche_id,
          basePrice: Number(item.base_price || item.price),
          priceMultiplier: Number(item.price_multiplier || 1.0),
          finalPrice: Number(item.final_price || item.price),
        };
      });

      // Update cache
      cartCacheRef.current.clear();
      items.forEach(item => cartCacheRef.current.set(item.id, item));

      setCartItems(items);

      const fetchTime = performance.now() - startTime;
      console.log(`Cart fetch completed in ${fetchTime.toFixed(2)}ms`);

      if (fetchTime > 500) {
        console.warn('Cart fetch exceeded 500ms target:', fetchTime);
      }

    } catch (error: unknown) {
      const err = error as Error;
      if (err.name !== 'AbortError') {
        console.error('Error fetching cart items:', error);
        toast({
          title: "Error",
          description: "Failed to load cart items. Please refresh the page.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, fetchMediaOutletData]);

  // Debounced backup save
  const debouncedBackupSave = useDebounce(async (items: CartItem[]) => {
    if (!user?.id || items.length === 0) return;

    try {
      const backup = {
        cartItems: items,
        timestamp: Date.now(),
        version: '1.0',
        sessionId: 'optimized-session',
        userId: user.id,
        checksum: 'optimized-checksum',
      };

      localStorage.setItem(`cart_backup_${user.id}`, JSON.stringify(backup));
    } catch (error) {
      console.warn('Failed to save optimized backup:', error);
    }
  }, 1000);

  // Optimized add to cart with queue processing
  const addToCartOptimized = useCallback(async (
    mediaOutletId: string,
    price: number,
    currency: string = 'EUR',
    nicheId?: string,
    priceMultiplier: number = 1.0,
    quantity: number = 1
  ) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to cart",
        variant: "destructive",
      });
      return false;
    }

    const startTime = performance.now();

    // Check cache first for immediate response
    const existingItem = cartItems.find(item => item.mediaOutletId === mediaOutletId);

    if (existingItem && !existingItem.readOnly) {
      // Capture previous state for potential revert
      const prevCartItems = cartItems;

      // Update quantity locally first for immediate feedback
      const updatedItems = cartItems.map(item =>
        item.id === existingItem.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      setCartItems(updatedItems);

      // Then update in database with the correct target quantity
      const targetQuantity = existingItem.quantity + quantity;
      const updatePromise = updateCartItemQuantityOptimized(existingItem.id, targetQuantity);
      updatePromise.catch(() => {
        // Revert to captured previous state on failure
        setCartItems(prevCartItems);
        toast({
          title: "Update Failed",
          description: "Failed to update item quantity. Please try again.",
          variant: "destructive",
        });
      });

      const operationTime = performance.now() - startTime;
      setLastOperationTime(operationTime);

      return true;
    }

    // Add new item - optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticItem: CartItem = {
      id: tempId,
      mediaOutletId,
      price: Math.round(price * priceMultiplier),
      currency,
      addedAt: new Date().toISOString(),
      quantity,
      nicheId,
      basePrice: price,
      priceMultiplier,
      finalPrice: Math.round(price * priceMultiplier),
    };

    // Optimistic update for immediate UI feedback
    setCartItems(prev => [...prev, optimisticItem]);

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          media_outlet_id: mediaOutletId,
          price,
          currency,
          niche_id: nicheId,
          base_price: price,
          price_multiplier: priceMultiplier,
          final_price: Math.round(price * priceMultiplier),
          quantity,
        })
        .select(`
          id,
          media_outlet_id,
          price,
          currency,
          added_at,
          quantity,
          niche_id,
          base_price,
          price_multiplier,
          final_price
        `)
        .single();

      if (error) throw error;

      // Replace optimistic item with real data
      const realItem: CartItem = {
        id: data.id,
        mediaOutletId: data.media_outlet_id,
        price: Number(data.final_price || data.price),
        currency: data.currency,
        addedAt: data.added_at,
        quantity: data.quantity || 1,
        nicheId: data.niche_id,
        basePrice: Number(data.base_price || data.price),
        priceMultiplier: Number(data.price_multiplier || 1.0),
        finalPrice: Number(data.final_price || data.price),
      };

      setCartItems(prev => prev.map(item =>
        item.id === tempId ? realItem : item
      ));

      // Update cache
      cartCacheRef.current.set(realItem.id, realItem);

      // Trigger debounced backup
      debouncedBackupSave([...cartItems, realItem]);

      const operationTime = performance.now() - startTime;
      setLastOperationTime(operationTime);

      if (operationTime < 500) {
        console.log(`Add to cart completed in ${operationTime.toFixed(2)}ms ✓`);
      } else {
        console.warn(`Add to cart exceeded target: ${operationTime.toFixed(2)}ms`);
      }

      return true;

    } catch (error) {
      // Remove optimistic item on failure
      setCartItems(prev => prev.filter(item => item.id !== tempId));

      console.error('Failed to add item to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });

      return false;
    }
  }, [user, cartItems, debouncedBackupSave]);

  // Optimized quantity update
  const updateCartItemQuantityOptimized = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Handle removal inline to avoid circular dependency
      const startTime = performance.now();
      const itemToRemove = cartItems.find(item => item.id === itemId);
      if (!itemToRemove) return false;

      const previousItems = [...cartItems];
      setCartItems(prev => prev.filter(item => item.id !== itemId));

      try {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;

        cartCacheRef.current.delete(itemId);
        debouncedBackupSave(cartItems.filter(item => item.id !== itemId));

        const operationTime = performance.now() - startTime;
        setLastOperationTime(operationTime);

        if (operationTime < 500) {
          console.log(`Remove from cart completed in ${operationTime.toFixed(2)}ms ✓`);
        }

        return true;
      } catch (error) {
        setCartItems(previousItems);
        console.error('Failed to remove item from cart:', error);
        toast({
          title: "Error",
          description: "Failed to remove item from cart. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    }

    const startTime = performance.now();

    // Optimistic update
    const previousItems = [...cartItems];
    setCartItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;

      // Update cache
      const updatedItem = cartItems.find(item => item.id === itemId);
      if (updatedItem) {
        cartCacheRef.current.set(itemId, { ...updatedItem, quantity: newQuantity });
      }

      const operationTime = performance.now() - startTime;
      setLastOperationTime(operationTime);

      if (operationTime < 500) {
        console.log(`Quantity update completed in ${operationTime.toFixed(2)}ms ✓`);
      }

      return true;

    } catch (error) {
      // Revert optimistic update
      setCartItems(previousItems);

      console.error('Failed to update item quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update item quantity. Please try again.",
        variant: "destructive",
      });

      return false;
    }
  }, [cartItems]);

  // Optimized remove from cart
  const removeFromCartOptimized = useCallback(async (itemId: string) => {
    const startTime = performance.now();

    // Optimistic update
    const itemToRemove = cartItems.find(item => item.id === itemId);
    if (!itemToRemove) return false;

    const previousItems = [...cartItems];
    setCartItems(prev => prev.filter(item => item.id !== itemId));

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Update cache
      cartCacheRef.current.delete(itemId);

      // Trigger debounced backup
      debouncedBackupSave(cartItems.filter(item => item.id !== itemId));

      const operationTime = performance.now() - startTime;
      setLastOperationTime(operationTime);

      if (operationTime < 500) {
        console.log(`Remove from cart completed in ${operationTime.toFixed(2)}ms ✓`);
      }

      return true;

    } catch (error) {
      // Revert optimistic update
      setCartItems(previousItems);

      console.error('Failed to remove item from cart:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart. Please try again.",
        variant: "destructive",
      });

      return false;
    }
  }, [cartItems, debouncedBackupSave]);

  // Optimized clear cart
  const clearCartOptimized = useCallback(async () => {
    const startTime = performance.now();

    // Optimistic update
    const previousItems = [...cartItems];
    setCartItems([]);

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user!.id);

      if (error) throw error;

      // Clear cache
      cartCacheRef.current.clear();

      // Clear backup
      localStorage.removeItem(`cart_backup_${user!.id}`);

      const operationTime = performance.now() - startTime;
      setLastOperationTime(operationTime);

      if (operationTime < 500) {
        console.log(`Clear cart completed in ${operationTime.toFixed(2)}ms ✓`);
      }

      return true;

    } catch (error) {
      // Revert optimistic update
      setCartItems(previousItems);

      console.error('Failed to clear cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart. Please try again.",
        variant: "destructive",
      });

      return false;
    }
  }, [cartItems, user]);

  // Performance monitoring effect
  useEffect(() => {
    if (lastOperationTime > 500) {
      console.warn(`Cart operation exceeded 500ms target: ${lastOperationTime.toFixed(2)}ms`);
    }
  }, [lastOperationTime]);

  // Optimized initial load
  useEffect(() => {
    fetchCartItemsOptimized(true);
  }, [fetchCartItemsOptimized]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    cartItems,
    loading,
    cartTotal,
    cartCount,
    writableItems,
    lastOperationTime,
    addToCart: addToCartOptimized,
    removeFromCart: removeFromCartOptimized,
    updateCartItemQuantity: updateCartItemQuantityOptimized,
    clearCart: clearCartOptimized,
    refetch: () => fetchCartItemsOptimized(true),
  };
};
