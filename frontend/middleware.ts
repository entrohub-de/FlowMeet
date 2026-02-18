import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  // Actual key validation happens in the route handlers via api-helpers.
  // Middleware only checks presence to fail fast.
  return NextResponse.next();
}

export const config = {
  matcher: '/api/v1/:path*',
};
