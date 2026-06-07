import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { comparePassword, signJwt } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Fetch user by email
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()))
      .get();

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Verify password hash
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 3. Verify user status (Admin Approval check)
    if (user.status === 'pending') {
      return NextResponse.json({ 
        error: 'Your account is pending administrator approval. Please check back later.' 
      }, { status: 403 });
    }
    
    if (user.status === 'declined') {
      return NextResponse.json({ 
        error: 'Your registration request has been declined. Contact HR for details.' 
      }, { status: 403 });
    }

    // 3. Update login dates log array
    const loginDates = JSON.parse(user.loginDates || '[]');
    loginDates.push(new Date().toISOString());
    
    await db
      .update(schema.users)
      .set({ loginDates: JSON.stringify(loginDates) })
      .where(eq(schema.users.id, user.id));

    const roles = JSON.parse(user.roles || '["employee"]');

    // 4. Generate JWT payload
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role as any,
      roles: roles as any,
      department: user.department,
    };

    const token = await signJwt(payload);

    // 5. Build secure httpOnly cookie response
    const response = NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: roles,
        department: user.department,
        avatarUrl: user.avatarUrl,
        pointsBalance: user.pointsBalance,
      },
    });

    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('wb_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
