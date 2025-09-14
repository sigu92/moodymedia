import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

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
  readOnly?: boolean; // For items recovered from backup when database is unavailable
}

export interface CartBackup {
  cartItems: CartItem[];
  timestamp: number;
  version: string;
  checksum: string;
  sessionId: string;
  userId: string;
}

export interface CartPersistenceConfig {
  maxBackupAge: number; // Maximum age of backups in milliseconds
  maxBackupCount: number; // Maximum number of backups to keep
  backupInterval: number; // Interval between automatic backups in milliseconds
  enableConcurrentProtection: boolean;
  enableIntegrityValidation: boolean;
}

// Default configuration for cart persistence
const DEFAULT_CONFIG: CartPersistenceConfig = {
  maxBackupAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxBackupCount: 5,
  backupInterval: 30 * 1000, // 30 seconds
  enableConcurrentProtection: true,
  enableIntegrityValidation: true,
};

// Cart persistence utilities
const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const generateChecksum = (data: Record<string, unknown>): string => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
};

const validateCartItem = (item: CartItem): boolean => {
  return (
    item &&
    typeof item.id === 'string' &&
    typeof item.mediaOutletId === 'string' &&
    typeof item.price === 'number' &&
    typeof item.currency === 'string' &&
    typeof item.addedAt === 'string'
  );
};

const validateBackupIntegrity = (backup: CartBackup): boolean => {
  try {
    // Check basic structure
    if (!backup.cartItems || !Array.isArray(backup.cartItems)) return false;
    if (!backup.timestamp || !backup.version || !backup.checksum) return false;

    // Validate all cart items
    if (!backup.cartItems.every(validateCartItem)) return false;

    // Validate checksum
    const expectedChecksum = generateChecksum({
      cartItems: backup.cartItems,
      timestamp: backup.timestamp,
      version: backup.version,
      sessionId: backup.sessionId,
      userId: backup.userId,
    });

    return backup.checksum === expectedChecksum;
  } catch (error) {
    console.warn('Backup integrity validation failed:', error);
    return false;
  }
};

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId] = useState(generateSessionId);
  const [config] = useState(DEFAULT_CONFIG);
  const { user } = useAuth();

  // Refs for managing concurrent operations and auto-backup
  const lastBackupRef = useRef<number>(0);
  const operationLockRef = useRef<string | null>(null);
  const autoBackupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced cart persistence functions
  const createBackup = useCallback((items: CartItem[]): CartBackup => {
    const backup: CartBackup = {
      cartItems: items,
      timestamp: Date.now(),
      version: '1.0',
      sessionId,
      userId: user?.id || '',
      checksum: '',
    };

    // Generate checksum for integrity validation
    backup.checksum = generateChecksum({
      cartItems: backup.cartItems,
      timestamp: backup.timestamp,
      version: backup.version,
      sessionId: backup.sessionId,
      userId: backup.userId,
    });

    return backup;
  }, [sessionId, user?.id]);

  const saveBackup = useCallback((items: CartItem[]) => {
    if (!user?.id) return;

    try {
      const backup = createBackup(items);
      const backupKey = `cart_backup_${user.id}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));

      // Update last backup timestamp
      lastBackupRef.current = Date.now();

      console.log('Cart backup saved successfully');
    } catch (error) {
      console.warn('Failed to save cart backup:', error);
    }
  }, [user?.id, createBackup]);

  const loadBackup = useCallback((userId: string): CartBackup | null => {
    try {
      const backupKey = `cart_backup_${userId}`;
      const backupData = localStorage.getItem(backupKey);

      if (!backupData) return null;

      const backup: CartBackup = JSON.parse(backupData);

      // Validate backup integrity if enabled
      if (config.enableIntegrityValidation && !validateBackupIntegrity(backup)) {
        console.warn('Backup integrity validation failed, removing corrupted backup');
        localStorage.removeItem(backupKey);
        return null;
      }

      return backup;
    } catch (error) {
      console.warn('Failed to load cart backup:', error);
      return null;
    }
  }, [config.enableIntegrityValidation]);

  const cleanupOldBackups = useCallback(() => {
    if (!user?.id) return;

    try {
      const now = Date.now();
      const backupKeys = Object.keys(localStorage).filter(key =>
        key.startsWith(`cart_backup_${user.id}`)
      );

      // Remove backups older than max age
      backupKeys.forEach(key => {
        try {
          const backupData = localStorage.getItem(key);
          if (backupData) {
            const backup = JSON.parse(backupData);
            if (now - backup.timestamp > config.maxBackupAge) {
              localStorage.removeItem(key);
              console.log('Removed old cart backup:', key);
            }
          }
        } catch (error) {
          // Remove corrupted backups
          localStorage.removeItem(key);
        }
      });

      // Keep only the most recent backups
      if (backupKeys.length > config.maxBackupCount) {
        const sortedKeys = backupKeys
          .map(key => {
            const backupData = localStorage.getItem(key);
            return backupData ? { key, timestamp: JSON.parse(backupData).timestamp } : null;
          })
          .filter(Boolean)
          .sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0))
          .slice(config.maxBackupCount);

        sortedKeys.forEach(({ key }) => {
          localStorage.removeItem(key);
          console.log('Removed excess cart backup:', key);
        });
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
    }
  }, [user?.id, config.maxBackupAge, config.maxBackupCount]);

  const acquireOperationLock = useCallback((operationId: string): boolean => {
    if (!config.enableConcurrentProtection) return true;

    if (operationLockRef.current && operationLockRef.current !== operationId) {
      console.warn('Concurrent cart operation detected, operation blocked');
      return false;
    }

    operationLockRef.current = operationId;
    return true;
  }, [config.enableConcurrentProtection]);

  const releaseOperationLock = useCallback(() => {
    operationLockRef.current = null;
  }, []);

  const restoreCartFromBackup = async (backupItems: CartItem[]): Promise<{ restored: CartItem[]; failed: { mediaOutletId: string; reason: string }[] }> => {
    const restoredItems: CartItem[] = [];
    const failedItems: { mediaOutletId: string; reason: string }[] = [];

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
            base_price: backupItem.basePrice || backupItem.price,
            price_multiplier: backupItem.priceMultiplier || 1.0,
            final_price: finalPrice,
            niche_id: backupItem.nicheId,
            quantity: backupItem.quantity || 1,
          })
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
          .single();

        if (error) {
          const reason = error.message || 'Database error during insert';
          console.warn('Failed to restore cart item:', backupItem.mediaOutletId, error);
          failedItems.push({
            mediaOutletId: backupItem.mediaOutletId,
            reason
          });
          continue;
        }

        // Add successfully restored item
        restoredItems.push({
          id: data.id,
          mediaOutletId: data.media_outlet_id,
          price: Number(data.final_price || data.price),
          currency: data.currency,
          addedAt: data.added_at,
          quantity: data.quantity || 1, // Use quantity from database
          domain: data.media_outlets?.domain,
          category: data.media_outlets?.category,
          nicheId: data.niche_id,
          basePrice: Number(data.base_price || data.price),
          priceMultiplier: Number(data.price_multiplier || 1.0),
          finalPrice: Number(data.final_price || data.price),
          nicheName: data.niches?.label,
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error during restore';
        console.warn('Error restoring cart item:', backupItem.mediaOutletId, error);
        failedItems.push({
          mediaOutletId: backupItem.mediaOutletId,
          reason
        });
      }
    }

    return { restored: restoredItems, failed: failedItems };
  };

  const fetchCartItems = useCallback(async () => {
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
        quantity: item.quantity || 1, // Use quantity from database
        domain: item.media_outlets?.domain,
        category: item.media_outlets?.category,
        nicheId: item.niche_id,
        basePrice: Number(item.base_price || item.price),
        priceMultiplier: Number(item.price_multiplier || 1.0),
        finalPrice: Number(item.final_price || item.price),
        nicheName: item.niches?.label,
      }));

      // Enhanced cart recovery with better backup management
      if (items.length === 0) {
        const backup = loadBackup(user.id);

        if (backup && Date.now() - backup.timestamp < config.maxBackupAge) {
          console.log('Restoring cart from enhanced localStorage backup');

          // Try to restore items to database
          const restoreResult = await restoreCartFromBackup(backup.cartItems);

          if (restoreResult.restored.length > 0) {
            items = restoreResult.restored;
            toast({
              title: "Cart Restored",
              description: "Your cart items have been restored from a previous session.",
            });
          }

          // Report any failures
          if (restoreResult.failed.length > 0) {
            console.warn('Some cart items failed to restore:', restoreResult.failed);
            toast({
              title: "Partial Cart Restore",
              description: `${restoreResult.restored.length} items restored, ${restoreResult.failed.length} failed to restore.`,
              variant: "destructive",
            });
          }
        } else if (backup) {
          // Remove old backup
          localStorage.removeItem(`cart_backup_${user.id}`);
        }
      }

      // Auto-backup current cart state
      if (items.length > 0) {
        saveBackup(items);
      }

      setCartItems(items);
    } catch (error) {
      console.error('Error fetching cart items:', error);

      // Enhanced fallback recovery
      const backup = loadBackup(user.id);

      if (backup && Date.now() - backup.timestamp < config.maxBackupAge) {
        // Show items from backup (read-only mode with enhanced UI)
        const backupItems: CartItem[] = backup.cartItems.map((item: CartItem) => ({
          ...item,
          // Mark as read-only since we can't save to database
          readOnly: true
        }));

        setCartItems(backupItems);

        toast({
          title: "Cart Recovered from Backup",
          description: "Cart loaded from backup due to connection issues. Changes will be saved when connection is restored.",
          variant: "destructive",
        });

        return;
      }

      toast({
        title: "Error",
        description: "Failed to load cart items. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, config, loadBackup, saveBackup, restoreCartFromBackup]);


  const addToCart = async (
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

    const operationId = `add_${mediaOutletId}_${Date.now()}`;

    // Acquire operation lock for concurrent protection
    if (!acquireOperationLock(operationId)) {
      toast({
        title: "Operation in Progress",
        description: "Another cart operation is in progress. Please wait.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Check if item already exists in cart
      const existingItem = cartItems.find(item => item.mediaOutletId === mediaOutletId);

      if (existingItem && !existingItem.readOnly) {
        // Update quantity of existing item and persist to database
        const newQuantity = existingItem.quantity + quantity;
        
        // Update quantity in database
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating cart item quantity:', updateError);
          toast({
            title: "Error",
            description: "Failed to update cart quantity. Please try again.",
            variant: "destructive",
          });
          releaseOperationLock();
          return false;
        }

        setCartItems(prev => {
          const updatedItems = prev.map(item =>
            item.id === existingItem.id
              ? { ...item, quantity: newQuantity }
              : item
          );
          
          // Auto-backup after successful quantity update
          setTimeout(() => {
            saveBackup(updatedItems);
          }, 100);
          
          return updatedItems;
        });

        toast({
          title: "Cart updated",
          description: `Quantity updated to ${newQuantity}`,
        });

        releaseOperationLock();
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
          final_price: finalPrice,
          quantity
        });

      if (error) throw error;

      await fetchCartItems();

      // Auto-backup after successful addition
      setTimeout(() => saveBackup(cartItems), 100);

      toast({
        title: "Added to cart",
        description: `Media outlet added to your cart${quantity > 1 ? ` (x${quantity})` : ''}`,
      });

      releaseOperationLock();
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
      releaseOperationLock();
      return false;
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    if (!user) return false;

    const operationId = `remove_${cartItemId}_${Date.now()}`;

    // Acquire operation lock for concurrent protection
    if (!acquireOperationLock(operationId)) {
      toast({
        title: "Operation in Progress",
        description: "Another cart operation is in progress. Please wait.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Check if item is read-only (recovered from backup)
      const item = cartItems.find(item => item.id === cartItemId);
      if (item?.readOnly) {
        toast({
          title: "Cannot Remove Item",
          description: "This item was recovered from backup and cannot be modified.",
          variant: "destructive",
        });
        releaseOperationLock();
        return false;
      }

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId)
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems(items => items.filter(item => item.id !== cartItemId));

      // Auto-backup after successful removal
      setTimeout(() => {
        const updatedItems = cartItems.filter(item => item.id !== cartItemId);
        saveBackup(updatedItems);
      }, 100);

      toast({
        title: "Removed from cart",
        description: "Item removed from your cart",
      });

      releaseOperationLock();
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart. Please try again.",
        variant: "destructive",
      });
      releaseOperationLock();
      return false;
    }
  };

  const clearCart = async () => {
    if (!user) return false;

    const operationId = `clear_${Date.now()}`;

    // Acquire operation lock for concurrent protection
    if (!acquireOperationLock(operationId)) {
      toast({
        title: "Operation in Progress",
        description: "Another cart operation is in progress. Please wait.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems([]);

      // Remove backup after successful clear
      localStorage.removeItem(`cart_backup_${user.id}`);

      toast({
        title: "Cart cleared",
        description: "All items removed from your cart",
      });

      releaseOperationLock();
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart. Please try again.",
        variant: "destructive",
      });
      releaseOperationLock();
      return false;
    }
  };

  // Auto-backup setup
  useEffect(() => {
    if (!user?.id) {
      // Clear auto-backup interval when user logs out
      if (autoBackupIntervalRef.current) {
        clearInterval(autoBackupIntervalRef.current);
        autoBackupIntervalRef.current = null;
      }
      return;
    }

    // Setup auto-backup interval
    autoBackupIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (cartItems.length > 0 && now - lastBackupRef.current >= config.backupInterval) {
        saveBackup(cartItems);
      }

      // Periodic cleanup of old backups
      cleanupOldBackups();
    }, config.backupInterval);

    // Initial cleanup on user login
    cleanupOldBackups();

    // Cleanup on unmount or user change
    return () => {
      if (autoBackupIntervalRef.current) {
        clearInterval(autoBackupIntervalRef.current);
        autoBackupIntervalRef.current = null;
      }
    };
  }, [user?.id, cartItems, config.backupInterval, saveBackup, cleanupOldBackups]);

  useEffect(() => {
    fetchCartItems();
  }, [user?.id]); // Use user.id to trigger when user changes

  const updateCartItemQuantity = async (cartItemId: string, newQuantity: number) => {
    if (!user || newQuantity < 0) return false;

    const operationId = `update_${cartItemId}_${Date.now()}`;

    // Acquire operation lock for concurrent protection
    if (!acquireOperationLock(operationId)) {
      toast({
        title: "Operation in Progress",
        description: "Another cart operation is in progress. Please wait.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const cartItem = cartItems.find(item => item.id === cartItemId);
      if (!cartItem) {
        releaseOperationLock();
        return false;
      }

      // Check if item is read-only (recovered from backup)
      if (cartItem.readOnly) {
        toast({
          title: "Cannot Update Item",
          description: "This item was recovered from backup and cannot be modified.",
          variant: "destructive",
        });
        releaseOperationLock();
        return false;
      }

      if (newQuantity === 0) {
        // Remove item if quantity becomes 0
        releaseOperationLock();
        return await removeFromCart(cartItemId);
      }

      // Update quantity in database
      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating cart item quantity:', updateError);
        toast({
          title: "Error",
          description: "Failed to update item quantity",
          variant: "destructive",
        });
        releaseOperationLock();
        return false;
      }

      setCartItems(prev => {
        const updatedItems = prev.map(item =>
          item.id === cartItemId
            ? { ...item, quantity: newQuantity }
            : item
        );
        
        // Auto-backup after successful quantity update
        setTimeout(() => {
          saveBackup(updatedItems);
        }, 100);
        
        return updatedItems;
      });

      releaseOperationLock();
      return true;
    } catch (error) {
      console.error('Error updating cart item quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update item quantity",
        variant: "destructive",
      });
      releaseOperationLock();
      return false;
    }
  };

  return {
    cartItems,
    loading,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    refetch: fetchCartItems,
    cartCount: cartItems.length
  };
};