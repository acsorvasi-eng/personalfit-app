import { useEffect } from 'react';

/**
 * Updates the <meta name="theme-color"> tag dynamically.
 * Affects the browser chrome / status bar color on Android Chrome
 * and some iOS versions.
 */
export function useThemeColor(color: string) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', color);
    }
    return () => {
      // Reset to default light on unmount
      if (meta) meta.setAttribute('content', '#ffffff');
    };
  }, [color]);
}
