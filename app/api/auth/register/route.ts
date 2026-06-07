import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { hashPassword } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { name, email, password, department, role } = await request.json();

    if (!name || !email || !password || !department || !role) {
      return NextResponse.json(
        { error: 'All fields are required (Name, Email, Password, Department, and Desired Role)' },
        { status: 400 }
      );
    }

    // 1. Check if email is valid corporate email format (optional, but good to clean)
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@company.com') && !normalizedEmail.endsWith('.com')) {
      return NextResponse.json(
        { error: 'Please use a valid corporate email address' },
        { status: 400 }
      );
    }

    // 2. Check if user already exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail))
      .get();

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists' },
        { status: 400 }
      );
    }

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Create new user with pending status
    const newUser = await db
      .insert(schema.users)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: role as any,
        department,
        status: 'pending',
        pointsBalance: 0,
        loginDates: '[]',
      })
      .returning()
      .get();

    return NextResponse.json({
      message: 'Registration successful! Your account is pending administrator approval. Please wait for an administrator to review your request.',
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        status: newUser.status,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
