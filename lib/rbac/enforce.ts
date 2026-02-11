import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/audit/audit-service';
import { AuditAction, ResourceType } from '@/lib/audit/types';
import { ensureRbacSeed, userHasPermission } from '@/lib/rbac/rbac-service';
import { RbacPermission, RbacRole } from '@/lib/rbac/constants';

interface EnforcementOptions {
  permission: RbacPermission;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  context?: Record<string, any>;
}

interface EnforcementResult {
  allowed: boolean;
  response?: NextResponse;
  userId: string;
  role: RbacRole | 'unknown';
}

const DEFAULT_USER_ID = 'anonymous';

function getUserIdFromRequest(req: NextRequest): string {
  return req.headers.get('x-user-id')?.trim() || DEFAULT_USER_ID;
}

async function logDeniedAccess(
  actor: string,
  permission: RbacPermission,
  action: AuditAction,
  resourceType: ResourceType,
  resourceId: string,
  reason: string,
  req: NextRequest,
  context: Record<string, any> = {}
) {
  try {
    await createAuditLog({
      actor,
      action: 'access',
      resource_type: 'permission',
      resource_id: permission,
      context: {
        denied_action: action,
        denied_resource_type: resourceType,
        denied_resource_id: resourceId,
        reason,
        method: req.method,
        path: req.nextUrl.pathname,
        context,
      },
    });
  } catch (error) {
    console.warn('Failed to write access denial audit log:', error);
  }
}

function denyResponse(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

function isAgentScopeAllowed(
  userId: string,
  permission: RbacPermission,
  resourceType: ResourceType,
  resourceId: string,
  context?: Record<string, any>
): boolean {
  if (permission !== 'pause') {
    return false;
  }

  if (resourceType !== 'agent') {
    return false;
  }

  if (resourceId === userId) {
    return true;
  }

  if (context?.agent_id && context.agent_id === userId) {
    return true;
  }

  return false;
}

export async function enforcePermission(
  req: NextRequest,
  options: EnforcementOptions
): Promise<EnforcementResult> {
  const userId = getUserIdFromRequest(req);

  try {
    await ensureRbacSeed();
  } catch (error) {
    await logDeniedAccess(
      userId,
      options.permission,
      options.action,
      options.resourceType,
      options.resourceId,
      'RBAC seed unavailable',
      req,
      options.context
    );
    return {
      allowed: false,
      response: denyResponse('RBAC configuration unavailable.'),
      userId,
      role: 'unknown',
    };
  }

  const { allowed, role } = await userHasPermission(userId, options.permission);

  if (!allowed || !role) {
    await logDeniedAccess(
      userId,
      options.permission,
      options.action,
      options.resourceType,
      options.resourceId,
      'Permission denied',
      req,
      options.context
    );
    return {
      allowed: false,
      response: denyResponse('Forbidden: insufficient permissions.'),
      userId,
      role: role || 'unknown',
    };
  }

  if (role === 'Agent') {
    const scopeAllowed = isAgentScopeAllowed(
      userId,
      options.permission,
      options.resourceType,
      options.resourceId,
      options.context
    );
    if (!scopeAllowed) {
      await logDeniedAccess(
        userId,
        options.permission,
        options.action,
        options.resourceType,
        options.resourceId,
        'Agent scope violation',
        req,
        options.context
      );
      return {
        allowed: false,
        response: denyResponse('Forbidden: agent scope restricted.'),
        userId,
        role,
      };
    }
  }

  return { allowed: true, userId, role };
}
