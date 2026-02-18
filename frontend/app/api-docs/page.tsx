'use client';

import { useEffect, useRef } from 'react';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

export default function ApiDocsPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(link);

    // Load scripts sequentially, then init
    (async () => {
      await loadScript('https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js');
      await loadScript('https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js');

      window.SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          window.SwaggerUIBundle.presets.apis,
          window.SwaggerUIStandalonePreset,
        ],
        layout: 'StandaloneLayout',
      });
    })();
  }, []);

  return (
    <div style={{ height: '100vh' }}>
      <div id="swagger-ui" />
    </div>
  );
}

declare global {
  interface Window {
    SwaggerUIBundle: {
      (config: Record<string, unknown>): void;
      presets: { apis: unknown };
    };
    SwaggerUIStandalonePreset: unknown;
  }
}
