export type Role = 'employee' | 'admin';
export type SurveyStatus = 'draft' | 'active' | 'completed' | 'expired';
export type ConcernStatus = 'Open' | 'In Progress' | 'Resolved' | 'Unaddressed';
export type ConcernCategory = 'Harassment' | 'Workload' | 'Management' | 'Environment' | 'Policy' | 'Other';
export type ConcernSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type BadgeType = 'Excellence' | 'Innovation' | 'Teamwork' | 'Leadership' | 'AboveAndBeyond' | 'ProblemSolver';
export type RedemptionStatus = 'Pending' | 'Approved' | 'Declined';
export type QuestionType = 'radio' | 'checkbox' | 'rating' | 'short_text' | 'long_text' | 'yes_no';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  roles: Role[];
  department: string;
  avatarUrl: string | null;
  pointsBalance: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: string[]; // for radio and checkbox
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO date string
  status: SurveyStatus;
  questionCount: number;
  pointsReward: number;
  completedByUser?: boolean;
  questions?: Question[];
}

export interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
    department: string;
  };
  content: string;
  imageUrl?: string;
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  likedByUser: boolean;
  isPinned: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null; // null = top-level
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  content: string;
  createdAt: string;
  replies?: Comment[];
}

export interface Concern {
  id: string;
  referenceId: string;
  category: ConcernCategory;
  severity: ConcernSeverity;
  title: string;
  description: string;
  attachmentUrl?: string;
  incidentDate?: string;
  status: ConcernStatus;
  createdAt: string;
  submitterId?: string; // nullable, anonymized by default
  assigneeId?: string;
  adminNotes?: string;
}

export interface AuditEntry {
  id: string;
  concernId: string;
  changedBy: string; // admin name
  oldStatus: string;
  newStatus: string;
  note?: string;
  changedAt: string;
}

export interface RecognitionComment {
  id: string;
  recognitionId: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  content: string;
  createdAt: string;
}

export interface Recognition {
  id: string;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  recipient: {
    id: string;
    name: string;
    avatarUrl: string | null;
    department: string;
  };
  badge: BadgeType;
  message: string;
  attachmentUrl?: string;
  likeCount: number;
  likedByUser: boolean;
  createdAt: string;
  comments: RecognitionComment[];
}

export interface WallOfFameEntry {
  rank: number;
  employee: {
    id: string;
    name: string;
    avatarUrl: string | null;
    department: string;
  };
  recognitionCount: number;
  topBadge: BadgeType;
  quote: string;
  isEmployeeOfMonth: boolean;
}

export interface PointsLogEntry {
  id: string;
  activity: string;
  delta: number;
  balanceAfter: number;
  createdAt: string;
}

export interface RedemptionOption {
  id: string;
  label: string;
  description: string;
  cost: number;
  durationMinutes: number;
}

export interface RedemptionRequest {
  id: string;
  userId: string;
  reward: RedemptionOption;
  status: RedemptionStatus;
  adminNote?: string;
  createdAt: string;
}
