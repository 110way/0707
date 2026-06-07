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

    // 1. GET /api/admin/users/pending
    if (slug.length === 1 && slug[0] === 'pending') {
      const pendingUsers = await db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          role: schema.users.role,
          department: schema.users.department,
          status: schema.users.status,
          createdAt: schema.users.createdAt,
        })
        .from(schema.users)
        .where(eq(schema.users.status, 'pending'))
        .all();

      // Sort by oldest signup first
      pendingUsers.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return NextResponse.json({ data: pendingUsers });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
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

    // 1. PATCH /api/admin/users/:id
    if (slug.length === 1) {
      const targetUserId = slug[0];
      const { status } = await request.json();

      if (!status || (status !== 'approved' && status !== 'declined')) {
        return NextResponse.json({ error: 'Invalid status. Must be "approved" or "declined"' }, { status: 400 });
      }

      const targetUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, targetUserId))
        .get();

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (targetUser.status !== 'pending') {
        return NextResponse.json({ error: 'User registration request is already resolved' }, { status: 400 });
      }

      // Update status
      const updatedUser = await db
        .update(schema.users)
        .set({ status })
        .where(eq(schema.users.id, targetUserId))
        .returning()
        .get();

      return NextResponse.json({
        message: `User registration request successfully ${status}.`,
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          status: updatedUser.status,
        },
      });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in PATCH /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
