// Cart data caching system for improved performance

import { CartItem } from '@/hooks/useCart';
import { MediaOutlet } from '@/types';

// Search filters interface
interface SearchFilters {
  search?: string;
  country?: string;
  language?: string;
  category?: string;
  priceMin?: string;
  priceMax?: string;
  minDR?: string;
  maxDR?: string;
  minOrganicTraffic?: string;
  maxSpamScore?: string;
  acceptedNiches?: string[];
  acceptsNoLicense?: string;
  sponsorTag?: string;
  onSale?: boolean;
  showLowMetricSites?: boolean;
}

// Cache statistics interface
interface CacheStats {
  totalRequests: number;
  hits: number;
  misses: number;
  evictions: number;
  lastCleanup: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CartCacheConfig {
  maxSize: number; // Maximum number of entries
  defaultTTL: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
}

class CartDataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CartCacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CartCacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      ...config,
    };

    this.startCleanupTimer();
  }

  /**
   * Set cache entry with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Check if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    this.cache.set(key, entry);
  }

  /**
   * Get cache entry if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());

    const expired = entries.filter(entry => now - entry.timestamp > entry.ttl).length;
    const valid = entries.length - expired;

    return {
      total: entries.length,
      valid,
      expired,
      hitRate: 0, // Would need to track hits/misses
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Evict oldest entry when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Global cart cache instance
export const cartCache = new CartDataCache({
  maxSize: 200, // Store up to 200 different cart-related data items
  defaultTTL: 10 * 60 * 1000, // 10 minutes default TTL
  cleanupInterval: 2 * 60 * 1000, // Clean up every 2 minutes
});

// Cache key generators
export const cacheKeys = {
  // Cart data keys
  cartItems: (userId: string) => `cart:items:${userId}`,
  cartTotal: (userId: string) => `cart:total:${userId}`,
  cartCount: (userId: string) => `cart:count:${userId}`,

  // Media outlet data keys
  mediaOutlet: (id: string) => `media_outlet:${id}`,
  mediaOutletList: (filters: string) => `media_outlets:${filters}`,

  // User preferences
  userSettings: (userId: string) => `user_settings:${userId}`,
  userBillingInfo: (userId: string) => `user_billing:${userId}`,

  // Checkout data
  checkoutForm: (userId: string, step: string) => `checkout:form:${userId}:${step}`,
  checkoutValidation: (userId: string, step: string) => `checkout:validation:${userId}:${step}`,

  // Search and filter results
  searchResults: (query: string, filters: string) => `search:${query}:${filters}`,
  filterResults: (filters: string) => `filters:${filters}`,
};

// Cache utilities
export class CartCacheUtils {
  /**
   * Cache cart items with computed values
   */
  static setCartData(userId: string, items: CartItem[]): void {
    const total = items.reduce((sum, item) => sum + (item.finalPrice || item.price) * (item.quantity ?? 1), 0);
    const count = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

    cartCache.set(cacheKeys.cartItems(userId), items);
    cartCache.set(cacheKeys.cartTotal(userId), total, 30 * 1000); // 30 seconds for totals
    cartCache.set(cacheKeys.cartCount(userId), count, 30 * 1000);
  }

  /**
   * Get cached cart data
   */
  static getCartData(userId: string): {
    items: CartItem[] | null;
    total: number | null;
    count: number | null;
  } {
    return {
      items: cartCache.get(cacheKeys.cartItems(userId)),
      total: cartCache.get(cacheKeys.cartTotal(userId)),
      count: cartCache.get(cacheKeys.cartCount(userId)),
    };
  }

  /**
   * Invalidate cart cache
   */
  static invalidateCartCache(userId: string): void {
    cartCache.delete(cacheKeys.cartItems(userId));
    cartCache.delete(cacheKeys.cartTotal(userId));
    cartCache.delete(cacheKeys.cartCount(userId));
  }

  /**
   * Cache media outlet data
   */
  static setMediaOutletData(id: string, data: MediaOutlet): void {
    cartCache.set(cacheKeys.mediaOutlet(id), data, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Get cached media outlet data
   */
  static getMediaOutletData(id: string): MediaOutlet | null {
    return cartCache.get(cacheKeys.mediaOutlet(id));
  }

  /**
   * Cache search results
   */
  static setSearchResults(query: string, filters: SearchFilters, results: MediaOutlet[]): void {
    const filterString = JSON.stringify(filters);
    cartCache.set(cacheKeys.searchResults(query, filterString), results, 2 * 60 * 1000); // 2 minutes
  }

  /**
   * Get cached search results
   */
  static getSearchResults(query: string, filters: SearchFilters): MediaOutlet[] | null {
    const filterString = JSON.stringify(filters);
    return cartCache.get(cacheKeys.searchResults(query, filterString));
  }

  /**
   * Preload critical data
   */
  static async preloadCriticalData(userId: string): Promise<void> {
    // This would be called when the app starts or user logs in
    // Implementation depends on your data fetching logic
    console.log(`Preloading critical data for user ${userId}`);
  }

  /**
   * Warm up cache with frequently accessed data
   */
  static warmUpCache(userId: string, recentItems: CartItem[]): void {
    // Cache recent cart items
    if (recentItems.length > 0) {
      this.setCartData(userId, recentItems);
    }

    // Cache user settings if available
    // This would typically be called after user authentication
    console.log(`Warming up cache for user ${userId}`);
  }

  /**
   * Get cache performance metrics
   */
  static getCacheMetrics(): {
    size: number;
    stats: CacheStats;
    hitRate: number;
  } {
    return {
      size: cartCache.size(),
      stats: cartCache.getStats(),
      hitRate: 0, // Would need to implement hit/miss tracking
    };
  }

  /**
   * Clear all cached data
   */
  static clearAllCache(): void {
    cartCache.clear();
  }

  /**
   * Cleanup expired entries
   */
  static cleanupExpiredEntries(): void {
    // Force cleanup
    // Note: This is automatically handled by the cache, but can be called manually
    console.log('Manual cleanup of expired cache entries');
  }
}

// Performance monitoring
export class CachePerformanceMonitor {
  private static hits = 0;
  private static misses = 0;
  private static accessTimes: number[] = [];

  static recordHit(accessTime: number): void {
    this.hits++;
    this.accessTimes.push(accessTime);
    this.maintainHistory();
  }

  static recordMiss(): void {
    this.misses++;
  }

  static getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }

  static getAverageAccessTime(): number {
    if (this.accessTimes.length === 0) return 0;
    return this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length;
  }

  static getMetrics(): {
    hits: number;
    misses: number;
    hitRate: number;
    averageAccessTime: number;
    totalAccesses: number;
  } {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      averageAccessTime: this.getAverageAccessTime(),
      totalAccesses: this.hits + this.misses,
    };
  }

  private static maintainHistory(): void {
    // Keep only last 1000 access times
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-1000);
    }
  }

  static reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.accessTimes = [];
  }
}

// Export for cleanup
export const cleanupCartCache = () => {
  cartCache.destroy();
  CachePerformanceMonitor.reset();
};
