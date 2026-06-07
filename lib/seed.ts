import { db } from './db';
import * as schema from './schema';
import { hashPassword } from './auth';
import { eq, sql } from 'drizzle-orm';
import { BadgeType } from '@/types';

async function seed() {
  console.log('Starting database seeding...');

  // 1. Idempotency check
  const existingUsers = await db.select({ count: sql<number>`count(*)` }).from(schema.users);
  if (existingUsers[0] && existingUsers[0].count > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  // 2. Hash default password
  const passwordHash = await hashPassword('Password123!');

  // 3. Create Users (10 employees, 2 hr, 1 admin)
  const userData = [
    // Admin
    { name: 'System Administrator', email: 'admin@company.com', role: 'admin', roles: '["employee", "admin"]', department: 'Operations', pointsBalance: 200 },
    // HR (Converted to Admin)
    { name: 'Marcus Chen', email: 'hr@company.com', role: 'admin', roles: '["employee", "admin"]', department: 'People & Culture', pointsBalance: 120 },
    { name: 'Amina Diop', email: 'hr2@company.com', role: 'admin', roles: '["employee", "admin"]', department: 'People & Culture', pointsBalance: 150 },
    // Employees
    { name: 'Rahul Naik', email: 'rahul@company.com', role: 'employee', roles: '["employee", "admin"]', department: 'Engineering', pointsBalance: 145 },
    { name: 'Elena Rostova', email: 'elena@company.com', role: 'employee', roles: '["employee"]', department: 'Design', pointsBalance: 210 },
    { name: 'David Kim', email: 'david@company.com', role: 'employee', roles: '["employee"]', department: 'Product', pointsBalance: 110 },
    { name: 'Sarah Jenkins', email: 'sarah@company.com', role: 'employee', roles: '["employee"]', department: 'Marketing', pointsBalance: 180 },
    { name: 'John Doe', email: 'john@company.com', role: 'employee', roles: '["employee"]', department: 'Engineering', pointsBalance: 80 },
    { name: 'Jane Smith', email: 'jane@company.com', role: 'employee', roles: '["employee"]', department: 'Engineering', pointsBalance: 95 },
    { name: 'Bob Johnson', email: 'bob@company.com', role: 'employee', roles: '["employee"]', department: 'Sales', pointsBalance: 60 },
    { name: 'Alice Williams', email: 'alice@company.com', role: 'employee', roles: '["employee"]', department: 'Sales', pointsBalance: 75 },
    { name: 'Charlie Brown', email: 'charlie@company.com', role: 'employee', roles: '["employee"]', department: 'Support', pointsBalance: 90 },
    { name: 'Diana Prince', email: 'diana@company.com', role: 'employee', roles: '["employee"]', department: 'Legal', pointsBalance: 140 },
  ];

  const insertedUsers = [];
  for (const u of userData) {
    const res = await db.insert(schema.users).values({
      name: u.name,
      email: u.email,
      passwordHash,
      role: u.role as any,
      roles: u.roles,
      department: u.department,
      pointsBalance: u.pointsBalance,
    }).returning();
    insertedUsers.push(res[0]);
  }
  console.log(`Inserted ${insertedUsers.length} users.`);

  const adminUser = insertedUsers.find(u => u.role === 'admin')!;
  const hrUser1 = insertedUsers.find(u => u.email === 'hr@company.com')!;
  const empUser1 = insertedUsers.find(u => u.email === 'rahul@company.com')!;
  const empUser2 = insertedUsers.find(u => u.email === 'elena@company.com')!;

  // 4. Create Surveys (3 surveys with 4 questions each)
  const surveysData = [
    {
      title: 'Q3 Workplace Wellbeing & Health Check',
      description: 'Help us understand your current work-life balance, mental wellness, and physical comfort at the office or remote setups.',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days left
      status: 'active',
      createdBy: hrUser1.id,
      questions: JSON.stringify([
        { id: 'q1', type: 'rating', text: 'How would you rate your overall work-life balance this quarter?', required: true },
        { id: 'q2', type: 'radio', text: 'Which workspace arrangement best describes your current setup?', required: true, options: ['Fully Remote', 'Hybrid (1-2 days in office)', 'Hybrid (3-4 days in office)', 'Fully In-Office'] },
        { id: 'q3', type: 'checkbox', text: 'Which wellness challenges have you experienced recently? (Select all that apply)', required: false, options: ['Digital fatigue', 'Physical discomfort/poor ergonomics', 'Lack of social connection', 'Workload pressure', 'None'] },
        { id: 'q4', type: 'long_text', text: 'Do you have any suggestions on how we can improve support for mental and physical wellbeing?', required: false },
      ]),
    },
    {
      title: 'Hybrid Work Culture Feedback',
      description: 'Quick check-in regarding our new hybrid scheduling framework and team alignment.',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days left
      status: 'active',
      createdBy: hrUser1.id,
      questions: JSON.stringify([
        { id: 'sq1', type: 'yes_no', text: 'Do you feel productive working under the current hybrid framework?', required: true },
        { id: 'sq2', type: 'rating', text: 'How would you rate communication and collaboration within your hybrid team?', required: true },
        { id: 'sq3', type: 'short_text', text: 'What is the biggest blocker you face in your hybrid setup?', required: false },
        { id: 'sq4', type: 'radio', text: 'How many days per week would be your ideal office presence?', required: false, options: ['0 days', '1-2 days', '3-4 days', '5 days'] },
      ]),
    },
    {
      title: 'Office Ergonomics Assessment',
      description: 'Evaluating chair comfort, desk heights, and monitor setup across our physical locations.',
      deadline: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), // Expired 4 days ago
      status: 'expired',
      createdBy: hrUser1.id,
      questions: JSON.stringify([
        { id: 'eq1', type: 'rating', text: 'How comfortable is your office desk and chair setup?', required: true },
        { id: 'eq2', type: 'yes_no', text: 'Have you experienced any physical pain or strain due to your workplace ergonomics?', required: true },
        { id: 'eq3', type: 'checkbox', text: 'Which ergonomic enhancements do you need? (Select all that apply)', required: false, options: ['Keyboard wrist rest', 'Vertical mouse', 'Monitor riser arm', 'Ergonomic chair tuning', 'None'] },
        { id: 'eq4', type: 'long_text', text: 'Please detail any specific physical setup discomfort you are experiencing.', required: false },
      ]),
    },
  ];

  const insertedSurveys = [];
  for (const s of surveysData) {
    const res = await db.insert(schema.surveys).values({
      title: s.title,
      description: s.description,
      deadline: s.deadline,
      status: s.status as any,
      createdBy: s.createdBy,
      questions: s.questions,
    }).returning();
    insertedSurveys.push(res[0]);
  }
  console.log(`Inserted ${insertedSurveys.length} surveys.`);

  // Submit response for employee to the second survey (since it's completed in mock)
  await db.insert(schema.surveyResponses).values({
    surveyId: insertedSurveys[1].id,
    userId: empUser1.id,
    answers: JSON.stringify({ sq1: true, sq2: 4, sq3: 'None' }),
  });

  // 5. Create Forum Posts (15 posts)
  const postsData = [
    { content: 'Just wrapping up a huge session redesigning our employee onboarding portals! Focused extensively on micro-interactions and high accessibility. Would love any feedback on the dashboard navigation when it rolls out next week. Happy Friday team! 🚀✨', tags: ['#design', '#onboarding', '#ux', '#fridayvibes'], author: empUser2, isPinned: 1 },
    { content: 'Had a wonderful lunch chat today with our engineering leads about balancing velocity and code health. It is so important to set realistic sprint goals to avoid developer burnout. Mental wellbeing needs to be built into our actual operational processes, not just an afterthought!', tags: ['#wellbeing', '#agile', '#burnout', '#engineering'], author: insertedUsers.find(u => u.email === 'david@company.com')!, isPinned: 0 },
    { content: 'Friendly reminder that our Q3 Wellbeing surveys are now active! Completing them gets you 20 Konnect points which you can redeem for 1:1 sessions with managers or mentorship meetings. Make your voice heard!', tags: ['#culture', '#wellbeing', '#feedback'], author: hrUser1, isPinned: 0 },
    { content: 'Loving the hybrid work flexibility. Being able to skip the morning commute twice a week has done wonders for my sleep and daily routine.', tags: ['#hybrid', '#wellbeing', '#productivity'], author: insertedUsers.find(u => u.email === 'sarah@company.com')!, isPinned: 0 },
    { content: 'Are there any plans to do a corporate yoga or meditation group session? I think it would be a nice break for teams.', tags: ['#yoga', '#health', '#mindfulness'], author: insertedUsers.find(u => u.email === 'jane@company.com')!, isPinned: 0 },
    { content: 'Shoutout to the support team for closing out a massive backlog this week under heavy volume. You guys are heroes!', tags: ['#support', '#teamwork', '#shoutout'], author: insertedUsers.find(u => u.email === 'charlie@company.com')!, isPinned: 0 },
    { content: 'Tips for reducing screen strain: follow the 20-20-20 rule. Every 20 minutes, look at something 20 feet away for 20 seconds. It works!', tags: ['#ergonomics', '#health', '#screenstrain'], author: empUser1, isPinned: 0 },
    { content: 'Can we setup a hashtag for sharing healthy lunch recipes? Healthy eating has such a huge impact on our concentration.', tags: ['#nutrition', '#health', '#lunch'], author: insertedUsers.find(u => u.email === 'diana@company.com')!, isPinned: 0 },
    { content: 'Really appreciate our new management transparency around company goals. It makes planning sprints so much clearer.', tags: ['#culture', '#management', '#alignment'], author: insertedUsers.find(u => u.email === 'john@company.com')!, isPinned: 0 },
    { content: 'Is anyone up for a weekend hiking trip? Thinking about doing the local park trails next Saturday.', tags: ['#fitness', '#social', '#hiking'], author: insertedUsers.find(u => u.email === 'bob@company.com')!, isPinned: 0 },
    { content: 'Make sure your chairs are at the right height. Knees should be at a 90 degree angle and feet flat on the floor.', tags: ['#ergonomics', '#wellness'], author: hrUser1, isPinned: 0 },
    { content: 'We should implement a no-meeting Friday policy to give everyone focus blocks.', tags: ['#focus', '#productivity', '#burnout'], author: empUser2, isPinned: 0 },
    { content: 'Had an amazing mentorship discussion with Marcus today. Highly suggest redeeming points for career chats.', tags: ['#mentorship', '#konnect', '#career'], author: empUser1, isPinned: 0 },
    { content: 'Our team is growing! Excited to welcome three new developers joining next Monday.', tags: ['#growth', '#engineering', '#hiring'], author: adminUser, isPinned: 0 },
    { content: 'Reminder: The office gym has new lockers and showers open for use. Fit wellness into your day!', tags: ['#fitness', '#office', '#wellness'], author: adminUser, isPinned: 0 },
  ];

  for (const p of postsData) {
    const postRes = await db.insert(schema.posts).values({
      authorId: p.author.id,
      content: p.content,
      isPinned: p.isPinned,
    }).returning();

    const postId = postRes[0].id;

    // Insert Hashtags & Joins
    for (const tagName of p.tags) {
      // Find or insert hashtag
      let tag = await db.select().from(schema.hashtags).where(eq(schema.hashtags.name, tagName)).get();
      if (!tag) {
        tag = await db.insert(schema.hashtags).values({
          name: tagName,
          postCount: 1,
        }).returning().get();
      } else {
        await db.update(schema.hashtags)
          .set({ postCount: tag.postCount + 1 })
          .where(eq(schema.hashtags.id, tag.id));
      }

      if (tag) {
        await db.insert(schema.postHashtags).values({
          postId,
          hashtagId: tag.id,
        });
      }
    }
  }
  console.log('Inserted 15 posts and created hashtag mappings.');

  // Create post comments for post-1
  const firstPost = await db.select().from(schema.posts).limit(1).get()!;
  if (firstPost) {
    await db.insert(schema.comments).values({
      postId: firstPost.id,
      authorId: empUser1.id,
      content: 'Looks awesome Elena! Can’t wait to play around with the new navigation. The accessibility improvements are highly appreciated.',
    });
  }

  // 6. Create Peer Recognitions (10 kudus)
  const recognitionsData = [
    { sender: empUser2, recipient: empUser1, badge: 'ProblemSolver' as BadgeType, message: 'A huge shout-out to Rahul for helping me debug a massive hydration issue on the Next.js pages late last night. He walked me through the server/client boundaries and solved it in 20 minutes. Total lifesaver! 🎯🙌' },
    { sender: empUser1, recipient: hrUser1, badge: 'Teamwork' as BadgeType, message: 'Thanks Marcus for organizing the team wellness workshop this Wednesday. It was really grounding to take a step back from coding and talk about stress management tools with everyone. Super appreciate your effort!' },
    { sender: insertedUsers.find(u => u.email === 'hr2@company.com')!, recipient: empUser2, badge: 'Excellence' as BadgeType, message: 'Elena consistently raises the bar with her design mocks. The feedback system UI is incredibly clean, intuitive, and beautiful. Thank you for always executing with absolute excellence! 🏆' },
    { sender: empUser1, recipient: insertedUsers.find(u => u.email === 'david@company.com')!, badge: 'Innovation' as BadgeType, message: 'David brought up a fantastic suggestion for scheduling sprint checkins that avoids fatigue. Thanks for the innovation!' },
    { sender: empUser2, recipient: insertedUsers.find(u => u.email === 'sarah@company.com')!, badge: 'AboveAndBeyond' as BadgeType, message: 'Sarah took over two of my presentation tasks when I had a dental appointment. Really went above and beyond, thank you!' },
    { sender: adminUser, recipient: hrUser1, badge: 'Leadership' as BadgeType, message: 'Marcus did an exceptional job scaling the people onboarding process. Led the team with empathy.' },
    { sender: insertedUsers.find(u => u.email === 'jane@company.com')!, recipient: empUser1, badge: 'Teamwork' as BadgeType, message: 'Rahul helped me set up my local database script and lint rules. Extremely patient and helpful.' },
    { sender: insertedUsers.find(u => u.email === 'charlie@company.com')!, recipient: empUser2, badge: 'ProblemSolver' as BadgeType, message: 'Elena solved the grid layout bug that was shifting items on mobile viewports. Lifesaver!' },
    { sender: insertedUsers.find(u => u.email === 'bob@company.com')!, recipient: adminUser, badge: 'Excellence' as BadgeType, message: 'Thanks admin for resolving the office desk allocations. The double monitor setup is perfect.' },
    { sender: empUser1, recipient: insertedUsers.find(u => u.email === 'charlie@company.com')!, badge: 'Teamwork' as BadgeType, message: 'Charlie helped wrap up support docs for our clients. Exceptional teamwork.' },
  ];

  for (const r of recognitionsData) {
    await db.insert(schema.recognitions).values({
      senderId: r.sender.id,
      recipientId: r.recipient.id,
      badge: r.badge,
      message: r.message,
    });
  }
  console.log('Inserted 10 recognitions.');

  // 7. Create Anonymous Concerns (5 tickets)
  const concernsData = [
    { referenceId: '8fbd0291-a1dc-4921-965a-8b8398e090f7', category: 'Workload', severity: 'High', title: 'Severe burnout in Engineering Team C', description: 'Sprint planning commitments have doubled over the last three cycles without any team capacity changes. Several members are working over weekends and late nights to hit artificial deadlines, leading to severe fatigue and negative sentiments.', status: 'In Progress', assigneeId: hrUser1.id, adminNotes: 'Spoke with Team C lead regarding sprint loads. Investigating capacity allocations and potential delivery date postponements.' },
    { referenceId: '2e7208d1-d2ab-4720-994b-4b2a60ceefb3', category: 'Environment', severity: 'Medium', title: 'Air conditioning issues on Floor 3 West Wing', description: 'The air conditioning in the West Wing of Floor 3 is malfunctioning. It gets extremely cold in the afternoons, making it hard to sit and focus. Several teammates have complained.', status: 'Open', assigneeId: undefined, adminNotes: '' },
    { referenceId: 'd603a11b-fa2e-4b28-ba20-22c3e1e44f80', category: 'Management', severity: 'Critical', title: 'Retaliatory behavior from supervisor', description: 'After bringing up scheduling conflicts due to family requirements, my direct supervisor began excluding me from project planning threads and removed two of my critical clients. I feel my career growth is being actively harmed for requesting hybrid accommodation.', status: 'Unaddressed', assigneeId: undefined, adminNotes: 'Critical case. Needs direct HR escalation and investigation.' },
    { referenceId: '6b2a09c2-55fa-44e2-a09c-e58f0cb18a4a', category: 'Policy', severity: 'Low', title: 'Lack of clarity in work-from-anywhere policy', description: 'We are told we can work from anywhere for up to 30 days a year, but the process to request it is not defined anywhere in the HR portal. Can we document this explicitly?', status: 'Resolved', assigneeId: hrUser1.id, adminNotes: 'Policy guide published on internal Wiki page on June 2nd. Closed ticket.' },
    { referenceId: 'ef9b0d12-1d54-472a-96df-00c8f12a970e', category: 'Harassment', severity: 'Critical', title: 'Bullying in daily slack calls', description: 'One engineer has made multiple derogatory remarks regarding my accents during daily syncs. It has happened thrice, and other teammates noticed but nobody commented.', status: 'Open', assigneeId: hrUser1.id, adminNotes: 'Interviewing ticket owner when they reach out. Setting meetings with Slack channels team lead.' },
  ];

  for (const c of concernsData) {
    await db.insert(schema.concerns).values({
      referenceId: c.referenceId,
      category: c.category as any,
      severity: c.severity as any,
      title: c.title,
      description: c.description,
      status: c.status as any,
      assigneeId: c.assigneeId,
      adminNotes: c.adminNotes,
    });
  }
  console.log('Inserted 5 concerns.');

  // 8. Create Points Logs for default users
  for (const usr of insertedUsers) {
    await db.insert(schema.pointsLog).values({
      userId: usr.id,
      activity: 'Initial Profile Seeding Points',
      delta: usr.pointsBalance,
      balanceAfter: usr.pointsBalance,
    });
  }
  console.log('Points logs seeded successfully.');
  console.log('Database seeding completed successfully!');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
