
'use client';

import { useEffect } from 'react';
import { useTheme } from './theme-provider';

// Converte HEX in HSL string per CSS variables
function hexToHsl(hex: string): string {
  if (!hex) return "0 0% 0%";
  hex = hex.replace(/^#/, '');

  const bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDisplay = Math.round(h * 360);
  const sDisplay = Math.round(s * 100);
  const lDisplay = Math.round(l * 100);

  return `${hDisplay} ${sDisplay}% ${lDisplay}%`;
}

// Calcola la luminanza relativa di un colore HEX (0 = nero, 1 = bianco)
function getLuminance(hex: string): number {
  if (!hex) return 0;
  hex = hex.replace(/^#/, '');
  const bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;

  const toLinear = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Restituisce HSL bianco o nero in base al contrasto
function getContrastHsl(hex: string): string {
  return getLuminance(hex) > 0.4 ? "0 0% 5%" : "0 0% 98%";
}


export function ThemeUpdater() {
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;

    if (theme.primaryColor) {
      root.style.setProperty('--primary', hexToHsl(theme.primaryColor));
      root.style.setProperty('--brand', hexToHsl(theme.primaryColor));
      root.style.setProperty('--ring', hexToHsl(theme.primaryColor));
      root.style.setProperty('--primary-foreground', getContrastHsl(theme.primaryColor));
      root.style.setProperty('--brand-foreground', getContrastHsl(theme.primaryColor));
    }
    if (theme.accentColor) {
      root.style.setProperty('--accent', hexToHsl(theme.accentColor));
      root.style.setProperty('--accent-foreground', getContrastHsl(theme.accentColor));
    }
  }, [theme]);

  return null;
}
