import { sqliteTable, text, integer, primaryKey, unique } from 'drizzle-orm/sqlite-core';

// Helper defaults
const idCol = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAtCol = () => text('created_at').notNull().$defaultFn(() => new Date().toISOString());

// 1. Users Table
export const users = sqliteTable('users', {
  id: idCol(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(), // 'employee' | 'hr' | 'admin'
  department: text('department').notNull(),
  avatarUrl: text('avatar_url'),
  pointsBalance: integer('points_balance').notNull().default(0),
  loginDates: text('login_dates').default('[]'), // JSON array of login ISO strings
  status: text('status').notNull().default('approved'), // 'pending' | 'approved' | 'declined'
  roles: text('roles').notNull().default('["employee"]'),
  createdAt: createdAtCol(),
});

// 2. Surveys Table
export const surveys = sqliteTable('surveys', {
  id: idCol(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  deadline: text('deadline').notNull(), // ISO date string
  status: text('status').notNull().default('active'), // 'draft' | 'active' | 'completed' | 'expired'
  createdBy: text('created_by').notNull(), // user ID
  questions: text('questions').notNull().default('[]'), // JSON array of Question objects
  createdAt: createdAtCol(),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// 3. Survey Responses Table
export const surveyResponses = sqliteTable('survey_responses', {
  id: idCol(),
  surveyId: text('survey_id').notNull(),
  userId: text('user_id').notNull(),
  answers: text('answers').notNull().default('[]'), // JSON array of answers
  submittedAt: createdAtCol(),
}, (t) => ({
  unq: unique('survey_user_unq').on(t.surveyId, t.userId),
}));

// 4. Posts Table
export const posts = sqliteTable('posts', {
  id: idCol(),
  authorId: text('author_id').notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  isPinned: integer('is_pinned').notNull().default(0), // 0 = false, 1 = true
  createdAt: createdAtCol(),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// 5. Hashtags Table
export const hashtags = sqliteTable('hashtags', {
  id: idCol(),
  name: text('name').notNull().unique(),
  postCount: integer('post_count').notNull().default(0),
});

// 6. Post Hashtags Table (composite PK join table)
export const postHashtags = sqliteTable('post_hashtags', {
  postId: text('post_id').notNull(),
  hashtagId: text('hashtag_id').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.hashtagId] }),
}));

// 7. Post Likes Table (composite PK)
export const postLikes = sqliteTable('post_likes', {
  postId: text('post_id').notNull(),
  userId: text('user_id').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.userId] }),
}));

// 8. Comments Table
export const comments = sqliteTable('comments', {
  id: idCol(),
  postId: text('post_id').notNull(),
  authorId: text('author_id').notNull(),
  parentId: text('parent_id'), // nullable for top level comments
  content: text('content').notNull(),
  createdAt: createdAtCol(),
});

// 9. Concerns Table
export const concerns = sqliteTable('concerns', {
  id: idCol(),
  referenceId: text('reference_id').notNull().unique(),
  category: text('category').notNull(), // 'Harassment' | 'Workload' | 'Management' | 'Environment' | 'Policy' | 'Other'
  severity: text('severity').notNull(), // 'Low' | 'Medium' | 'High' | 'Critical'
  title: text('title').notNull(),
  description: text('description').notNull(),
  attachmentUrl: text('attachment_url'),
  incidentDate: text('incident_date'), // ISO date string
  status: text('status').notNull().default('Open'), // 'Open' | 'In Progress' | 'Resolved' | 'Unaddressed'
  submitterId: text('submitter_id'), // nullable (anonymized)
  assigneeId: text('assignee_id'), // nullable assigned admin ID
  adminNotes: text('admin_notes').default(''),
  createdAt: createdAtCol(),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// 10. Concern Audit Log Table
export const concernAuditLog = sqliteTable('concern_audit_log', {
  id: idCol(),
  concernId: text('concern_id').notNull(),
  changedBy: text('changed_by').notNull(), // admin name
  oldStatus: text('old_status').notNull(),
  newStatus: text('new_status').notNull(),
  note: text('note'),
  changedAt: createdAtCol(),
});

// 11. Recognitions Table
export const recognitions = sqliteTable('recognitions', {
  id: idCol(),
  senderId: text('sender_id').notNull(),
  recipientId: text('recipient_id').notNull(),
  badge: text('badge').notNull(), // BadgeType
  message: text('message').notNull(),
  attachmentUrl: text('attachment_url'),
  createdAt: createdAtCol(),
});

// 12. Recognition Likes Table (composite PK)
export const recognitionLikes = sqliteTable('recognition_likes', {
  recognitionId: text('recognition_id').notNull(),
  userId: text('user_id').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.recognitionId, t.userId] }),
}));

// 13. Recognition Comments Table
export const recognitionComments = sqliteTable('recognition_comments', {
  id: idCol(),
  recognitionId: text('recognition_id').notNull(),
  authorId: text('author_id').notNull(),
  content: text('content').notNull(),
  createdAt: createdAtCol(),
});

// 14. Points Log Table
export const pointsLog = sqliteTable('points_log', {
  id: idCol(),
  userId: text('user_id').notNull(),
  activity: text('activity').notNull(),
  delta: integer('delta').notNull(), // positive for earned, negative for spent
  balanceAfter: integer('balance_after').notNull(),
  refId: text('ref_id'), // e.g. survey ID or recognition ID
  createdAt: createdAtCol(),
});

// 15. Redemption Requests Table
export const redemptionRequests = sqliteTable('redemption_requests', {
  id: idCol(),
  userId: text('user_id').notNull(),
  rewardType: text('reward_type').notNull(), // redemption option ID
  pointsCost: integer('points_cost').notNull(),
  status: text('status').notNull().default('Pending'), // 'Pending' | 'Approved' | 'Declined'
  adminNote: text('admin_note'),
  createdAt: createdAtCol(),
});
