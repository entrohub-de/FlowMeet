import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from './api-auth';
import { createServerClient } from '@/lib/supabase/server';

export type { ApiKeyInfo } from './api-auth';

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

// ── Error classes for authorization ──

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// ── Ownership check ──

export async function requireEventOwnership(eventId: string, agentName: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('evt_events')
    .select('created_by')
    .eq('event_id', eventId)
    .single();
  if (error || !data) throw new NotFoundError('Event not found');
  if (data.created_by !== agentName) throw new ForbiddenError('No permission');
}

// ── Handler wrapper with API key auth + error handling ──

type RouteParams = { params: Promise<Record<string, string>> };

type ApiKeyInfo = import('./api-auth').ApiKeyInfo;

type ApiHandler = (
  request: NextRequest,
  context: RouteParams,
  keyInfo: ApiKeyInfo,
) => Promise<NextResponse>;

export function withApiHandler(handler: ApiHandler): (request: NextRequest, context: RouteParams) => Promise<NextResponse> {
  return async (request: NextRequest, context: RouteParams) => {
    // Validate API key
    const apiKey = request.headers.get('x-api-key') || '';
    const keyInfo = validateApiKey(apiKey);
    if (!keyInfo.valid) {
      return apiError('Invalid API key', 'UNAUTHORIZED', 401);
    }

    try {
      return await handler(request, context, keyInfo);
    } catch (err) {
      if (err instanceof ValidationError) {
        return apiError(err.message, 'VALIDATION_ERROR');
      }
      if (err instanceof NotFoundError) {
        return apiError(err.message, 'NOT_FOUND', 404);
      }
      if (err instanceof ForbiddenError) {
        return apiError(err.message, 'FORBIDDEN', 403);
      }

      const message = err instanceof Error ? err.message : 'Internal server error';
      console.error('[API Error]', message);
      return apiError(message, 'INTERNAL_ERROR', 500);
    }
  };
}
