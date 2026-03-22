import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export async function hapticFeedback(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const styleKey = (style.charAt(0).toUpperCase() + style.slice(1)) as keyof typeof ImpactStyle;
    await Haptics.impact({ style: ImpactStyle[styleKey] });
  } else {
    navigator?.vibrate?.(10);
  }
}
