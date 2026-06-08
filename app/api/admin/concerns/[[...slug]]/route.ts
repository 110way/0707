import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { slug?: string[] } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');

    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const slug = params.slug || [];

    // 1. GET /api/admin/concerns/:id (detail with audit log)
    if (slug.length === 1) {
      const concernId = slug[0];
      const row = await db
        .select({
          concern: schema.concerns,
          submitter: {
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
            role: schema.users.role,
            department: schema.users.department,
          },
        })
        .from(schema.concerns)
        .leftJoin(schema.users, eq(schema.concerns.submitterId, schema.users.id))
        .where(eq(schema.concerns.id, concernId))
        .get();

      if (!row) {
        return NextResponse.json({ error: 'Concern not found' }, { status: 404 });
      }

      // Fetch audit logs
      const auditLog = await db
        .select()
        .from(schema.concernAuditLog)
        .where(eq(schema.concernAuditLog.concernId, concernId))
        .all();

      // Sort auditLog by changedAt desc
      auditLog.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

      return NextResponse.json({
        data: {
          ...row.concern,
          submitter: row.submitter?.id ? row.submitter : undefined,
          auditLog,
        },
      });
    }

    // 2. GET /api/admin/concerns (list all concerns)
    if (slug.length === 0) {
      const concernsList = await db
        .select({
          concern: schema.concerns,
          submitter: {
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
            role: schema.users.role,
            department: schema.users.department,
          },
        })
        .from(schema.concerns)
        .leftJoin(schema.users, eq(schema.concerns.submitterId, schema.users.id))
        .all();

      const mappedList = concernsList.map((row) => ({
        ...row.concern,
        submitter: row.submitter?.id ? row.submitter : undefined,
      }));

      return NextResponse.json({ data: mappedList });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in GET /api/admin/concerns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { slug?: string[] } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');

    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const slug = params.slug || [];

    if (slug.length === 1) {
      const concernId = slug[0];
      const body = await request.json();
      const { status, adminNotes, assigneeId, auditNote } = body;

      const concern = await db
        .select()
        .from(schema.concerns)
        .where(eq(schema.concerns.id, concernId))
        .get();

      if (!concern) {
        return NextResponse.json({ error: 'Concern not found' }, { status: 404 });
      }

      // Get admin user details to log who made the change
      const adminUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .get();

      const changedBy = adminUser?.name || 'Admin User';

      // Perform update and audit log in transaction
      const updated = await db.transaction(async (tx) => {
        // Log audit if status changed
        if (status && status !== concern.status) {
          await tx.insert(schema.concernAuditLog).values({
            concernId,
            changedBy,
            oldStatus: concern.status,
            newStatus: status,
            note: auditNote || adminNotes || 'Status updated',
          }).run();
        }

        // Apply changes
        const updatedRecord = await tx
          .update(schema.concerns)
          .set({
            status: status ?? concern.status,
            adminNotes: adminNotes ?? concern.adminNotes,
            assigneeId: assigneeId !== undefined ? assigneeId : concern.assigneeId,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.concerns.id, concernId))
          .returning()
          .get();

        return updatedRecord;
      });

      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in PATCH /api/admin/concerns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
