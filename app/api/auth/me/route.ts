import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { signJwt } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        roles: schema.users.roles,
        department: schema.users.department,
        avatarUrl: schema.users.avatarUrl,
        pointsBalance: schema.users.pointsBalance,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const rolesList = JSON.parse(user.roles || '["employee"]');

    return NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: rolesList,
        department: user.department,
        avatarUrl: user.avatarUrl,
        pointsBalance: user.pointsBalance,
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await request.json();
    if (!role || (role !== 'employee' && role !== 'admin')) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // 1. Fetch user's authorized roles list
    const user = await db
      .select({
        roles: schema.users.roles,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const rolesList = JSON.parse(user.roles || '["employee"]');
    if (!rolesList.includes(role)) {
      return NextResponse.json({ error: 'Forbidden: You do not possess this role' }, { status: 403 });
    }

    // Determine appropriate department for the demo role
    let department = 'Engineering';
    if (role === 'admin') {
      department = 'Operations';
    }

    const updatedUserResult = await db
      .update(schema.users)
      .set({
        role,
        department,
      })
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        roles: schema.users.roles,
        department: schema.users.department,
        avatarUrl: schema.users.avatarUrl,
        pointsBalance: schema.users.pointsBalance,
      });

    const updatedUser = updatedUserResult[0];

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedRolesList = JSON.parse(updatedUser.roles || '["employee"]');

    // Sign a new token with updated role/dept
    const payload = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role as any,
      roles: updatedRolesList,
      department: updatedUser.department,
    };
    const token = await signJwt(payload);

    const response = NextResponse.json({
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        roles: updatedRolesList,
        department: updatedUser.department,
        avatarUrl: updatedUser.avatarUrl,
        pointsBalance: updatedUser.pointsBalance,
      }
    });

    response.cookies.set('wb_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error updating current user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
