/**
 * Performance Optimization Utilities
 * - Memoization
 * - Debouncing
 * - Throttling
 * - Request deduplication
 */

/**
 * Creates a debounced version of a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Creates a throttled version of a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoization for expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map();

  return function memoized(...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Request deduplication - prevent duplicate API calls
 */
export function dedupRequest<T>(
  requestFn: () => Promise<T>
): () => Promise<T> {
  let pending: Promise<T> | null = null;

  return async () => {
    if (pending) {
      return pending;
    }

    pending = requestFn().finally(() => {
      pending = null;
    });

    return pending;
  };
}

/**
 * Lazy load images with IntersectionObserver
 */
export function lazyLoadImages(selector: string = 'img[data-src]'): void {
  if (!('IntersectionObserver' in window)) {
    // Fallback for older browsers
    const images = document.querySelectorAll(selector);
    images.forEach((img: any) => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
    return;
  }

  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as any;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    },
    {
      rootMargin: '50px'
    }
  );

  const images = document.querySelectorAll(selector);
  images.forEach((img) => imageObserver.observe(img));
}

/**
 * Preload resources
 */
export function preloadResource(url: string, type: 'script' | 'style' | 'image'): void {
  const link = document.createElement('link');
  link.rel = type === 'script' ? 'prefetch' : type === 'style' ? 'stylesheet' : 'preload';
  
  if (type === 'image') {
    link.as = 'image';
  } else if (type === 'script') {
    link.as = 'script';
  }
  
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Batch DOM updates
 */
export function batchUpdate(callback: () => void): void {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback);
  } else {
    requestAnimationFrame(callback);
  }
}

/**
 * Measure performance
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  start(label: string): void {
    this.marks.set(label, performance.now());
  }

  end(label: string): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`No start mark for ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(label);

    if (import.meta.env.MODE === 'development') {
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }
}

export const perfMonitor = new PerformanceMonitor();
