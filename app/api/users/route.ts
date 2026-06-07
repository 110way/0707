import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { ne } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allUsers = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        department: schema.users.department,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.users)
      .where(ne(schema.users.id, userId))
      .all();

    return NextResponse.json({ data: allUsers });
  } catch (error) {
    console.error('Error fetching users list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
