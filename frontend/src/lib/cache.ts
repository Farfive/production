import { QueryClient } from '@tanstack/react-query';
import { environment, features } from '../config/environment';

// Cache configuration
export const CACHE_TIMES = {
  SHORT: 1000 * 60 * 5, // 5 minutes
  MEDIUM: 1000 * 60 * 15, // 15 minutes
  LONG: 1000 * 60 * 60, // 1 hour
  VERY_LONG: 1000 * 60 * 60 * 24, // 24 hours
} as const;

// Cache strategies for different data types
export const CACHE_STRATEGIES = {
  // User data - medium cache, important for UX
  USER_PROFILE: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: CACHE_TIMES.LONG,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  // Orders - short cache, needs to be fresh
  ORDERS: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
  
  // Quotes - short cache, frequently updated
  QUOTES: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  },
  
  // Manufacturers - long cache, rarely changes
  MANUFACTURERS: {
    staleTime: CACHE_TIMES.LONG,
    gcTime: CACHE_TIMES.VERY_LONG,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  // Dashboard stats - short cache, real-time data
  DASHBOARD_STATS: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
  
  // Static data - very long cache
  STATIC_DATA: {
    staleTime: CACHE_TIMES.VERY_LONG,
    gcTime: CACHE_TIMES.VERY_LONG,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
} as const;

// Memory management for large datasets
export const MEMORY_LIMITS = {
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_QUERIES: 100,
  CLEANUP_THRESHOLD: 0.8, // Clean up when 80% full
} as const;

// Query client configuration with performance optimizations
export const createOptimizedQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Global defaults
        staleTime: CACHE_TIMES.SHORT,
        gcTime: CACHE_TIMES.MEDIUM,
        retry: environment.maxRetries,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Network-specific optimizations
        networkMode: 'online',
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        
        // Performance optimizations
        structuralSharing: true, // Prevent unnecessary re-renders
        throwOnError: false, // Handle errors gracefully
      },
      mutations: {
        retry: (failureCount, error: any) => {
          // Don't retry client errors (4xx)
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        networkMode: 'online',
      },
    },
  });
};

// Cache management utilities
export class CacheManager {
  private queryClient: QueryClient;
  private cacheMetrics: {
    hits: number;
    misses: number;
    evictions: number;
    totalQueries: number;
  } = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalQueries: 0,
  };

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupCacheMonitoring();
  }

  private setupCacheMonitoring() {
    if (!features.performanceMonitoring) return;

    // Monitor cache performance
    setInterval(() => {
      this.checkMemoryUsage();
      this.cleanupStaleQueries();
    }, 30000); // Check every 30 seconds
  }

  private checkMemoryUsage() {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    if (queries.length > MEMORY_LIMITS.MAX_QUERIES) {
      this.performCacheCleanup();
    }
  }

  private cleanupStaleQueries() {
    const cache = this.queryClient.getQueryCache();
    const now = Date.now();
    
    cache.getAll().forEach(query => {
      const lastFetch = query.state.dataUpdatedAt;
      const staleTime = (query.options as any).staleTime || CACHE_TIMES.SHORT;
      
      if (now - lastFetch > staleTime * 2) {
        // Remove queries that are very stale
        cache.remove(query);
        this.cacheMetrics.evictions++;
      }
    });
  }

  private performCacheCleanup() {
    if (features.apiLogging) {
      console.log('Performing cache cleanup due to memory limits');
    }
    
    // Clear all but essential caches
    this.queryClient.getQueryCache().clear();
    this.cacheMetrics.evictions++;
  }

  // Prefetch commonly used data
  public async prefetchCriticalData() {
    if (!features.performanceMonitoring) return;

    try {
      // Prefetch user profile if authenticated
      const token = localStorage.getItem('accessToken');
      if (token) {
        await this.queryClient.prefetchQuery({
          queryKey: ['auth', 'profile'],
          queryFn: () => import('../lib/api').then(api => api.authApi.getProfile()),
          ...CACHE_STRATEGIES.USER_PROFILE,
        });
      }

      // Prefetch manufacturers (commonly accessed)
      await this.queryClient.prefetchQuery({
        queryKey: ['manufacturers'],
        queryFn: () => import('../lib/api').then(api => api.manufacturersApi.getAll()),
        ...CACHE_STRATEGIES.MANUFACTURERS,
      });

    } catch (error) {
      if (features.apiLogging) {
        console.warn('Failed to prefetch critical data:', error);
      }
    }
  }

  // Smart cache warming for user behavior patterns
  public warmCacheForUser(userRole: string) {
    switch (userRole) {
      case 'CLIENT':
        this.warmClientCache();
        break;
      case 'MANUFACTURER':
        this.warmManufacturerCache();
        break;
      case 'ADMIN':
        this.warmAdminCache();
        break;
    }
  }

  private async warmClientCache() {
    // Prefetch data commonly accessed by clients
    const prefetchPromises = [
      this.queryClient.prefetchQuery({
        queryKey: ['orders'],
        queryFn: () => import('../lib/api').then(api => api.ordersApi.getOrders()),
        ...CACHE_STRATEGIES.ORDERS,
      }),
      this.queryClient.prefetchQuery({
        queryKey: ['quotes'],
        queryFn: () => import('../lib/api').then(api => api.quotesApi.getQuotes()),
        ...CACHE_STRATEGIES.QUOTES,
      }),
    ];

    try {
      await Promise.allSettled(prefetchPromises);
    } catch (error) {
      if (features.apiLogging) {
        console.warn('Failed to warm client cache:', error);
      }
    }
  }

  private async warmManufacturerCache() {
    // Prefetch data commonly accessed by manufacturers
    const prefetchPromises = [
      this.queryClient.prefetchQuery({
        queryKey: ['manufacturer', 'orders'],
        queryFn: () => import('../lib/api').then(api => api.ordersApi.getOrders()),
        ...CACHE_STRATEGIES.ORDERS,
      }),
      this.queryClient.prefetchQuery({
        queryKey: ['manufacturer', 'dashboard'],
        queryFn: () => import('../lib/api').then(api => api.dashboardApi.getManufacturerStats()),
        ...CACHE_STRATEGIES.DASHBOARD_STATS,
      }),
    ];

    try {
      await Promise.allSettled(prefetchPromises);
    } catch (error) {
      if (features.apiLogging) {
        console.warn('Failed to warm manufacturer cache:', error);
      }
    }
  }

  private async warmAdminCache() {
    // Prefetch data commonly accessed by admins
    const prefetchPromises = [
      this.queryClient.prefetchQuery({
        queryKey: ['admin', 'users'],
        queryFn: () => import('../lib/api').then(api => api.default.get('/admin/users')),
        ...CACHE_STRATEGIES.STATIC_DATA,
      }),
    ];

    try {
      await Promise.allSettled(prefetchPromises);
    } catch (error) {
      if (features.apiLogging) {
        console.warn('Failed to warm admin cache:', error);
      }
    }
  }

  // Cache invalidation strategies
  public invalidateUserData() {
    this.queryClient.invalidateQueries({ queryKey: ['auth'] });
    this.queryClient.invalidateQueries({ queryKey: ['user'] });
  }

  public invalidateOrderData() {
    this.queryClient.invalidateQueries({ queryKey: ['orders'] });
    this.queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }

  public invalidateQuoteData() {
    this.queryClient.invalidateQueries({ queryKey: ['quotes'] });
  }

  // Cache metrics and reporting
  public getCacheMetrics() {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      ...this.cacheMetrics,
      totalQueries: queries.length,
      hitRate: this.cacheMetrics.totalQueries > 0 
        ? (this.cacheMetrics.hits / this.cacheMetrics.totalQueries) * 100 
        : 0,
      cacheSize: this.estimateCacheSize(queries),
    };
  }

  private estimateCacheSize(queries: any[]): number {
    // Rough estimation of cache size
    return queries.reduce((total, query) => {
      const dataSize = JSON.stringify(query.state.data || {}).length;
      return total + dataSize;
    }, 0);
  }

  // Background sync for offline support
  public setupBackgroundSync() {
    if (!('serviceWorker' in navigator)) return;

    // Register for background sync when online
    navigator.serviceWorker.ready.then(registration => {
      if ('sync' in registration) {
        return (registration.sync as any).register('background-sync');
      }
    }).catch(error => {
      if (features.apiLogging) {
        console.warn('Background sync setup failed:', error);
      }
    });
  }

  // Clear all cache data
  public clearAll() {
    this.queryClient.clear();
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalQueries: 0,
    };
  }
}

// Export singleton instance
let cacheManager: CacheManager | null = null;

export const getCacheManager = (queryClient: QueryClient): CacheManager => {
  if (!cacheManager) {
    cacheManager = new CacheManager(queryClient);
  }
  return cacheManager;
};

// Utility functions for cache optimization
export const optimizeQueryKey = (key: string[]): string[] => {
  // Normalize query keys for better cache hits
  return key.map(k => 
    typeof k === 'string' ? k.toLowerCase().trim() : k
  );
};

export const shouldRefetchOnWindowFocus = (queryKey: string[]): boolean => {
  // Determine if query should refetch on window focus based on data type
  const keyString = queryKey.join('/');
  
  if (keyString.includes('orders') || keyString.includes('dashboard')) {
    return true; // Real-time data
  }
  
  if (keyString.includes('manufacturers') || keyString.includes('static')) {
    return false; // Static data
  }
  
  return false; // Default to not refetching
};

export default CacheManager; 