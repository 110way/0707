import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { slug?: string[] } }
) {
  try {
    const slug = params.slug || [];

    // 1. POST /api/concerns (anonymous submit)
    if (slug.length === 0) {
      const body = await request.json();
      const {
        referenceId,
        category,
        severity,
        title,
        description,
        incidentDate,
        attachmentUrl,
      } = body;

      if (!referenceId || !category || !severity || !title || !description) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Ensure unique referenceId
      const existing = await db
        .select()
        .from(schema.concerns)
        .where(eq(schema.concerns.referenceId, referenceId))
        .get();

      if (existing) {
        return NextResponse.json({ error: 'Reference ID already exists' }, { status: 400 });
      }

      // Check if user is logged in via wb_token cookie
      const token = cookies().get('wb_token')?.value;
      let submitterId: string | null = null;
      if (token) {
        const decoded = await verifyJwt(token);
        if (decoded) {
          submitterId = decoded.id;
        }
      }

      await db.insert(schema.concerns).values({
        referenceId,
        category,
        severity,
        title,
        description,
        incidentDate: incidentDate || null,
        attachmentUrl: attachmentUrl || null,
        status: 'Open',
        submitterId,
        adminNotes: '',
      }).run();

      return NextResponse.json({ data: { referenceId } }, { status: 201 });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in POST /api/concerns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { slug?: string[] } }
) {
  try {
    const slug = params.slug || [];

    // 1. GET /api/concerns/:refId/status
    if (slug.length === 2 && slug[1] === 'status') {
      const referenceId = slug[0];

      const concern = await db
        .select({
          status: schema.concerns.status,
          createdAt: schema.concerns.createdAt,
          updatedAt: schema.concerns.updatedAt,
        })
        .from(schema.concerns)
        .where(eq(schema.concerns.referenceId, referenceId))
        .get();

      if (!concern) {
        return NextResponse.json({ error: 'Concern not found' }, { status: 404 });
      }

      return NextResponse.json({ data: concern });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in GET /api/concerns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
