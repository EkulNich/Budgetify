/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Normalizes the platform color scheme (which can be `null`) to `'light' | 'dark'`. */
export function useResolvedColorScheme(): 'light' | 'dark' {
  return useColorScheme() ?? 'light';
}

export function useTheme() {
  const scheme = useResolvedColorScheme();

  return Colors[scheme];
}
