'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AccessibilityProvider } from '@/components/accessibility/accessibility-provider';

export function AccessibilityRoot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.focus();
    }
  }, [pathname]);

  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}
