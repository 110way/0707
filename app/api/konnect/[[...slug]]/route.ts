import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { awardPoints } from '@/lib/points';

const REDEMPTION_OPTIONS = [
  { id: 'team_lead', label: '1:1 with Team Lead', cost: 70 },
  { id: 'manager', label: 'Career Chat with Manager', cost: 100 },
  { id: 'mentorship', label: 'Mentorship Session', cost: 200 },
  { id: 'cxo', label: 'Meet with CXO', cost: 250 },
];

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

    // 1. GET /api/konnect/balance
    if (slug.length === 1 && slug[0] === 'balance') {
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .get();

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Calculate points earned this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthIso = startOfMonth.toISOString();

      const logsThisMonth = await db
        .select()
        .from(schema.pointsLog)
        .where(
          and(
            eq(schema.pointsLog.userId, userId),
            sql`${schema.pointsLog.createdAt} >= ${startOfMonthIso}`,
            sql`${schema.pointsLog.delta} > 0`
          )
        )
        .all();

      const pointsThisMonth = logsThisMonth.reduce((acc, curr) => acc + curr.delta, 0);

      // Calculate streak from loginDates JSON
      let streak = 0;
      try {
        const loginDates: string[] = JSON.parse(user.loginDates || '[]');
        if (loginDates.length > 0) {
          // Format unique login dates as YYYY-MM-DD
          const uniqueDates = Array.from(
            new Set(loginDates.map(d => d.split('T')[0]))
          ).sort((a, b) => b.localeCompare(a)); // Descending order: latest date first

          const todayStr = new Date().toISOString().split('T')[0];
          
          // Yesterday date string
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          // Check if latest login was today or yesterday
          const latestLogin = uniqueDates[0];
          if (latestLogin === todayStr || latestLogin === yesterdayStr) {
            streak = 1;
            let currentDay = new Date(latestLogin);

            for (let i = 1; i < uniqueDates.length; i++) {
              const prevExpected = new Date(currentDay);
              prevExpected.setDate(prevExpected.getDate() - 1);
              const prevExpectedStr = prevExpected.toISOString().split('T')[0];

              if (uniqueDates[i] === prevExpectedStr) {
                streak += 1;
                currentDay = prevExpected;
              } else {
                break; // streak is broken
              }
            }
          }
        }
      } catch (err) {
        console.error('Error parsing login dates:', err);
      }

      return NextResponse.json({
        data: {
          balance: user.pointsBalance,
          thisMonth: pointsThisMonth,
          streak: streak,
        },
      });
    }

    // 2. GET /api/konnect/history (paginated points log)
    if (slug.length === 1 && slug[0] === 'history') {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);

      const offset = (page - 1) * limit;

      const logs = await db
        .select()
        .from(schema.pointsLog)
        .where(eq(schema.pointsLog.userId, userId))
        .all();

      // Sort logs desc
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const paginatedLogs = logs.slice(offset, offset + limit);

      return NextResponse.json({ data: paginatedLogs });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in GET /api/konnect:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug?: string[] } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slug = params.slug || [];

    // 1. POST /api/konnect/redeem
    if (slug.length === 1 && slug[0] === 'redeem') {
      const { optionId } = await request.json();

      const option = REDEMPTION_OPTIONS.find(o => o.id === optionId);
      if (!option) {
        return NextResponse.json({ error: 'Invalid redemption option' }, { status: 400 });
      }

      // Check current user balance
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .get();

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (user.pointsBalance < option.cost) {
        return NextResponse.json({ error: 'Insufficient points balance' }, { status: 400 });
      }

      // Cooldown validation: 30 days check
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

      const recentRequest = await db
        .select()
        .from(schema.redemptionRequests)
        .where(
          and(
            eq(schema.redemptionRequests.userId, userId),
            eq(schema.redemptionRequests.rewardType, optionId),
            sql`${schema.redemptionRequests.status} != 'Declined'`,
            sql`${schema.redemptionRequests.createdAt} >= ${thirtyDaysAgoIso}`
          )
        )
        .get();

      if (recentRequest) {
        return NextResponse.json({
          error: `Cooldown active: you have already redeemed "${option.label}" in the last 30 days.`,
        }, { status: 400 });
      }

      // Process transaction
      const reqRecord = await db.transaction(async (tx) => {
        // Deduct points
        const newBalance = user.pointsBalance - option.cost;
        await tx
          .update(schema.users)
          .set({ pointsBalance: newBalance })
          .where(eq(schema.users.id, userId))
          .run();

        // Log points
        await tx
          .insert(schema.pointsLog)
          .values({
            userId,
            activity: `Redeemed: ${option.label}`,
            delta: -option.cost,
            balanceAfter: newBalance,
          })
          .run();

        // Create request
        const newReq = await tx
          .insert(schema.redemptionRequests)
          .values({
            userId,
            rewardType: optionId,
            pointsCost: option.cost,
            status: 'Pending',
          })
          .returning()
          .get();

        return newReq;
      });

      return NextResponse.json({ data: reqRecord }, { status: 201 });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in POST /api/konnect/redeem:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
