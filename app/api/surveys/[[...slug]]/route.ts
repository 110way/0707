import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { awardPoints, POINT_RULES } from '@/lib/points';

export async function GET(
  request: Request,
  { params }: { params: { slug?: string[] } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slug = params.slug || [];

    // 1. GET /api/surveys/:id
    if (slug.length === 1) {
      const surveyId = slug[0];
      const survey = await db
        .select()
        .from(schema.surveys)
        .where(eq(schema.surveys.id, surveyId))
        .get();

      if (!survey) {
        return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
      }

      // Check if user completed this survey
      const response = await db
        .select()
        .from(schema.surveyResponses)
        .where(
          and(
            eq(schema.surveyResponses.surveyId, surveyId),
            eq(schema.surveyResponses.userId, userId)
          )
        )
        .get();

      return NextResponse.json({
        data: {
          ...survey,
          questions: JSON.parse(survey.questions),
          completedByUser: !!response,
        },
      });
    }

    // 2. GET /api/surveys (list all surveys)
    const { searchUrl } = request as any; // fallback or URL
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');

    let allSurveys = await db.select().from(schema.surveys).all();

    // Filter by status if requested
    if (statusFilter) {
      allSurveys = allSurveys.filter(s => s.status === statusFilter);
    }

    // Get all responses for this user to check completion
    const userResponses = await db
      .select({ surveyId: schema.surveyResponses.surveyId })
      .from(schema.surveyResponses)
      .where(eq(schema.surveyResponses.userId, userId))
      .all();

    const completedSurveyIds = new Set(userResponses.map(r => r.surveyId));

    const surveysWithCompletion = allSurveys.map(s => ({
      ...s,
      questions: JSON.parse(s.questions),
      completedByUser: completedSurveyIds.has(s.id),
    }));

    return NextResponse.json({ data: surveysWithCompletion });
  } catch (error) {
    console.error('Error in GET /api/surveys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug?: string[] } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slug = params.slug || [];

    // 1. POST /api/surveys/:id/submit
    if (slug.length === 2 && slug[1] === 'submit') {
      const surveyId = slug[0];
      const { answers } = await request.json();

      // Check if survey exists
      const survey = await db
        .select()
        .from(schema.surveys)
        .where(eq(schema.surveys.id, surveyId))
        .get();

      if (!survey) {
        return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
      }

      // Check if survey is active
      if (survey.status !== 'active') {
        return NextResponse.json({ error: 'Survey is not active' }, { status: 400 });
      }

      // Check if deadline has passed
      if (new Date(survey.deadline) < new Date()) {
        return NextResponse.json({ error: 'Survey deadline has passed' }, { status: 400 });
      }

      // Check for duplicate response
      const existing = await db
        .select()
        .from(schema.surveyResponses)
        .where(
          and(
            eq(schema.surveyResponses.surveyId, surveyId),
            eq(schema.surveyResponses.userId, userId)
          )
        )
        .get();

      if (existing) {
        return NextResponse.json({ error: 'Survey already completed' }, { status: 400 });
      }

      // Record survey response
      await db.insert(schema.surveyResponses).values({
        surveyId,
        userId,
        answers: JSON.stringify(answers),
      }).run();

      // Award points
      await awardPoints(
        userId,
        POINT_RULES.SURVEY_COMPLETE,
        `Completed Survey: ${survey.title}`,
        surveyId
      );

      return NextResponse.json({
        data: {
          pointsEarned: POINT_RULES.SURVEY_COMPLETE,
        },
      });
    }

    // Role check for creation / updates
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. POST /api/surveys (create survey)
    if (slug.length === 0) {
      const { title, description, deadline, questions } = await request.json();

      if (!title || !description || !deadline || !questions) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const newSurvey = await db
        .insert(schema.surveys)
        .values({
          title,
          description,
          deadline,
          status: 'active',
          createdBy: userId,
          questions: JSON.stringify(questions),
        })
        .returning()
        .get();

      return NextResponse.json({ data: newSurvey }, { status: 201 });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in POST /api/surveys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { slug?: string[] } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const slug = params.slug || [];

    // 1. PUT /api/surveys/:id
    if (slug.length === 1) {
      const surveyId = slug[0];
      const { title, description, deadline, status, questions } = await request.json();

      const existingSurvey = await db
        .select()
        .from(schema.surveys)
        .where(eq(schema.surveys.id, surveyId))
        .get();

      if (!existingSurvey) {
        return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
      }

      const updated = await db
        .update(schema.surveys)
        .set({
          title: title ?? existingSurvey.title,
          description: description ?? existingSurvey.description,
          deadline: deadline ?? existingSurvey.deadline,
          status: status ?? existingSurvey.status,
          questions: questions ? JSON.stringify(questions) : existingSurvey.questions,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.surveys.id, surveyId))
        .returning()
        .get();

      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in PUT /api/surveys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug?: string[] } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const slug = params.slug || [];

    // 1. DELETE /api/surveys/:id
    if (slug.length === 1) {
      const surveyId = slug[0];

      const existingSurvey = await db
        .select()
        .from(schema.surveys)
        .where(eq(schema.surveys.id, surveyId))
        .get();

      if (!existingSurvey) {
        return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
      }

      // Delete the responses first to maintain integrity (if cascade not supported)
      await db.delete(schema.surveyResponses).where(eq(schema.surveyResponses.surveyId, surveyId)).run();
      await db.delete(schema.surveys).where(eq(schema.surveys.id, surveyId)).run();

      return NextResponse.json({ data: { success: true } });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in DELETE /api/surveys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
