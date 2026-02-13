'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: 'var(--font-plus-jakarta-sans), system-ui, sans-serif',
        },
        classNames: {
          toast: 'border border-border bg-card text-foreground shadow-lg',
          title: 'font-semibold',
          description: 'text-muted-foreground',
          success: 'border-green-200 bg-green-50 text-green-900',
          error: 'border-red-200 bg-red-50 text-red-900',
          info: 'border-blue-200 bg-blue-50 text-blue-900',
        },
      }}
      richColors
      closeButton
      duration={3000}
    />
  );
}
