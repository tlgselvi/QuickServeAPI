import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  emptyMessage?: string;
}

interface VirtualScrollState {
  scrollTop: number;
  startIndex: number;
  endIndex: number;
  visibleItems: any[];
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  loading = false,
  emptyMessage = 'Veri bulunamadı',
}: VirtualScrollProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  // Calculate total height
  const totalHeight = items.length * itemHeight;

  // Calculate offset for visible items
  const offsetY = visibleRange.startIndex * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Performance optimization: Throttle scroll events
  const throttledHandleScroll = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (e: React.UIEvent<HTMLDivElement>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => handleScroll(e), 16); // ~60fps
    };
  }, [handleScroll]);

  // Reset scroll when items change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length]);

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height: containerHeight }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height: containerHeight }}
      >
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={throttledHandleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.startIndex + index;
            return (
              <div
                key={actualIndex}
                style={{ height: itemHeight }}
                className="flex items-center"
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Hook for virtual scroll with pagination
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
    setIsScrolling(true);
    
    // Reset scrolling state after a short delay
    setTimeout(() => setIsScrolling(false), 150);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const targetScrollTop = index * itemHeight;
    setScrollTop(targetScrollTop);
  }, [itemHeight]);

  const scrollToTop = useCallback(() => {
    setScrollTop(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    setScrollTop(totalHeight - containerHeight);
  }, [totalHeight, containerHeight]);

  return {
    scrollTop,
    visibleRange,
    visibleItems,
    totalHeight,
    offsetY,
    isScrolling,
    handleScroll,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
  };
}

// Performance monitoring hook
export function useVirtualScrollPerformance() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    scrollEvents: 0,
    frameRate: 0,
  });

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  useEffect(() => {
    const measureFrameRate = () => {
      const now = performance.now();
      frameCountRef.current++;
      
      if (now - lastFrameTimeRef.current >= 1000) {
        const frameRate = Math.round((frameCountRef.current * 1000) / (now - lastFrameTimeRef.current));
        setMetrics(prev => ({ ...prev, frameRate }));
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }
      
      requestAnimationFrame(measureFrameRate);
    };

    const rafId = requestAnimationFrame(measureFrameRate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const measureRenderTime = useCallback((fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    setMetrics(prev => ({ ...prev, renderTime: end - start }));
  }, []);

  const incrementScrollEvents = useCallback(() => {
    setMetrics(prev => ({ ...prev, scrollEvents: prev.scrollEvents + 1 }));
  }, []);

  return {
    metrics,
    measureRenderTime,
    incrementScrollEvents,
  };
}
