import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
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

    // 1. GET /api/recognitions/wall-of-fame
    if (slug.length === 1 && slug[0] === 'wall-of-fame') {
      // Get all recognitions this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthIso = startOfMonth.toISOString();

      const recognitionsThisMonth = await db
        .select()
        .from(schema.recognitions)
        .where(sql`${schema.recognitions.createdAt} >= ${startOfMonthIso}`)
        .all();

      // Aggregate recognitions by recipient
      const userKudosCount = new Map<string, { count: number; badges: Record<string, number>; latestMsg: string }>();

      for (const rec of recognitionsThisMonth) {
        const data = userKudosCount.get(rec.recipientId) || { count: 0, badges: {}, latestMsg: rec.message };
        data.count += 1;
        data.badges[rec.badge] = (data.badges[rec.badge] || 0) + 1;
        // Keep the latest message
        data.latestMsg = rec.message;
        userKudosCount.set(rec.recipientId, data);
      }

      // Fetch all users to construct wall of fame entries
      const allUsers = await db.select().from(schema.users).all();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      // Convert mapping to entries and sort
      const entries = Array.from(userKudosCount.entries()).map(([recipientId, data]) => {
        const user = userMap.get(recipientId);

        // Find top badge type
        let topBadge = 'Excellence';
        let maxBadgeCount = 0;
        for (const [badge, count] of Object.entries(data.badges)) {
          if (count > maxBadgeCount) {
            maxBadgeCount = count;
            topBadge = badge;
          }
        }

        return {
          employee: {
            id: recipientId,
            name: user?.name || 'Unknown User',
            avatarUrl: user?.avatarUrl || null,
            department: user?.department || 'Operations',
          },
          recognitionCount: data.count,
          topBadge,
          quote: data.latestMsg,
          isEmployeeOfMonth: false, // will assign to rank 1
        };
      });

      // Sort by count desc
      entries.sort((a, b) => b.recognitionCount - a.recognitionCount);

      // Limit to top 10
      const top10 = entries.slice(0, 10);

      // Assign isEmployeeOfMonth to top rank
      if (top10.length > 0) {
        top10[0].isEmployeeOfMonth = true;
      }

      // If no entries (e.g. database is empty or new month), let's fallback to all-time or return empty list
      if (top10.length === 0) {
        // Fetch all time instead of just this month to populate carousel
        const allRecognitions = await db.select().from(schema.recognitions).all();
        const allTimeKudosCount = new Map<string, { count: number; badges: Record<string, number>; latestMsg: string }>();
        for (const rec of allRecognitions) {
          const data = allTimeKudosCount.get(rec.recipientId) || { count: 0, badges: {}, latestMsg: rec.message };
          data.count += 1;
          data.badges[rec.badge] = (data.badges[rec.badge] || 0) + 1;
          data.latestMsg = rec.message;
          allTimeKudosCount.set(rec.recipientId, data);
        }
        
        const fallbackEntries = Array.from(allTimeKudosCount.entries()).map(([recipientId, data]) => {
          const user = userMap.get(recipientId);
          let topBadge = 'Excellence';
          let maxBadgeCount = 0;
          for (const [badge, count] of Object.entries(data.badges)) {
            if (count > maxBadgeCount) {
              maxBadgeCount = count;
              topBadge = badge;
            }
          }
          return {
            employee: {
              id: recipientId,
              name: user?.name || 'Unknown User',
              avatarUrl: user?.avatarUrl || null,
              department: user?.department || 'Operations',
            },
            recognitionCount: data.count,
            topBadge,
            quote: data.latestMsg,
            isEmployeeOfMonth: false,
          };
        });
        fallbackEntries.sort((a, b) => b.recognitionCount - a.recognitionCount);
        const top10Fallback = fallbackEntries.slice(0, 10);
        if (top10Fallback.length > 0) {
          top10Fallback[0].isEmployeeOfMonth = true;
        }
        return NextResponse.json({ data: top10Fallback });
      }

      return NextResponse.json({ data: top10 });
    }

    // 2. GET /api/recognitions (list feed)
    if (slug.length === 0) {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);

      // Fetch recognitions
      const allRecognitions = await db.select().from(schema.recognitions).all();
      
      // Sort by createdAt desc
      allRecognitions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Paginate
      const offset = (page - 1) * limit;
      const paginated = allRecognitions.slice(offset, offset + limit);

      // Fetch users, likes, comments to enrich
      const allUsers = await db.select().from(schema.users).all();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const rawLikes = await db.select().from(schema.recognitionLikes).all();
      const likesMap = new Map<string, number>();
      const userLikedSet = new Set<string>(); // "recognitionId-userId"
      for (const l of rawLikes) {
        likesMap.set(l.recognitionId, (likesMap.get(l.recognitionId) || 0) + 1);
        if (l.userId === userId) {
          userLikedSet.add(`${l.recognitionId}-${userId}`);
        }
      }

      const rawComments = await db.select().from(schema.recognitionComments).all();
      const commentsGroupMap = new Map<string, any[]>();
      for (const c of rawComments) {
        const author = userMap.get(c.authorId);
        const list = commentsGroupMap.get(c.recognitionId) || [];
        list.push({
          id: c.id,
          recognitionId: c.recognitionId,
          authorId: c.authorId,
          content: c.content,
          createdAt: c.createdAt,
          author: {
            id: c.authorId,
            name: author?.name || 'Unknown User',
            avatarUrl: author?.avatarUrl || null,
          },
        });
        commentsGroupMap.set(c.recognitionId, list);
      }

      const enrichedRecognitions = paginated.map(r => {
        const sender = userMap.get(r.senderId);
        const recipient = userMap.get(r.recipientId);
        const comments = commentsGroupMap.get(r.id) || [];
        
        // Sort comments by oldest first
        comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return {
          id: r.id,
          badge: r.badge,
          message: r.message,
          attachmentUrl: r.attachmentUrl || undefined,
          createdAt: r.createdAt,
          sender: {
            id: r.senderId,
            name: sender?.name || 'Unknown User',
            avatarUrl: sender?.avatarUrl || null,
          },
          recipient: {
            id: r.recipientId,
            name: recipient?.name || 'Unknown User',
            avatarUrl: recipient?.avatarUrl || null,
            department: recipient?.department || 'Operations',
          },
          likeCount: likesMap.get(r.id) || 0,
          likedByUser: userLikedSet.has(`${r.id}-${userId}`),
          comments,
        };
      });

      return NextResponse.json({ data: enrichedRecognitions });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in GET /api/recognitions:', error);
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

    // 1. POST /api/recognitions/:id/comments
    if (slug.length === 2 && slug[1] === 'comments') {
      const recognitionId = slug[0];
      const { content } = await request.json();

      if (!content || content.trim() === '') {
        return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
      }

      const rec = await db
        .select()
        .from(schema.recognitions)
        .where(eq(schema.recognitions.id, recognitionId))
        .get();

      if (!rec) {
        return NextResponse.json({ error: 'Recognition not found' }, { status: 404 });
      }

      const newComment = await db
        .insert(schema.recognitionComments)
        .values({
          recognitionId,
          authorId: userId,
          content: content.trim(),
        })
        .returning()
        .get();

      const author = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

      return NextResponse.json({
        data: {
          id: newComment.id,
          recognitionId: newComment.recognitionId,
          authorId: newComment.authorId,
          content: newComment.content,
          createdAt: newComment.createdAt,
          author: {
            id: userId,
            name: author?.name || 'Unknown User',
            avatarUrl: author?.avatarUrl || null,
          },
        },
      });
    }

    // 2. POST /api/recognitions/:id/like (toggle like)
    if (slug.length === 2 && slug[1] === 'like') {
      const recognitionId = slug[0];

      const rec = await db
        .select()
        .from(schema.recognitions)
        .where(eq(schema.recognitions.id, recognitionId))
        .get();

      if (!rec) {
        return NextResponse.json({ error: 'Recognition not found' }, { status: 404 });
      }

      const existingLike = await db
        .select()
        .from(schema.recognitionLikes)
        .where(
          and(
            eq(schema.recognitionLikes.recognitionId, recognitionId),
            eq(schema.recognitionLikes.userId, userId)
          )
        )
        .get();

      let liked = false;
      if (existingLike) {
        await db
          .delete(schema.recognitionLikes)
          .where(
            and(
              eq(schema.recognitionLikes.recognitionId, recognitionId),
              eq(schema.recognitionLikes.userId, userId)
            )
          )
          .run();
        liked = false;
      } else {
        await db
          .insert(schema.recognitionLikes)
          .values({
            recognitionId,
            userId,
          })
          .run();
        liked = true;
      }

      const likes = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.recognitionLikes)
        .where(eq(schema.recognitionLikes.recognitionId, recognitionId))
        .get();

      return NextResponse.json({
        data: {
          liked,
          likeCount: likes?.count || 0,
        },
      });
    }

    // 3. POST /api/recognitions (create kudos)
    if (slug.length === 0) {
      const { recipientId, badge, message, attachmentUrl } = await request.json();

      if (!recipientId || !badge || !message) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      if (recipientId === userId) {
        return NextResponse.json({ error: 'You cannot recognize yourself' }, { status: 400 });
      }

      // Verify recipient exists
      const recipient = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, recipientId))
        .get();

      if (!recipient) {
        return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
      }

      // Insert recognition
      const newRec = await db
        .insert(schema.recognitions)
        .values({
          senderId: userId,
          recipientId,
          badge,
          message: message.trim(),
          attachmentUrl: attachmentUrl || null,
        })
        .returning()
        .get();

      // Award points (in transaction via awardPoints)
      // +5 to sender
      await awardPoints(
        userId,
        POINT_RULES.RECOGNITION_SENT,
        `Sent recognition kudos to ${recipient.name}`,
        newRec.id
      );

      // +10 to recipient
      await awardPoints(
        recipientId,
        POINT_RULES.RECOGNITION_RECEIVED,
        `Received recognition kudos from someone`,
        newRec.id
      );

      const sender = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

      return NextResponse.json({
        data: {
          id: newRec.id,
          badge: newRec.badge,
          message: newRec.message,
          attachmentUrl: newRec.attachmentUrl || undefined,
          createdAt: newRec.createdAt,
          sender: {
            id: userId,
            name: sender?.name || 'Unknown User',
            avatarUrl: sender?.avatarUrl || null,
          },
          recipient: {
            id: recipientId,
            name: recipient.name,
            avatarUrl: recipient.avatarUrl,
            department: recipient.department,
          },
          likeCount: 0,
          likedByUser: false,
          comments: [],
        },
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in POST /api/recognitions:', error);
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

    const slug = params.slug || [];

    if (slug.length === 1) {
      const recognitionId = slug[0];

      const rec = await db
        .select()
        .from(schema.recognitions)
        .where(eq(schema.recognitions.id, recognitionId))
        .get();

      if (!rec) {
        return NextResponse.json({ error: 'Recognition not found' }, { status: 404 });
      }

      // Verify owner or admin
      if (rec.senderId !== userId && role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Delete dependencies
      await db.delete(schema.recognitionLikes).where(eq(schema.recognitionLikes.recognitionId, recognitionId)).run();
      await db.delete(schema.recognitionComments).where(eq(schema.recognitionComments.recognitionId, recognitionId)).run();
      await db.delete(schema.recognitions).where(eq(schema.recognitions.id, recognitionId)).run();

      return NextResponse.json({ data: { success: true } });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in DELETE /api/recognitions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
