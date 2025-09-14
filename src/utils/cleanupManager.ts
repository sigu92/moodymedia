// Cleanup manager for event listeners and timers to prevent memory leaks

interface CleanupItem {
  id: string;
  type: 'timeout' | 'interval' | 'listener' | 'subscription' | 'controller';
  cleanup: () => void;
  createdAt: number;
  context?: string;
}

class CleanupManager {
  private items = new Map<string, CleanupItem>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private maxAge = 30 * 60 * 1000; // 30 minutes max age for cleanup items

  constructor() {
    // Start periodic cleanup
    this.startPeriodicCleanup();

    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanupAll());
      window.addEventListener('unload', () => this.cleanupAll());
    }
  }

  /**
   * Register a timeout for cleanup
   */
  registerTimeout(id: string, timeout: NodeJS.Timeout, context?: string): void {
    this.registerItem({
      id,
      type: 'timeout',
      cleanup: () => clearTimeout(timeout),
      createdAt: Date.now(),
      context,
    });
  }

  /**
   * Register an interval for cleanup
   */
  registerInterval(id: string, interval: NodeJS.Timeout, context?: string): void {
    this.registerItem({
      id,
      type: 'interval',
      cleanup: () => clearInterval(interval),
      createdAt: Date.now(),
      context,
    });
  }

  /**
   * Register an event listener for cleanup
   */
  registerEventListener(
    id: string,
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions,
    context?: string
  ): void {
    this.registerItem({
      id,
      type: 'listener',
      cleanup: () => element.removeEventListener(event, handler, options),
      createdAt: Date.now(),
      context,
    });
  }

  /**
   * Register an AbortController for cleanup
   */
  registerAbortController(id: string, controller: AbortController, context?: string): void {
    this.registerItem({
      id,
      type: 'controller',
      cleanup: () => controller.abort(),
      createdAt: Date.now(),
      context,
    });
  }

  /**
   * Register a subscription for cleanup
   */
  registerSubscription(id: string, unsubscribe: () => void, context?: string): void {
    this.registerItem({
      id,
      type: 'subscription',
      cleanup: unsubscribe,
      createdAt: Date.now(),
      context,
    });
  }

  /**
   * Register a generic cleanup function
   */
  registerCleanup(id: string, cleanup: () => void, context?: string): void {
    this.registerItem({
      id,
      type: 'subscription', // Using subscription type for generic cleanups
      cleanup,
      createdAt: Date.now(),
      context,
    });
  }

  /**
   * Unregister a specific item
   */
  unregister(id: string): void {
    const item = this.items.get(id);
    if (item) {
      try {
        item.cleanup();
      } catch (error) {
        console.warn(`Error cleaning up item ${id}:`, error);
      }
      this.items.delete(id);
    }
  }

  /**
   * Unregister all items matching a pattern
   */
  unregisterPattern(pattern: string | RegExp): void {
    const idsToRemove: string[] = [];

    for (const [id] of this.items) {
      const matches = typeof pattern === 'string'
        ? id.includes(pattern)
        : pattern.test(id);

      if (matches) {
        idsToRemove.push(id);
      }
    }

    idsToRemove.forEach(id => this.unregister(id));
  }

  /**
   * Unregister all items for a specific context
   */
  unregisterContext(context: string): void {
    const idsToRemove: string[] = [];

    for (const [id, item] of this.items) {
      if (item.context === context) {
        idsToRemove.push(id);
      }
    }

    idsToRemove.forEach(id => this.unregister(id));
  }

  /**
   * Get cleanup statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    oldest: number;
    newest: number;
  } {
    const byType: Record<string, number> = {};
    let oldest = Date.now();
    let newest = 0;

    for (const item of this.items.values()) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      oldest = Math.min(oldest, item.createdAt);
      newest = Math.max(newest, item.createdAt);
    }

    return {
      total: this.items.size,
      byType,
      oldest: oldest === Date.now() ? 0 : oldest,
      newest: newest === 0 ? 0 : newest,
    };
  }

  /**
   * Cleanup all registered items
   */
  cleanupAll(): void {
    console.log(`Cleaning up ${this.items.size} registered items`);

    for (const [id, item] of this.items) {
      try {
        item.cleanup();
      } catch (error) {
        console.warn(`Error cleaning up item ${id}:`, error);
      }
    }

    this.items.clear();
  }

  /**
   * Private method to register an item
   */
  private registerItem(item: CleanupItem): void {
    // Check if item already exists
    if (this.items.has(item.id)) {
      console.warn(`Cleanup item ${item.id} already exists, cleaning up old one`);
      this.unregister(item.id);
    }

    this.items.set(item.id, item);

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Registered cleanup item: ${item.id} (${item.type})`);
    }
  }

  /**
   * Start periodic cleanup of old items
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupOldItems();
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    // Register the cleanup timer itself for cleanup
    this.registerInterval('cleanup-timer', this.cleanupTimer, 'system');
  }

  /**
   * Cleanup old items that exceed max age
   */
  private cleanupOldItems(): void {
    const now = Date.now();
    const idsToRemove: string[] = [];

    for (const [id, item] of this.items) {
      if (now - item.createdAt > this.maxAge) {
        idsToRemove.push(id);
      }
    }

    if (idsToRemove.length > 0) {
      console.log(`Cleaning up ${idsToRemove.length} old cleanup items`);
      idsToRemove.forEach(id => this.unregister(id));
    }
  }

  /**
   * Destroy the cleanup manager
   */
  destroy(): void {
    this.cleanupAll();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Global cleanup manager instance
export const cleanupManager = new CleanupManager();

// Convenience functions for common use cases
export const cleanupUtils = {
  /**
   * Create a debounced function with automatic cleanup
   */
  createDebounce: <T extends unknown[]>(callback: (...args: T) => void, delay: number, context?: string) => {
    let timeout: NodeJS.Timeout | null = null;
    const id = `debounce-${Date.now()}-${Math.random()}`;

    const debounced = (...args: T) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        callback(...args);
      }, delay);

      if (timeout) {
        cleanupManager.registerTimeout(id, timeout, context);
      }
    };

    // Override the cleanup to handle the timeout properly
    const originalUnregister = cleanupManager.unregister.bind(cleanupManager);
    const customCleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      originalUnregister(id);
    };

    cleanupManager.registerCleanup(id, customCleanup, context);

    return debounced;
  },

  /**
   * Create a throttled function with automatic cleanup
   */
  createThrottle: <A extends unknown[]>(callback: (...args: A) => void, delay: number, context?: string) => {
    let timeout: NodeJS.Timeout | null = null;
    let lastExec = 0;
    const id = `throttle-${Date.now()}-${Math.random()}`;

    const throttled = (...args: A) => {
      const now = Date.now();

      if (now - lastExec < delay) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          lastExec = Date.now();
          callback(...args);
        }, delay - (now - lastExec));
      } else {
        lastExec = now;
        callback(...args);
      }

      if (timeout) {
        cleanupManager.registerTimeout(id, timeout, context);
      }
    };

    return throttled;
  },

  /**
   * Register a React ref cleanup
   */
  registerRefCleanup: (id: string, element: HTMLElement | null, context?: string) => {
    if (!element) return;

    const cleanup = () => {
      // Clean up any event listeners or other resources associated with the element
      // This is a placeholder - implement specific cleanup logic as needed
    };

    cleanupManager.registerCleanup(id, cleanup, context);
  },

  /**
   * Register a ResizeObserver cleanup
   */
  registerResizeObserver: (id: string, observer: ResizeObserver, context?: string) => {
    cleanupManager.registerCleanup(id, () => observer.disconnect(), context);
  },

  /**
   * Register an IntersectionObserver cleanup
   */
  registerIntersectionObserver: (id: string, observer: IntersectionObserver, context?: string) => {
    cleanupManager.registerCleanup(id, () => observer.disconnect(), context);
  },

  /**
   * Register a MutationObserver cleanup
   */
  registerMutationObserver: (id: string, observer: MutationObserver, context?: string) => {
    cleanupManager.registerCleanup(id, () => observer.disconnect(), context);
  },
};

// Performance monitoring for cleanup operations
export class CleanupPerformanceMonitor {
  private static cleanupTimes: number[] = [];
  private static totalCleanups = 0;

  static recordCleanup(cleanupTime: number): void {
    this.cleanupTimes.push(cleanupTime);
    this.totalCleanups++;

    // Keep only last 100 measurements
    if (this.cleanupTimes.length > 100) {
      this.cleanupTimes = this.cleanupTimes.slice(-100);
    }
  }

  static getMetrics(): {
    totalCleanups: number;
    averageCleanupTime: number;
    maxCleanupTime: number;
    minCleanupTime: number;
  } {
    if (this.cleanupTimes.length === 0) {
      return {
        totalCleanups: 0,
        averageCleanupTime: 0,
        maxCleanupTime: 0,
        minCleanupTime: 0,
      };
    }

    return {
      totalCleanups: this.totalCleanups,
      averageCleanupTime: this.cleanupTimes.reduce((sum, time) => sum + time, 0) / this.cleanupTimes.length,
      maxCleanupTime: Math.max(...this.cleanupTimes),
      minCleanupTime: Math.min(...this.cleanupTimes),
    };
  }

  static reset(): void {
    this.cleanupTimes = [];
    this.totalCleanups = 0;
  }
}

// Export cleanup function for app-wide cleanup
export const cleanupAllResources = () => {
  const startTime = performance.now();
  cleanupManager.cleanupAll();
  const cleanupTime = performance.now() - startTime;
  CleanupPerformanceMonitor.recordCleanup(cleanupTime);
};
