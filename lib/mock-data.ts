import { 
  AuthUser, 
  Survey, 
  Post, 
  Comment, 
  Concern, 
  Recognition, 
  WallOfFameEntry, 
  PointsLogEntry, 
  RedemptionOption, 
  RedemptionRequest
} from '@/types';

// Root mock user. Can be updated dynamically or mocked via hooks.
export const MOCK_USER: AuthUser = {
  id: 'user-1',
  name: 'Rahul Naik',
  email: 'rahul@company.com',
  role: 'employee', // Change this to 'admin' to switch UI roles
  roles: ['employee', 'admin'],
  department: 'Engineering',
  avatarUrl: null,
  pointsBalance: 145,
};

// Additional mock users for recipient search/selection
export const MOCK_USERS: AuthUser[] = [
  { id: 'user-1', name: 'Rahul Naik', email: 'rahul@company.com', role: 'employee', roles: ['employee', 'admin'], department: 'Engineering', avatarUrl: null, pointsBalance: 145 },
  { id: 'user-2', name: 'Elena Rostova', email: 'elena@company.com', role: 'employee', roles: ['employee'], department: 'Design', avatarUrl: null, pointsBalance: 210 },
  { id: 'user-3', name: 'Marcus Chen', email: 'marcus@company.com', role: 'admin', roles: ['employee', 'admin'], department: 'People & Culture', avatarUrl: null, pointsBalance: 95 },
  { id: 'user-4', name: 'Amina Diop', email: 'amina@company.com', role: 'admin', roles: ['employee', 'admin'], department: 'Operations', avatarUrl: null, pointsBalance: 320 },
  { id: 'user-5', name: 'David Kim', email: 'david@company.com', role: 'employee', roles: ['employee'], department: 'Product', avatarUrl: null, pointsBalance: 110 },
  { id: 'user-6', name: 'Sarah Jenkins', email: 'sarah@company.com', role: 'employee', roles: ['employee'], department: 'Marketing', avatarUrl: null, pointsBalance: 180 },
];

export const MOCK_SURVEYS: Survey[] = [
  {
    id: 'survey-1',
    title: 'Q3 Workplace Wellbeing & Health Check',
    description: 'Help us understand your current work-life balance, mental wellness, and physical comfort at the office or remote setups.',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days left
    status: 'active',
    questionCount: 4,
    pointsReward: 20,
    completedByUser: false,
    questions: [
      {
        id: 'q1',
        type: 'rating',
        text: 'How would you rate your overall work-life balance this quarter?',
        required: true,
      },
      {
        id: 'q2',
        type: 'radio',
        text: 'Which workspace arrangement best describes your current setup?',
        required: true,
        options: ['Fully Remote', 'Hybrid (1-2 days in office)', 'Hybrid (3-4 days in office)', 'Fully In-Office'],
      },
      {
        id: 'q3',
        type: 'checkbox',
        text: 'Which wellness challenges have you experienced recently? (Select all that apply)',
        required: false,
        options: ['Digital fatigue', 'Physical discomfort/poor ergonomics', 'Lack of social connection', 'Workload pressure', 'None'],
      },
      {
        id: 'q4',
        type: 'long_text',
        text: 'Do you have any suggestions on how we can improve support for mental and physical wellbeing?',
        required: false,
      }
    ]
  },
  {
    id: 'survey-2',
    title: 'Hybrid Work Culture Feedback',
    description: 'Quick check-in regarding our new hybrid scheduling framework and team alignment.',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days left
    status: 'active',
    questionCount: 3,
    pointsReward: 15,
    completedByUser: true,
    questions: [
      {
        id: 'sq1',
        type: 'yes_no',
        text: 'Do you feel productive working under the current hybrid framework?',
        required: true,
      },
      {
        id: 'sq2',
        type: 'rating',
        text: 'How would you rate communication and collaboration within your hybrid team?',
        required: true,
      },
      {
        id: 'sq3',
        type: 'short_text',
        text: 'What is the biggest blocker you face in your hybrid setup?',
        required: false,
      }
    ]
  },
  {
    id: 'survey-3',
    title: 'Office Ergonomics Assessment',
    description: 'Evaluating chair comfort, desk heights, and monitor setup across our physical locations.',
    deadline: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // Expired 2 days ago
    status: 'expired',
    questionCount: 2,
    pointsReward: 10,
    completedByUser: false,
    questions: [
      {
        id: 'eq1',
        type: 'rating',
        text: 'How comfortable is your office desk and chair setup?',
        required: true,
      },
      {
        id: 'eq2',
        type: 'yes_no',
        text: 'Have you experienced any physical pain or strain due to your workplace ergonomics?',
        required: true,
      }
    ]
  }
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'post-1',
    author: {
      id: 'user-2',
      name: 'Elena Rostova',
      avatarUrl: null,
      department: 'Design',
    },
    content: 'Just wrapping up a huge session redesigning our employee onboarding portals! Focused extensively on micro-interactions and high accessibility. Would love any feedback on the dashboard navigation when it rolls out next week. Happy Friday team! 🚀✨',
    hashtags: ['#design', '#onboarding', '#ux', '#fridayvibes'],
    likeCount: 12,
    commentCount: 2,
    likedByUser: false,
    isPinned: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
  },
  {
    id: 'post-2',
    author: {
      id: 'user-5',
      name: 'David Kim',
      avatarUrl: null,
      department: 'Product',
    },
    content: 'Had a wonderful lunch chat today with our engineering leads about balancing velocity and code health. It is so important to set realistic sprint goals to avoid developer burnout. Mental wellbeing needs to be built into our actual operational processes, not just an afterthought!',
    hashtags: ['#wellbeing', '#agile', '#burnout', '#engineering'],
    likeCount: 24,
    commentCount: 4,
    likedByUser: true,
    isPinned: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: 'post-3',
    author: {
      id: 'user-3',
      name: 'Marcus Chen',
      avatarUrl: null,
      department: 'People & Culture',
    },
    content: 'Friendly reminder that our Q3 Wellbeing surveys are now active! Completing them gets you 20 Konnect points which you can redeem for 1:1 sessions with managers or mentorship meetings. Make your voice heard!',
    hashtags: ['#culture', '#wellbeing', '#feedback'],
    likeCount: 8,
    commentCount: 1,
    likedByUser: false,
    isPinned: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
  }
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'comment-1',
    postId: 'post-1',
    parentId: null,
    author: {
      id: 'user-1',
      name: 'Rahul Naik',
      avatarUrl: null,
    },
    content: 'Looks awesome Elena! Can’t wait to play around with the new navigation. The accessibility improvements are highly appreciated.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    replies: [
      {
        id: 'comment-1-reply',
        postId: 'post-1',
        parentId: 'comment-1',
        author: {
          id: 'user-2',
          name: 'Elena Rostova',
          avatarUrl: null,
        },
        content: 'Thanks Rahul! Let me know if there are any specific responsive breakpoints you notice that need tweaking.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(),
      }
    ]
  },
  {
    id: 'comment-2',
    postId: 'post-1',
    parentId: null,
    author: {
      id: 'user-6',
      name: 'Sarah Jenkins',
      avatarUrl: null,
    },
    content: 'The color scheme on the mockups looked so refreshing. Great work!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  }
];

export const MOCK_CONCERNS: Concern[] = [
  {
    id: 'concern-1',
    referenceId: '8fbd0291-a1dc-4921-965a-8b8398e090f7',
    category: 'Workload',
    severity: 'High',
    title: 'Severe burnout in Engineering Team C',
    description: 'Sprint planning commitments have doubled over the last three cycles without any team capacity changes. Several members are working over weekends and late nights to hit artificial deadlines, leading to severe fatigue and negative sentiments.',
    incidentDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString().split('T')[0],
    status: 'In Progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    submitterId: undefined,
    assigneeId: 'user-3', // Marcus Chen
    adminNotes: 'Spoke with Team C lead regarding sprint loads. Investigating capacity allocations and potential delivery date postponements.',
  },
  {
    id: 'concern-2',
    referenceId: '2e7208d1-d2ab-4720-994b-4b2a60ceefb3',
    category: 'Environment',
    severity: 'Medium',
    title: 'Air conditioning issues on Floor 3 West Wing',
    description: 'The air conditioning in the West Wing of Floor 3 is malfunctioning. It gets extremely cold in the afternoons, making it hard to sit and focus. Several teammates have complained.',
    incidentDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString().split('T')[0],
    status: 'Open',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    submitterId: 'user-1', // Rahul Naik self-identified
    assigneeId: undefined,
    adminNotes: '',
  },
  {
    id: 'concern-3',
    referenceId: 'd603a11b-fa2e-4b28-ba20-22c3e1e44f80',
    category: 'Management',
    severity: 'Critical',
    title: 'Retaliatory behavior from supervisor',
    description: 'After bringing up scheduling conflicts due to family requirements, my direct supervisor began excluding me from project planning threads and removed two of my critical clients. I feel my career growth is being actively harmed for requesting hybrid accommodation.',
    status: 'Unaddressed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    submitterId: undefined,
    assigneeId: undefined,
    adminNotes: 'Critical case. Needs direct HR escalation and investigation.',
  },
  {
    id: 'concern-4',
    referenceId: '6b2a09c2-55fa-44e2-a09c-e58f0cb18a4a',
    category: 'Policy',
    severity: 'Low',
    title: 'Lack of clarity in work-from-anywhere policy',
    description: 'We are told we can work from anywhere for up to 30 days a year, but the process to request it is not defined anywhere in the HR portal. Can we document this explicitly?',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    submitterId: undefined,
    assigneeId: 'user-3',
    adminNotes: 'Policy guide published on internal Wiki page on June 2nd. Closed ticket.',
  }
];

export const MOCK_RECOGNITIONS: Recognition[] = [
  {
    id: 'rec-1',
    sender: { id: 'user-2', name: 'Elena Rostova', avatarUrl: null },
    recipient: { id: 'user-1', name: 'Rahul Naik', avatarUrl: null, department: 'Engineering' },
    badge: 'ProblemSolver',
    message: 'A huge shout-out to Rahul for helping me debug a massive hydration issue on the Next.js pages late last night. He walked me through the server/client boundaries and solved it in 20 minutes. Total lifesaver! 🎯🙌',
    likeCount: 14,
    likedByUser: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    comments: [
      {
        id: 'rc-1',
        recognitionId: 'rec-1',
        authorId: 'user-5',
        author: { id: 'user-5', name: 'David Kim', avatarUrl: null },
        content: 'Awesome work Rahul! Hydration issues are the absolute worst.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
      }
    ]
  },
  {
    id: 'rec-2',
    sender: { id: 'user-1', name: 'Rahul Naik', avatarUrl: null },
    recipient: { id: 'user-3', name: 'Marcus Chen', avatarUrl: null, department: 'People & Culture' },
    badge: 'Teamwork',
    message: 'Thanks Marcus for organizing the team wellness workshop this Wednesday. It was really grounding to take a step back from coding and talk about stress management tools with everyone. Super appreciate your effort!',
    likeCount: 19,
    likedByUser: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    comments: []
  },
  {
    id: 'rec-3',
    sender: { id: 'user-4', name: 'Amina Diop', avatarUrl: null },
    recipient: { id: 'user-2', name: 'Elena Rostova', avatarUrl: null, department: 'Design' },
    badge: 'Excellence',
    message: 'Elena consistently raises the bar with her design mocks. The feedback system UI is incredibly clean, intuitive, and beautiful. Thank you for always executing with absolute excellence! 🏆',
    likeCount: 32,
    likedByUser: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    comments: []
  }
];

export const MOCK_WALL_OF_FAME: WallOfFameEntry[] = [
  {
    rank: 1,
    employee: { id: 'user-2', name: 'Elena Rostova', avatarUrl: null, department: 'Design' },
    recognitionCount: 12,
    topBadge: 'Excellence',
    quote: 'Elena consistently raises the bar with her design mocks. The UI is incredibly clean, intuitive, and beautiful.',
    isEmployeeOfMonth: true,
  },
  {
    rank: 2,
    employee: { id: 'user-1', name: 'Rahul Naik', avatarUrl: null, department: 'Engineering' },
    recognitionCount: 9,
    topBadge: 'ProblemSolver',
    quote: 'A huge shout-out to Rahul for helping me debug a massive hydration issue on the Next.js pages late last night.',
    isEmployeeOfMonth: false,
  },
  {
    rank: 3,
    employee: { id: 'user-3', name: 'Marcus Chen', avatarUrl: null, department: 'People & Culture' },
    recognitionCount: 7,
    topBadge: 'Teamwork',
    quote: 'Thanks Marcus for organizing the team wellness workshop. It was really grounding to discuss stress management.',
    isEmployeeOfMonth: false,
  }
];

export const MOCK_POINTS_HISTORY: PointsLogEntry[] = [
  { id: 'pl-1', activity: 'Completed Survey: Hybrid Work Culture Feedback', delta: 15, balanceAfter: 145, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString() },
  { id: 'pl-2', activity: 'Sent Recognition to Marcus Chen', delta: 1, balanceAfter: 130, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: 'pl-3', activity: 'Received Recognition from Elena Rostova', delta: 10, balanceAfter: 129, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() },
  { id: 'pl-4', activity: 'Created Forum Post: Hydration issues discussion', delta: 5, balanceAfter: 119, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  { id: 'pl-5', activity: 'Redeemed: 1:1 with Team Lead', delta: -70, balanceAfter: 114, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 240).toISOString() },
  { id: 'pl-6', activity: 'Login Streak 7 Days milestone', delta: 7, balanceAfter: 184, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 300).toISOString() },
];

export const MOCK_DASHBOARD_STATS = {
  surveys: {
    active: 2,
    completed: 12,
    expired: 4,
    responseRates: [
      { name: 'Q3 Wellbeing', rate: 78 },
      { name: 'Hybrid Feedback', rate: 89 },
      { name: 'Office Ergo Assessment', rate: 45 },
      { name: 'Safety Drill Feedback', rate: 92 },
    ],
    sentiment: [
      { name: 'Positive', value: 64, color: '#10b981' },
      { name: 'Neutral', value: 24, color: '#f59e0b' },
      { name: 'Negative', value: 12, color: '#ef4444' },
    ],
    participationByDept: [
      { name: 'Engineering', rate: 84 },
      { name: 'Design', rate: 91 },
      { name: 'Product', rate: 88 },
      { name: 'Marketing', rate: 72 },
      { name: 'Operations', rate: 65 },
    ]
  },
  concerns: {
    open: 2,
    inProgress: 3,
    resolved: 14,
    unaddressed: 1,
    categories: [
      { name: 'Workload', value: 6 },
      { name: 'Harassment', value: 1 },
      { name: 'Management', value: 4 },
      { name: 'Environment', value: 5 },
      { name: 'Policy', value: 3 },
      { name: 'Other', value: 1 },
    ],
    trend: [
      { month: 'Jan', count: 2 },
      { month: 'Feb', count: 4 },
      { month: 'Mar', count: 3 },
      { month: 'Apr', count: 7 },
      { month: 'May', count: 5 },
      { month: 'Jun', count: 8 },
    ]
  },
  recognition: {
    thisMonth: 48,
    lastMonth: 39,
    categories: [
      { name: 'Excellence', value: 14 },
      { name: 'Innovation', value: 8 },
      { name: 'Teamwork', value: 16 },
      { name: 'Leadership', value: 5 },
      { name: 'Above & Beyond', value: 9 },
      { name: 'Problem Solver', value: 11 },
    ],
    trend: [
      { day: 'Mon', count: 4 },
      { day: 'Tue', count: 8 },
      { day: 'Wed', count: 12 },
      { day: 'Thu', count: 7 },
      { day: 'Fri', count: 14 },
      { day: 'Sat', count: 2 },
      { day: 'Sun', count: 1 },
    ]
  },
  konnect: {
    totalPoints: 1250,
  },
  insights: [
    { type: 'warning', text: 'Survey completion is 12% below average this month in Engineering.', category: 'Surveys' },
    { type: 'error', text: '3 concerns have been unaddressed for more than 7 days.', category: 'Concerns' },
    { type: 'success', text: 'Recognition activity increased 24% compared to last month.', category: 'Recognition' },
  ]
};
