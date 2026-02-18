import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';

export function middleware(request: NextRequest) {
  // Only intercept /api/v1/* routes
  if (!request.nextUrl.pathname.startsWith('/api/v1')) {
    return NextResponse.next();
  }

  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing API key', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const keyInfo = validateApiKey(apiKey);
  if (!keyInfo.valid) {
    return NextResponse.json(
      { error: 'Invalid API key', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // Attach agent name to request headers for downstream route handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-agent-name', keyInfo.agentName || 'unknown');

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: '/api/v1/:path*',
};
