import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
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

    // 1. GET /api/posts/:id/comments
    if (slug.length === 2 && slug[1] === 'comments') {
      const postId = slug[0];

      // Fetch all comments for this post
      const rawComments = await db
        .select()
        .from(schema.comments)
        .where(eq(schema.comments.postId, postId))
        .all();

      // Fetch all users to map authors
      const allUsers = await db.select().from(schema.users).all();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      // Format comments and separate top-level and replies
      const formattedComments = rawComments.map(c => {
        const author = userMap.get(c.authorId);
        return {
          id: c.id,
          postId: c.postId,
          parentId: c.parentId,
          content: c.content,
          createdAt: c.createdAt,
          author: {
            id: c.authorId,
            name: author?.name || 'Unknown User',
            avatarUrl: author?.avatarUrl || null,
          },
          replies: [] as any[],
        };
      });

      const topLevelComments = formattedComments.filter(c => !c.parentId);
      const replies = formattedComments.filter(c => c.parentId);

      // Map replies to parent comments
      const commentMap = new Map(topLevelComments.map(c => [c.id, c]));
      for (const reply of replies) {
        if (reply.parentId) {
          const parent = commentMap.get(reply.parentId);
          if (parent) {
            parent.replies.push(reply);
          }
        }
      }

      // Sort comments by createdAt desc
      topLevelComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      for (const c of topLevelComments) {
        c.replies.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }

      return NextResponse.json({ data: topLevelComments });
    }

    // 2. GET /api/posts (paginated feed with filters)
    if (slug.length === 0) {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const sort = url.searchParams.get('sort') || 'latest';
      const hashtag = url.searchParams.get('hashtag') || null;
      const search = url.searchParams.get('search') || null;

      // Fetch all posts, users, postHashtags, hashtags, postLikes, comments
      const rawPosts = await db.select().from(schema.posts).all();
      const rawUsers = await db.select().from(schema.users).all();
      const userMap = new Map(rawUsers.map(u => [u.id, u]));

      const rawPostHashtags = await db.select().from(schema.postHashtags).all();
      const rawHashtags = await db.select().from(schema.hashtags).all();
      const hashtagMap = new Map(rawHashtags.map(h => [h.id, h.name]));

      // Map postId -> list of hashtag names
      const postHashtagNamesMap = new Map<string, string[]>();
      for (const ph of rawPostHashtags) {
        const name = hashtagMap.get(ph.hashtagId);
        if (name) {
          const list = postHashtagNamesMap.get(ph.postId) || [];
          list.push(name);
          postHashtagNamesMap.set(ph.postId, list);
        }
      }

      const rawLikes = await db.select().from(schema.postLikes).all();
      const likeCountMap = new Map<string, number>();
      const userLikedMap = new Set<string>(); // "postId-userId"
      for (const l of rawLikes) {
        likeCountMap.set(l.postId, (likeCountMap.get(l.postId) || 0) + 1);
        if (l.userId === userId) {
          userLikedMap.add(`${l.postId}-${userId}`);
        }
      }

      const rawComments = await db.select().from(schema.comments).all();
      const commentCountMap = new Map<string, number>();
      for (const c of rawComments) {
        commentCountMap.set(c.postId, (commentCountMap.get(c.postId) || 0) + 1);
      }

      // Assemble all post objects
      let formattedPosts = rawPosts.map(p => {
        const author = userMap.get(p.authorId);
        return {
          id: p.id,
          content: p.content,
          imageUrl: p.imageUrl || undefined,
          isPinned: p.isPinned === 1,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          author: {
            id: p.authorId,
            name: author?.name || 'Unknown User',
            avatarUrl: author?.avatarUrl || null,
            department: author?.department || 'Operations',
          },
          hashtags: postHashtagNamesMap.get(p.id) || [],
          likeCount: likeCountMap.get(p.id) || 0,
          commentCount: commentCountMap.get(p.id) || 0,
          likedByUser: userLikedMap.has(`${p.id}-${userId}`),
        };
      });

      // Filter by hashtag
      if (hashtag) {
        const lowerHashtag = hashtag.toLowerCase();
        formattedPosts = formattedPosts.filter(p =>
          p.hashtags.some(tag => tag.toLowerCase() === lowerHashtag)
        );
      }

      // Filter by search query
      if (search) {
        const lowerSearch = search.toLowerCase();
        formattedPosts = formattedPosts.filter(p =>
          p.content.toLowerCase().includes(lowerSearch)
        );
      }

      // Sort posts
      formattedPosts.sort((a, b) => {
        // Pins stay on top
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        if (sort === 'likes') {
          if (b.likeCount !== a.likeCount) {
            return b.likeCount - a.likeCount;
          }
        } else if (sort === 'comments') {
          if (b.commentCount !== a.commentCount) {
            return b.commentCount - a.commentCount;
          }
        }

        // Fallback or sort = 'latest'
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // Pagination
      const offset = (page - 1) * limit;
      const paginatedPosts = formattedPosts.slice(offset, offset + limit);

      return NextResponse.json({ data: paginatedPosts });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in GET /api/posts:', error);
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

    // 1. POST /api/posts/:id/comments
    if (slug.length === 2 && slug[1] === 'comments') {
      const postId = slug[0];
      const { content, parentId } = await request.json();

      if (!content || content.trim() === '') {
        return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
      }

      // Verify post exists
      const post = await db.select().from(schema.posts).where(eq(schema.posts.id, postId)).get();
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      // Verify parent comment exists if provided
      if (parentId) {
        const parent = await db.select().from(schema.comments).where(eq(schema.comments.id, parentId)).get();
        if (!parent) {
          return NextResponse.json({ error: 'Parent comment not found' }, { status: 400 });
        }
      }

      const newComment = await db
        .insert(schema.comments)
        .values({
          postId,
          authorId: userId,
          parentId: parentId || null,
          content: content.trim(),
        })
        .returning()
        .get();

      // Get author details
      const author = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

      return NextResponse.json({
        data: {
          ...newComment,
          author: {
            id: userId,
            name: author?.name || 'Unknown User',
            avatarUrl: author?.avatarUrl || null,
          },
          replies: [],
        },
      });
    }

    // 2. POST /api/posts/:id/like
    if (slug.length === 2 && slug[1] === 'like') {
      const postId = slug[0];

      // Verify post exists
      const post = await db.select().from(schema.posts).where(eq(schema.posts.id, postId)).get();
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      // Check if user already liked
      const existingLike = await db
        .select()
        .from(schema.postLikes)
        .where(
          and(
            eq(schema.postLikes.postId, postId),
            eq(schema.postLikes.userId, userId)
          )
        )
        .get();

      let liked = false;
      if (existingLike) {
        await db
          .delete(schema.postLikes)
          .where(
            and(
              eq(schema.postLikes.postId, postId),
              eq(schema.postLikes.userId, userId)
            )
          )
          .run();
        liked = false;
      } else {
        await db
          .insert(schema.postLikes)
          .values({
            postId,
            userId,
          })
          .run();
        liked = true;
      }

      // Count total likes
      const likes = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.postLikes)
        .where(eq(schema.postLikes.postId, postId))
        .get();

      const likeCount = likes?.count || 0;

      // Trigger "reached 10 likes" rule
      if (likeCount === 10) {
        // Check if author has already received this specific reward
        const activityText = `Post reached 10 likes: ${postId}`;
        const prevAward = await db
          .select()
          .from(schema.pointsLog)
          .where(
            and(
              eq(schema.pointsLog.userId, post.authorId),
              eq(schema.pointsLog.activity, activityText)
            )
          )
          .get();

        if (!prevAward) {
          await awardPoints(
            post.authorId,
            POINT_RULES.POST_REACHED_10_LIKES,
            activityText,
            postId
          );
        }
      }

      return NextResponse.json({ data: { liked, likeCount } });
    }

    // 3. POST /api/posts (create post)
    if (slug.length === 0) {
      const { content, imageUrl } = await request.json();

      if (!content || content.trim() === '') {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 });
      }

      // Insert post
      const newPost = await db
        .insert(schema.posts)
        .values({
          authorId: userId,
          content: content.trim(),
          imageUrl: imageUrl || null,
        })
        .returning()
        .get();

      // Extract and map hashtags
      const hashtagRegex = /#[a-zA-Z0-9_]+/g;
      const extractedTags = content.match(hashtagRegex) || [];
      const uniqueTags = Array.from(new Set(extractedTags.map((t: string) => t.toLowerCase())));

      for (const tagRaw of uniqueTags) {
        // Upsert hashtag
        let hashtagRecord = await db
          .select()
          .from(schema.hashtags)
          .where(eq(schema.hashtags.name, tagRaw as string))
          .get();

        if (hashtagRecord) {
          await db
            .update(schema.hashtags)
            .set({ postCount: hashtagRecord.postCount + 1 })
            .where(eq(schema.hashtags.id, hashtagRecord.id))
            .run();
        } else {
          hashtagRecord = await db
            .insert(schema.hashtags)
            .values({
              name: tagRaw as string,
              postCount: 1,
            })
            .returning()
            .get();
        }

        if (hashtagRecord) {
          await db
            .insert(schema.postHashtags)
            .values({
              postId: newPost.id,
              hashtagId: hashtagRecord.id,
            })
            .run();
        }
      }

      // Check if first post of the calendar month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthIso = startOfMonth.toISOString();

      const postsThisMonth = await db
        .select()
        .from(schema.posts)
        .where(
          and(
            eq(schema.posts.authorId, userId),
            sql`${schema.posts.createdAt} >= ${startOfMonthIso}`,
            sql`${schema.posts.id} != ${newPost.id}` // exclude current post
          )
        )
        .limit(1)
        .all();

      const isFirstOf = postsThisMonth.length === 0;

      // Award base points
      await awardPoints(
        userId,
        POINT_RULES.POST_CREATED,
        'Created a forum post',
        newPost.id
      );

      // Award bonus points if first post of month
      if (isFirstOf) {
        await awardPoints(
          userId,
          POINT_RULES.FIRST_POST_OF_MONTH,
          'First post of the month bonus',
          newPost.id
        );
      }

      // Fetch complete user record to return
      const author = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

      return NextResponse.json({
        data: {
          id: newPost.id,
          content: newPost.content,
          imageUrl: newPost.imageUrl || undefined,
          isPinned: newPost.isPinned === 1,
          createdAt: newPost.createdAt,
          updatedAt: newPost.updatedAt,
          author: {
            id: userId,
            name: author?.name || 'Unknown User',
            avatarUrl: author?.avatarUrl || null,
            department: author?.department || 'Operations',
          },
          hashtags: uniqueTags,
          likeCount: 0,
          commentCount: 0,
          likedByUser: false,
        },
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in POST /api/posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { slug?: string[] } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slug = params.slug || [];

    if (slug.length === 1) {
      const postId = slug[0];
      const { content, imageUrl } = await request.json();

      if (!content || content.trim() === '') {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 });
      }

      const existingPost = await db
        .select()
        .from(schema.posts)
        .where(eq(schema.posts.id, postId))
        .get();

      if (!existingPost) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      // Verify owner
      if (existingPost.authorId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Update the post content/image
      const updatedPost = await db
        .update(schema.posts)
        .set({
          content: content.trim(),
          imageUrl: imageUrl || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.posts.id, postId))
        .returning()
        .get();

      // Clean up hashtags and rebuild
      // Fetch old hashtags linked to this post
      const oldPostHashtags = await db
        .select()
        .from(schema.postHashtags)
        .where(eq(schema.postHashtags.postId, postId))
        .all();

      // Decrement postCount on old hashtags
      for (const ph of oldPostHashtags) {
        const tag = await db.select().from(schema.hashtags).where(eq(schema.hashtags.id, ph.hashtagId)).get();
        if (tag) {
          const newCount = Math.max(0, tag.postCount - 1);
          if (newCount === 0) {
            await db.delete(schema.hashtags).where(eq(schema.hashtags.id, tag.id)).run();
          } else {
            await db.update(schema.hashtags).set({ postCount: newCount }).where(eq(schema.hashtags.id, tag.id)).run();
          }
        }
      }

      // Delete postHashtags mapping
      await db.delete(schema.postHashtags).where(eq(schema.postHashtags.postId, postId)).run();

      // Extract new hashtags
      const hashtagRegex = /#[a-zA-Z0-9_]+/g;
      const extractedTags = content.match(hashtagRegex) || [];
      const uniqueTags = Array.from(new Set(extractedTags.map((t: string) => t.toLowerCase())));

      for (const tagRaw of uniqueTags) {
        let hashtagRecord = await db
          .select()
          .from(schema.hashtags)
          .where(eq(schema.hashtags.name, tagRaw as string))
          .get();

        if (hashtagRecord) {
          await db
            .update(schema.hashtags)
            .set({ postCount: hashtagRecord.postCount + 1 })
            .where(eq(schema.hashtags.id, hashtagRecord.id))
            .run();
        } else {
          hashtagRecord = await db
            .insert(schema.hashtags)
            .values({
              name: tagRaw as string,
              postCount: 1,
            })
            .returning()
            .get();
        }

        if (hashtagRecord) {
          await db
            .insert(schema.postHashtags)
            .values({
              postId: postId,
              hashtagId: hashtagRecord.id,
            })
            .run();
        }
      }

      // Get author details
      const author = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

      // Get like count
      const likes = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.postLikes)
        .where(eq(schema.postLikes.postId, postId))
        .get();

      const commentsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.comments)
        .where(eq(schema.comments.postId, postId))
        .get();

      const userLiked = await db
        .select()
        .from(schema.postLikes)
        .where(and(eq(schema.postLikes.postId, postId), eq(schema.postLikes.userId, userId)))
        .get();

      return NextResponse.json({
        data: {
          id: updatedPost.id,
          content: updatedPost.content,
          imageUrl: updatedPost.imageUrl || undefined,
          isPinned: updatedPost.isPinned === 1,
          createdAt: updatedPost.createdAt,
          updatedAt: updatedPost.updatedAt,
          author: {
            id: userId,
            name: author?.name || 'Unknown User',
            avatarUrl: author?.avatarUrl || null,
            department: author?.department || 'Operations',
          },
          hashtags: uniqueTags,
          likeCount: likes?.count || 0,
          commentCount: commentsCount?.count || 0,
          likedByUser: !!userLiked,
        },
      });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in PUT /api/posts:', error);
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
      const postId = slug[0];

      const existingPost = await db
        .select()
        .from(schema.posts)
        .where(eq(schema.posts.id, postId))
        .get();

      if (!existingPost) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      // Verify owner OR admin
      if (existingPost.authorId !== userId && role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Clean up hashtags count
      const postHashtags = await db
        .select()
        .from(schema.postHashtags)
        .where(eq(schema.postHashtags.postId, postId))
        .all();

      for (const ph of postHashtags) {
        const tag = await db.select().from(schema.hashtags).where(eq(schema.hashtags.id, ph.hashtagId)).get();
        if (tag) {
          const newCount = Math.max(0, tag.postCount - 1);
          if (newCount === 0) {
            await db.delete(schema.hashtags).where(eq(schema.hashtags.id, tag.id)).run();
          } else {
            await db.update(schema.hashtags).set({ postCount: newCount }).where(eq(schema.hashtags.id, tag.id)).run();
          }
        }
      }

      // Delete dependencies
      await db.delete(schema.postHashtags).where(eq(schema.postHashtags.postId, postId)).run();
      await db.delete(schema.postLikes).where(eq(schema.postLikes.postId, postId)).run();
      await db.delete(schema.comments).where(eq(schema.comments.postId, postId)).run();
      await db.delete(schema.posts).where(eq(schema.posts.id, postId)).run();

      return NextResponse.json({ data: { success: true } });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in DELETE /api/posts:', error);
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

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const slug = params.slug || [];

    // 1. PATCH /api/posts/:id/pin
    if (slug.length === 2 && slug[1] === 'pin') {
      const postId = slug[0];

      const existingPost = await db
        .select()
        .from(schema.posts)
        .where(eq(schema.posts.id, postId))
        .get();

      if (!existingPost) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      const newPinStatus = existingPost.isPinned === 1 ? 0 : 1;

      const updated = await db
        .update(schema.posts)
        .set({
          isPinned: newPinStatus,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.posts.id, postId))
        .returning()
        .get();

      // Return complete formatted post
      const author = await db.select().from(schema.users).where(eq(schema.users.id, updated.authorId)).get();
      const likes = await db.select({ count: sql<number>`count(*)` }).from(schema.postLikes).where(eq(schema.postLikes.postId, postId)).get();
      const commentsCount = await db.select({ count: sql<number>`count(*)` }).from(schema.comments).where(eq(schema.comments.postId, postId)).get();
      const userLiked = await db.select().from(schema.postLikes).where(and(eq(schema.postLikes.postId, postId), eq(schema.postLikes.userId, userId))).get();

      const postHashtags = await db.select().from(schema.postHashtags).where(eq(schema.postHashtags.postId, postId)).all();
      const hashtagNames: string[] = [];
      for (const ph of postHashtags) {
        const tag = await db.select().from(schema.hashtags).where(eq(schema.hashtags.id, ph.hashtagId)).get();
        if (tag) hashtagNames.push(tag.name);
      }

      return NextResponse.json({
        data: {
          id: updated.id,
          content: updated.content,
          imageUrl: updated.imageUrl || undefined,
          isPinned: updated.isPinned === 1,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          author: {
            id: updated.authorId,
            name: author?.name || 'Unknown User',
            avatarUrl: author?.avatarUrl || null,
            department: author?.department || 'Operations',
          },
          hashtags: hashtagNames,
          likeCount: likes?.count || 0,
          commentCount: commentsCount?.count || 0,
          likedByUser: !!userLiked,
        },
      });
    }

    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  } catch (error) {
    console.error('Error in PATCH /api/posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
