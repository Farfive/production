/**
 * Optimized lazy loading image component with performance tracking
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { performanceMonitor } from '../utils/performance';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string;
  webpSrc?: string;
  sizes?: string;
  srcSet?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: (error: Error) => void;
  quality?: number;
  blur?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder,
  webpSrc,
  sizes,
  srcSet,
  loading = 'lazy',
  onLoad,
  onError,
  quality = 85,
  blur = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder || '');
  const imgRef = useRef<HTMLImageElement>(null);
  const loadStartTime = useRef<number>(0);
  
  // Intersection observer for lazy loading
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    rootMargin: '50px',
  });
  
  // Combine refs
  const setRefs = (element: HTMLImageElement | null) => {
    // Use type assertion to bypass readonly restriction
    (imgRef as React.MutableRefObject<HTMLImageElement | null>).current = element;
    inViewRef(element);
  };
  
  // Check WebP support
  const supportsWebP = useRef<boolean | null>(null);
  
  useEffect(() => {
    if (supportsWebP.current === null) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      supportsWebP.current = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
  }, []);
  
  const getOptimalImageSrc = useCallback((): string => {
    // Use WebP if supported and available
    if (supportsWebP.current && webpSrc) {
      return webpSrc;
    }
    
    // Add quality parameter for JPEG images
    if (src.includes('.jpg') || src.includes('.jpeg')) {
      const separator = src.includes('?') ? '&' : '?';
      return `${src}${separator}quality=${quality}`;
    }
    
    return src;
  }, [src, webpSrc, quality]);
  
  const loadImage = useCallback(async () => {
    if (!src) return;
    
    loadStartTime.current = performance.now();
    
    try {
      // Choose optimal image format
      const imageSrc = getOptimalImageSrc();
      
      // Preload the image
      const img = new Image();
      
      img.onload = () => {
        const loadTime = performance.now() - loadStartTime.current;
        
        // Track performance
        performanceMonitor.trackCustomMetric(`image_load_time_${alt}`, loadTime);
        
        setCurrentSrc(imageSrc);
        setIsLoaded(true);
        onLoad?.();
        
        // Log slow image loads
        if (loadTime > 2000) {
          console.warn(`Slow image load: ${alt} took ${loadTime}ms`);
        }
      };
      
      img.onerror = () => {
        const loadTime = performance.now() - loadStartTime.current;
        const error = new Error(`Failed to load image: ${alt}`);
        
        performanceMonitor.trackError(error, {
          src: imageSrc,
          loadTime,
          alt,
        });
        
        setIsError(true);
        onError?.(error);
      };
      
      // Set srcset for responsive images
      if (srcSet) {
        img.srcset = srcSet;
      }
      
      if (sizes) {
        img.sizes = sizes;
      }
      
      img.src = imageSrc;
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Image load failed');
      performanceMonitor.trackError(err, { src, alt });
      setIsError(true);
      onError?.(err);
    }
  }, [src, alt, srcSet, sizes, getOptimalImageSrc, onLoad, onError]);
  
  // Load image when in view
  useEffect(() => {
    if (inView && !isLoaded && !isError) {
      loadImage();
    }
  }, [inView, isLoaded, isError, loadImage]);
  
  const getImageStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : 'auto',
      transition: 'opacity 0.3s ease-in-out',
    };
    
    if (!isLoaded && blur) {
      baseStyle.filter = 'blur(5px)';
    }
    
    if (isLoaded) {
      baseStyle.opacity = 1;
    } else {
      baseStyle.opacity = placeholder ? 0.7 : 0;
    }
    
    return baseStyle;
  };
  
  const handleImageLoad = () => {
    setIsLoaded(true);
  };
  
  const handleImageError = () => {
    setIsError(true);
  };
  
  // Render error state
  if (isError) {
    return (
      <div
        className={`lazy-image-error ${className}`}
        style={{
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : '200px',
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '14px',
        }}
      >
        Failed to load image
      </div>
    );
  }
  
  return (
    <div className={`lazy-image-container ${className}`} style={{ position: 'relative' }}>
      {/* Placeholder or blurred version */}
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt={`${alt} placeholder`}
          style={{
            ...getImageStyle(),
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        />
      )}
      
      {/* Main image */}
      <img
        ref={setRefs}
        src={currentSrc}
        alt={alt}
        className={className}
        style={{
          ...getImageStyle(),
          position: 'relative',
          zIndex: 2,
        }}
        loading={loading}
        onLoad={handleImageLoad}
        onError={handleImageError}
        width={width}
        height={height}
        sizes={sizes}
        srcSet={srcSet}
      />
      
      {/* Loading indicator */}
      {!isLoaded && !isError && inView && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 3,
          }}
        >
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
};

// Higher-order component for image optimization
export function withImageOptimization<P extends { src: string }>(
  WrappedComponent: React.ComponentType<P>
) {
  return function OptimizedImageComponent(props: P) {
    const optimizedProps = {
      ...props,
      src: optimizeImageUrl(props.src),
    };
    
    return React.createElement(WrappedComponent, optimizedProps);
  };
}

// Utility function to optimize image URLs
function optimizeImageUrl(src: string): string {
  if (!src) return src;
  
  // Add optimization parameters based on device capabilities
  const devicePixelRatio = window.devicePixelRatio || 1;
  const isRetina = devicePixelRatio > 1;
  
  // Add format and quality parameters
  const separator = src.includes('?') ? '&' : '?';
  let optimizedUrl = src;
  
  // Add quality parameter
  if (!src.includes('quality=')) {
    optimizedUrl += `${separator}quality=${isRetina ? 90 : 85}`;
  }
  
  // Add format parameter for modern browsers
  if (!src.includes('format=') && supportsWebP()) {
    optimizedUrl += `&format=webp`;
  }
  
  return optimizedUrl;
}

// Check WebP support
function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

// Image preloader utility
export class ImagePreloader {
  private cache = new Map<string, HTMLImageElement>();
  
  preload(src: string): Promise<HTMLImageElement> {
    if (this.cache.has(src)) {
      return Promise.resolve(this.cache.get(src)!);
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache.set(src, img);
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to preload image: ${src}`));
      };
      
      img.src = src;
    });
  }
  
  preloadMultiple(sources: string[]): Promise<HTMLImageElement[]> {
    return Promise.all(sources.map(src => this.preload(src)));
  }
  
  clearCache() {
    this.cache.clear();
  }
  
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Global image preloader instance
export const imagePreloader = new ImagePreloader(); 