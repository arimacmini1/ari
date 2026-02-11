/**
 * Audit Log Verification API Endpoint
 * F07-MH-01: Verify hash chain integrity
 * 
 * GET /api/audit/verify - Verify audit log hash chain
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuditLogChain } from '@/lib/audit/audit-service';

/**
 * GET /api/audit/verify
 * Verify audit log chain integrity
 * 
 * Query parameters:
 * - start_id: Optional starting entry ID
 * - limit: Number of entries to verify (1-1000, default 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startId = searchParams.get('start_id') || undefined;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '100', 10),
      1000
    );

    const result = await verifyAuditLogChain(startId, limit);

    const status = result.valid ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error('Error verifying audit logs:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
