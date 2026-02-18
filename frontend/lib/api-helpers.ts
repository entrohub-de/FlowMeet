import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from './api-auth';

// ── Response helpers ──

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function apiError(message: string, code: string, status = 400): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

// ── Param helpers ──

export function requireParam(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || !value) {
    throw new ValidationError(`Missing required field: ${field}`);
  }
  return value;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ── Handler wrapper with API key auth + error handling ──

type RouteParams = { params: Promise<Record<string, string>> };

type ApiHandler = (
  request: NextRequest,
  context: RouteParams,
) => Promise<NextResponse>;

export function withApiHandler(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context: RouteParams) => {
    // Validate API key
    const apiKey = request.headers.get('x-api-key') || '';
    const keyInfo = validateApiKey(apiKey);
    if (!keyInfo.valid) {
      return apiError('Invalid API key', 'UNAUTHORIZED', 401);
    }

    try {
      return await handler(request, context);
    } catch (err) {
      if (err instanceof ValidationError) {
        return apiError(err.message, 'VALIDATION_ERROR');
      }

      const message = err instanceof Error ? err.message : 'Internal server error';
      console.error('[API Error]', message);
      return apiError(message, 'INTERNAL_ERROR', 500);
    }
  };
}
