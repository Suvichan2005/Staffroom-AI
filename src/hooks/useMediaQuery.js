import { useState, useEffect, useCallback } from 'react';

/**
 * Breakpoint values matching Tailwind defaults
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Hook to detect current breakpoint and screen size
 * 
 * @returns {Object} - { isMobile, isTablet, isDesktop, isWide, width, height, breakpoint }
 */
export function useMediaQuery() {
  const [state, setState] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setState({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Debounce resize handler
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    handleResize(); // Initial call

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const { width, height } = state;

  // Determine current breakpoint
  const getBreakpoint = useCallback(() => {
    if (width < breakpoints.sm) return 'xs';
    if (width < breakpoints.md) return 'sm';
    if (width < breakpoints.lg) return 'md';
    if (width < breakpoints.xl) return 'lg';
    if (width < breakpoints['2xl']) return 'xl';
    return '2xl';
  }, [width]);

  return {
    width,
    height,
    breakpoint: getBreakpoint(),
    isMobile: width < breakpoints.md,      // < 768px
    isTablet: width >= breakpoints.md && width < breakpoints.lg,  // 768-1023px
    isDesktop: width >= breakpoints.lg,    // >= 1024px
    isWide: width >= breakpoints.xl,       // >= 1280px
    isSmall: width < breakpoints.sm,       // < 640px (phones)
  };
}

/**
 * Hook to match a specific media query
 * 
 * @param {string} query - CSS media query string
 * @returns {boolean}
 */
export function useMatchMedia(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    const handleChange = (event) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Legacy support
      mediaQuery.addListener(handleChange);
    }

    // Set initial value
    setMatches(mediaQuery.matches);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Hook to detect touch device
 */
export function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };

    checkTouch();
  }, []);

  return isTouch;
}

/**
 * Hook to detect reduced motion preference
 */
export function useReducedMotion() {
  return useMatchMedia('(prefers-reduced-motion: reduce)');
}

/**
 * Hook to detect dark mode preference
 */
export function useDarkMode() {
  return useMatchMedia('(prefers-color-scheme: dark)');
}

export default useMediaQuery;
