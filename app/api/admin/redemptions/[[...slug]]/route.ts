import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { awardPoints } from '@/lib/points';

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

    // 1. GET /api/admin/redemptions (list all requests)
    if (slug.length === 0) {
      const allRequests = await db.select().from(schema.redemptionRequests).all();
      const allUsers = await db.select().from(schema.users).all();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      // Format requests
      const formatted = allRequests.map(r => {
        const user = userMap.get(r.userId);
        return {
          id: r.id,
          userId: r.userId,
          rewardType: r.rewardType,
          pointsCost: r.pointsCost,
          status: r.status,
          adminNote: r.adminNote || undefined,
          createdAt: r.createdAt,
          user: {
            name: user?.name || 'Unknown User',
            email: user?.email || '',
            department: user?.department || 'Operations',
          },
        };
      });

      // Sort by latest first
      formatted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({ data: formatted });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in GET /api/admin/redemptions:', error);
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

    // 1. PATCH /api/admin/redemptions/:id
    if (slug.length === 1) {
      const requestId = slug[0];
      const { status, adminNote } = await request.json();

      if (!status || (status !== 'Approved' && status !== 'Declined')) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const reqRecord = await db
        .select()
        .from(schema.redemptionRequests)
        .where(eq(schema.redemptionRequests.id, requestId))
        .get();

      if (!reqRecord) {
        return NextResponse.json({ error: 'Redemption request not found' }, { status: 404 });
      }

      if (reqRecord.status !== 'Pending') {
        return NextResponse.json({ error: 'Redemption request is already resolved' }, { status: 400 });
      }

      // Handle decline refund in transaction
      const updated = await db.transaction(async (tx) => {
        if (status === 'Declined') {
          // Fetch current user details
          const reqUser = await tx
            .select({ pointsBalance: schema.users.pointsBalance })
            .from(schema.users)
            .where(eq(schema.users.id, reqRecord.userId))
            .get();

          if (reqUser) {
            const refundedBalance = reqUser.pointsBalance + reqRecord.pointsCost;
            
            // Update user balance
            await tx
              .update(schema.users)
              .set({ pointsBalance: refundedBalance })
              .where(eq(schema.users.id, reqRecord.userId))
              .run();

            // Log refund activity
            await tx
              .insert(schema.pointsLog)
              .values({
                userId: reqRecord.userId,
                activity: `Refund: Declined Redemption`,
                delta: reqRecord.pointsCost,
                balanceAfter: refundedBalance,
                refId: requestId,
              })
              .run();
          }
        }

        const resRecord = await tx
          .update(schema.redemptionRequests)
          .set({
            status,
            adminNote: adminNote || null,
          })
          .where(eq(schema.redemptionRequests.id, requestId))
          .returning()
          .get();

        return resRecord;
      });

      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in PATCH /api/admin/redemptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
