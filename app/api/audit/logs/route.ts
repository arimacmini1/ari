/**
 * Audit Log API Endpoints
 * F07-MH-01: REST API for audit logging operations
 * 
 * GET  /api/audit/logs - Query audit logs
 * POST /api/audit/logs - Create audit log entry
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createAuditLog,
  queryAuditLogs,
  exportAuditLogs,
  verifyAuditLogChain,
} from '@/lib/audit/audit-service';
import { AuditLogEntrySchema } from '@/lib/audit/types';

/**
 * POST /api/audit/logs
 * Create a new immutable audit log entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = AuditLogEntrySchema.safeParse({
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      actor: body.actor,
      action: body.action,
      resource_type: body.resource_type,
      resource_id: body.resource_id,
      context: body.context || {},
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Create audit log
    const auditLog = await createAuditLog(parsed.data);

    return NextResponse.json(auditLog, { status: 201 });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      {
        error: 'Failed to create audit log',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audit/logs
 * Query audit logs with filtering and pagination
 * 
 * Query parameters:
 * - actor: Filter by actor
 * - action: Filter by action
 * - resource_type: Filter by resource type
 * - resource_id: Filter by resource ID
 * - start_date: Filter by start date (ISO 8601)
 * - end_date: Filter by end date (ISO 8601)
 * - limit: Pagination limit (1-1000, default 100)
 * - offset: Pagination offset (default 0)
 * - sort: Sort order ('asc' or 'desc', default 'desc')
 * - export: Export format ('json' or 'csv', no export by default)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filter parameters
    const filter = {
      actor: searchParams.get('actor') || undefined,
      action: (searchParams.get('action') as any) || undefined,
      resource_type: (searchParams.get('resource_type') as any) || undefined,
      resource_id: searchParams.get('resource_id') || undefined,
      start_date: searchParams.get('start_date')
        ? new Date(searchParams.get('start_date')!)
        : undefined,
      end_date: searchParams.get('end_date')
        ? new Date(searchParams.get('end_date')!)
        : undefined,
      limit: parseInt(searchParams.get('limit') || '100', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
      sort: (searchParams.get('sort') as 'asc' | 'desc') || 'desc',
    };

    // Check if export is requested
    const exportFormat = searchParams.get('export');
    if (exportFormat === 'json' || exportFormat === 'csv') {
      const exportData = await exportAuditLogs(filter, exportFormat);
      return new Response(exportData, {
        headers: {
          'Content-Type': exportFormat === 'csv' ? 'text/csv' : 'application/json',
          'Content-Disposition': `attachment; filename="audit-logs.${exportFormat}"`,
        },
      });
    }

    // Query audit logs
    const result = await queryAuditLogs(filter);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error querying audit logs:', error);
    return NextResponse.json(
      {
        error: 'Failed to query audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
