import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, or, like } from 'drizzle-orm';
import { MOCK_BLOG_ARTICLES } from '@/lib/blog-data';

// Static reward items (matching those in App/API)
const REWARD_ITEMS = [
  { id: 'team_lead', label: '1:1 with Team Lead', description: '30-minute informal check-in regarding career focus, feedback, or guidance.', cost: 70, url: '/konnect' },
  { id: 'manager', label: 'Career Chat with Manager', description: '45-minute focused discussion mapping out career goals, milestones, and blockers.', cost: 100, url: '/konnect' },
  { id: 'mentorship', label: 'Mentorship Session', description: '1-hour professional guidance session with a senior lead of choice.', cost: 200, url: '/konnect' },
  { id: 'cxo', label: 'Meet with CXO', description: '30-minute exclusive meeting with a member of executive leadership.', cost: 250, url: '/konnect' },
];

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user details for role validation
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    if (!q) {
      return NextResponse.json({
        data: {
          features: [],
          surveys: [],
          posts: [],
          blogs: [],
          rewards: [],
        },
      });
    }

    // 1. Search Static Menus & Features
    const featuresList = [
      { title: 'Home', url: '/', description: 'Explore the employee wellbeing homepage, stats overview, and wellness quick-links.', roles: ['employee', 'admin'] },
      { title: 'Surveys', url: '/surveys', description: 'Provide workspace feedback by answering active questionnaires and earn points.', roles: ['employee', 'admin'] },
      { title: 'Open Forum', url: '/forum', description: 'Share peer discussions, ask questions, browse hashtags, and participate in community threads.', roles: ['employee', 'admin'] },
      { title: 'Concerns Box', url: '/concerns', description: 'Report workplace issues or feedback anonymously and track ticket resolution progress.', roles: ['employee', 'admin'] },
      { title: 'Peer Kudos / Recognition', url: '/recognition', description: 'Send virtual badges to thank coworkers and browse the Wall of Fame.', roles: ['employee', 'admin'] },
      { title: 'Konnect Rewards Portal', url: '/konnect', description: 'Check your points balances, view earning history logs, and redeem coaching vouchers.', roles: ['employee', 'admin'] },
      { title: 'Analytics Dashboard', url: '/dashboard', description: 'Access organization-wide wellbeing metrics, concern categories, and AI-driven insights.', roles: ['admin'] },
    ];

    const matchedFeatures = featuresList.filter(
      (f) =>
        f.roles.includes(user.role) &&
        (f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
    );

    // 2. Search Database Surveys
    // We query the DB then filter in JS to guarantee case-insensitive Unicode safety
    const allSurveys = await db.select().from(schema.surveys).all();
    const matchedSurveys = allSurveys
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      )
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        url: `/surveys`,
      }));

    // 3. Search Database Forum Posts
    const allPosts = await db.select().from(schema.posts).all();
    // Fetch users to map author names in search results
    const allUsers = await db.select().from(schema.users).all();
    const userMap = new Map(allUsers.map((u) => [u.id, u.name]));
    
    const matchedPosts = allPosts
      .filter((p) => p.content.toLowerCase().includes(q))
      .map((p) => {
        const authorName = userMap.get(p.authorId) || 'Anonymous';
        return {
          id: p.id,
          authorName,
          content: p.content,
          url: `/forum`, // Can direct to forum page
        };
      });

    // 4. Search Static Wellness Blog Articles
    const matchedBlogs = MOCK_BLOG_ARTICLES.filter(
      (article) =>
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.content.toLowerCase().includes(q)
    );

    // 5. Search Point Rewards options
    const matchedRewards = REWARD_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );

    return NextResponse.json({
      data: {
        features: matchedFeatures,
        surveys: matchedSurveys,
        posts: matchedPosts,
        blogs: matchedBlogs,
        rewards: matchedRewards,
      },
    });
  } catch (error) {
    console.error('Error in search api route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
