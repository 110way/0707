import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const surveysCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.surveys)
      .where(eq(schema.surveys.status, 'active'))
      .get();

    const recognitionsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.recognitions)
      .get();

    const employeesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(eq(schema.users.role, 'employee'))
      .get();

    return NextResponse.json({
      data: {
        activeSurveys: surveysCount?.count || 0,
        totalRecognitions: recognitionsCount?.count || 0,
        activeEmployees: employeesCount?.count || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
