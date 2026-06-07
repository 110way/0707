# Employee Wellbeing Web Application — Copilot Development Spec

> **Purpose:** This document is the single source of truth for AI-assisted development (GitHub Copilot / Cursor / Codeium). Every section is written as a direct instruction. Follow folder structure, naming conventions, and implementation notes exactly.

---

## Project Identity

| Field | Value |
|---|---|
| App name | Employee Wellbeing Platform |
| Short name | `wellbeing-app` |
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Database | SQLite via `better-sqlite3` |
| ORM | Drizzle ORM (`drizzle-orm` + `drizzle-kit`) |
| Auth | Self-hosted JWT (`jose` library) — no third-party auth |
| Package manager | `pnpm` |
| Node version | 20 LTS |

---

## Phase Overview

This project is built in 3 sequential phases. **Do not implement backend logic in Phase 1.**

| Phase | Name | What gets built |
|---|---|---|
| **1** | UI Development | All pages, components, interactions using static mock data |
| **2** | Backend + SQLite | API routes, DB schema, auth, CRUD, seed data |
| **3** | Docker Packaging | Dockerfile, docker-compose.yml, env config, README |

---

## Folder Structure

Create this exact folder structure at project init. Do not deviate.

```
employee-wellbeing/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── surveys/
│   │   │   └── page.tsx
│   │   ├── forum/
│   │   │   └── page.tsx
│   │   ├── concerns/
│   │   │   └── page.tsx
│   │   ├── recognition/
│   │   │   └── page.tsx
│   │   ├── konnect/
│   │   │   └── page.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   └── me/route.ts
│       ├── surveys/
│       │   └── [[...slug]]/route.ts
│       ├── posts/
│       │   └── [[...slug]]/route.ts
│       ├── concerns/
│       │   └── [[...slug]]/route.ts
│       ├── recognitions/
│       │   └── [[...slug]]/route.ts
│       ├── konnect/
│       │   └── [[...slug]]/route.ts
│       ├── dashboard/
│       │   └── stats/route.ts
│       └── upload/
│           └── route.ts
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── Avatar.tsx
│   │   ├── Toast.tsx
│   │   ├── Tabs.tsx
│   │   ├── Dropdown.tsx
│   │   └── index.ts
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── surveys/
│   │   ├── SurveyCard.tsx
│   │   ├── SurveyModal.tsx
│   │   ├── QuestionRenderer.tsx
│   │   └── SurveyBuilder.tsx
│   ├── forum/
│   │   ├── PostCard.tsx
│   │   ├── PostEditor.tsx
│   │   ├── CommentThread.tsx
│   │   ├── HashtagSidebar.tsx
│   │   └── TopLikedWidget.tsx
│   ├── concerns/
│   │   ├── ConcernForm.tsx
│   │   ├── ReferenceDisplay.tsx
│   │   ├── StatusTracker.tsx
│   │   └── AdminConcernTable.tsx
│   ├── recognition/
│   │   ├── RecognitionCard.tsx
│   │   ├── GiveRecognitionModal.tsx
│   │   ├── WallOfFame.tsx
│   │   └── RecognitionLeaderboard.tsx
│   ├── konnect/
│   │   ├── PointsBalanceCard.tsx
│   │   ├── PointsHistory.tsx
│   │   ├── RedemptionCard.tsx
│   │   └── KonnectLeaderboard.tsx
│   └── dashboard/
│       ├── KpiCard.tsx
│       ├── SurveyCharts.tsx
│       ├── ConcernCharts.tsx
│       ├── ForumCharts.tsx
│       ├── RecognitionCharts.tsx
│       └── AIInsightsPanel.tsx
├── lib/
│   ├── db.ts
│   ├── schema.ts
│   ├── auth.ts
│   ├── points.ts
│   ├── seed.ts
│   └── mock-data.ts
├── hooks/
│   ├── useAuth.ts
│   └── usePoints.ts
├── types/
│   └── index.ts
├── middleware.ts
├── public/
│   └── uploads/
├── data/
│   └── .gitkeep
├── .env.local
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
└── README.md
```

---

## Environment Variables

### `.env.example` (commit this)
```
JWT_SECRET=change_me_to_a_long_random_string_min_32_chars
DATABASE_PATH=./data/app.db
UPLOAD_DIR=./public/uploads
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=Employee Wellbeing Platform
```

### `.env.local` (gitignore this, copy from example)
- `JWT_SECRET` — minimum 32 characters, used to sign/verify all JWTs
- `DATABASE_PATH` — relative path to SQLite file
- `UPLOAD_DIR` — local directory for file uploads
- Never hardcode secrets anywhere in source files

---

## Phase 1 — UI Development

### Rules for Phase 1
- All data comes from `lib/mock-data.ts` — no fetch calls, no API calls
- Use React `useState` and `useContext` for all interactivity
- Auth context is mocked: `useAuth()` returns a hardcoded user object
- Every component must accept typed props — no `any` types
- Tailwind only for styling — no inline styles, no CSS modules
- Use Framer Motion for: page transitions, modal open/close, card hover, carousel

### Shared Auth Context (Phase 1 mock)

```typescript
// lib/mock-data.ts — export this
export const MOCK_USER = {
  id: '1',
  name: 'Rahul Naik',
  email: 'rahul@company.com',
  role: 'employee' as const, // change to 'hr' or 'admin' to test different views
  department: 'Engineering',
  avatarUrl: null,
  pointsBalance: 145,
}
```

### `(app)/layout.tsx`

- Render `<Navbar />` at top (sticky, z-50)
- Render `<Sidebar />` on left for desktop, hidden on mobile (hamburger toggle)
- Render `<Footer />` at bottom
- Wrap children in a `<main>` with left padding on desktop to account for sidebar
- Import and use `AuthProvider` wrapping the layout

### Navbar component

- Left: app logo + name
- Center: nav links (Home, Surveys, Forum, Concerns, Recognition, Konnect)
- Show Dashboard link only if role is `hr` or `admin`
- Right: user avatar + name, points badge (from `useAuth()`), dark/light mode toggle
- Use `next-themes` for dark/light mode
- Sticky, backdrop blur on scroll

### Dark/Light mode

- Install `next-themes`
- Add `ThemeProvider` wrapping the root layout in `app/layout.tsx`
- Theme toggle button in Navbar: sun/moon icon swap with Framer Motion
- All Tailwind classes must use `dark:` variants

---

## Module 1 — Home Page (`app/(app)/page.tsx`)

### Sections (top to bottom)

1. **Hero Banner**
   - Animated gradient background using Framer Motion (subtle shifting)
   - App name, tagline: "Foster a workplace where everyone thrives"
   - Two CTA buttons: "Explore Surveys" → `/surveys`, "Give Recognition" → `/recognition`
   - Entrance animation: staggered fade-up on load

2. **Stats Counter Row**
   - 3 cards: Active Surveys, Total Recognitions, Active Users
   - In Phase 1: hardcoded values (e.g., 4, 128, 87)
   - In Phase 2: fetch from `GET /api/dashboard/stats`
   - Animate count from 0 to value on mount using Framer Motion

3. **Module Cards Grid**
   - 6 cards: Surveys, Forum, Concerns, Recognition, Konnect, Dashboard
   - Each: icon (Lucide React), title, 1-line description, arrow link
   - Grid: 1 col mobile, 2 col tablet, 3 col desktop
   - Card hover: slight lift with `whileHover={{ y: -4 }}`

4. **Benefits Row**
   - 3 columns: "Anonymous Feedback", "Peer Recognition", "Data-Driven HR"
   - Icon + heading + 2-line description

5. **Footer**
   - Company name, copyright, links: Privacy, Contact, Help

---

## Module 2 — Surveys (`app/(app)/surveys/page.tsx`)

### Data shape (mock + real)

```typescript
type Survey = {
  id: string
  title: string
  description: string
  deadline: string // ISO date string
  status: 'active' | 'completed' | 'expired'
  questionCount: number
  pointsReward: number
  completedByUser?: boolean
}

type Question = {
  id: string
  type: 'radio' | 'checkbox' | 'rating' | 'short_text' | 'long_text' | 'yes_no'
  text: string
  required: boolean
  options?: string[] // for radio and checkbox
}
```

### Page layout

- Filter tabs: All | Active | Completed | Expired
- Grid of `<SurveyCard />` components (2 cols desktop, 1 col mobile)
- HR/Admin: "Create Survey" button top-right → opens `<SurveyBuilder />`

### `SurveyCard` component

- Title, description (truncated to 2 lines)
- Deadline with countdown (e.g., "3 days left")
- Question count badge
- Points reward badge
- Status badge: green=active, gray=completed, red=expired
- "Take Survey" button — disabled if completed or expired
- Completed state: checkmark overlay

### `SurveyModal` component

- Full-screen overlay (Framer Motion slide-up)
- Progress bar at top: current question / total
- `QuestionRenderer` renders the correct input per question type:
  - `radio` → radio group
  - `checkbox` → checkbox group (multiple select)
  - `rating` → 5-star clickable rating
  - `short_text` → single-line input
  - `long_text` → textarea (max 500 chars with counter)
  - `yes_no` → two large toggle buttons
- Prev / Next navigation, Submit on last question
- Required field validation before advancing
- On submit (Phase 1): show success screen with points earned
- On submit (Phase 2): POST to `/api/surveys/:id/submit`

### `SurveyBuilder` (HR/Admin only)

- Multi-step form: Step 1 (title, description, deadline), Step 2 (add questions), Step 3 (preview)
- Add question button → dropdown to select question type → renders question editor
- Drag to reorder questions (use `@dnd-kit/core`)
- Save as Draft / Publish buttons

### API routes (Phase 2)

```
GET    /api/surveys              → list all surveys (filter by status via ?status=)
POST   /api/surveys              → create survey (hr/admin only)
GET    /api/surveys/:id          → get survey with questions
PUT    /api/surveys/:id          → update survey (hr/admin only)
DELETE /api/surveys/:id          → delete survey (hr/admin only)
POST   /api/surveys/:id/submit   → submit response (employee)
                                   body: { answers: { questionId: value }[] }
                                   returns: { pointsEarned: number }
```

---

## Module 3 — Open Forum (`app/(app)/forum/page.tsx`)

### Data shapes

```typescript
type Post = {
  id: string
  author: { id: string; name: string; avatarUrl: string | null; department: string }
  content: string
  imageUrl?: string
  hashtags: string[]
  likeCount: number
  commentCount: number
  likedByUser: boolean
  isPinned: boolean
  createdAt: string
}

type Comment = {
  id: string
  postId: string
  parentId: string | null // null = top-level comment
  author: { id: string; name: string; avatarUrl: string | null }
  content: string
  createdAt: string
  replies?: Comment[] // max 1 level of nesting in response
}
```

### Page layout

- Left column (70%): post feed + create post bar at top
- Right column (30%): hashtag sidebar + top liked posts widget
- On mobile: single column, sidebar hidden (accessible via filter button)

### `PostEditor` component

- Inline at top of feed (not a modal)
- Textarea with placeholder "Share an update, idea, or question…"
- As user types `#`, show autocomplete dropdown of existing hashtags
- Image attach button (shows preview thumbnail)
- Character count (max 1000)
- Submit button, disabled while empty

### `PostCard` component

- Author avatar + name + department + relative timestamp
- Content (full, not truncated — use "show more" for >300 chars)
- Hashtag pills (clickable → filters feed)
- Image (if attached) below content
- Like button (filled/outline toggle, animated count)
- Comment button → expands `<CommentThread />`
- Admin: pin toggle, delete button

### `CommentThread` component

- Top-level comments list
- Reply button on each comment → inline reply input
- Replies indented (max 1 level deep in UI)
- "Load more comments" if >3 comments

### `HashtagSidebar` component

- "Trending Hashtags" heading
- List of hashtags with post count
- Selected hashtag highlighted — click to filter feed
- "Top Liked Posts" widget below: top 5 posts by like count (title + like count)

### Feed filtering

- Sort bar: Latest | Most Liked | Most Commented
- Search bar: filters feed client-side by post content in Phase 1
- Hashtag filter: active hashtag shown as chip with X to clear

### API routes (Phase 2)

```
GET    /api/posts                → paginated list (?page=&sort=&hashtag=&search=)
POST   /api/posts                → create post (+5 pts)
PUT    /api/posts/:id            → edit post (own posts only)
DELETE /api/posts/:id            → delete post (own or admin)
POST   /api/posts/:id/like       → toggle like
POST   /api/posts/:id/comments   → add comment
                                   body: { content: string; parentId?: string }
GET    /api/posts/:id/comments   → get comments for post
PATCH  /api/posts/:id/pin        → pin/unpin (admin only)
```

---

## Module 4 — Concerns (`app/(app)/concerns/page.tsx`)

### Data shapes

```typescript
type Concern = {
  id: string
  referenceId: string // UUID, generated client-side
  category: 'Harassment' | 'Workload' | 'Management' | 'Environment' | 'Policy' | 'Other'
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  title: string
  description: string
  attachmentUrl?: string
  incidentDate?: string
  status: 'Open' | 'In Progress' | 'Resolved' | 'Unaddressed'
  createdAt: string
  // Admin-only fields:
  submitterId?: string
  assigneeId?: string
  adminNotes?: string
}

type AuditEntry = {
  id: string
  concernId: string
  changedBy: string // admin name
  oldStatus: string
  newStatus: string
  note?: string
  changedAt: string
}
```

### Page layout (role-based)

**Employee view:**
- Two sections: "Submit a Concern" (left) + "Track Your Concern" (right)

**Admin view:**
- Full concern management table (see below)

### `ConcernForm` component

- Generate a UUID v4 `referenceId` client-side when the component mounts. Store in state.
- Fields:
  - Category (select dropdown)
  - Severity (radio buttons with color indicators: Low=gray, Medium=yellow, High=orange, Critical=red)
  - Title (text input, required)
  - Description (textarea, max 1000 chars, counter shown)
  - Date of Incident (date picker, optional)
  - Attachment (file input, PDF/JPG/PNG, max 10MB, optional)
- Submit button
- On submit: POST to `/api/concerns` (Phase 2). In Phase 1: show success state.
- Important: the `referenceId` is sent in the request body, not generated server-side

### `ReferenceDisplay` component

- Shown after successful submission
- Large display of the Reference ID with copy-to-clipboard button
- Warning: "Save this ID — it's the only way to track your concern"
- "Submit Another" button to reset form

### `StatusTracker` component

- Input field for Reference ID
- "Check Status" button → GET `/api/concerns/:refId/status`
- Shows: status badge, submitted date, last updated date
- Does not reveal any identifying information

### `AdminConcernTable` component (admin role only)

- Data table with columns: Ref ID, Category, Severity, Title, Status, Submitted, Days Open, Actions
- Filters: status (multiselect), category (multiselect), severity
- Row click → opens concern detail drawer
- Status badge colors: Open=red, In Progress=yellow, Resolved=green, Unaddressed=gray

### Concern Detail Drawer (admin)

- Full concern details
- Submitter ID shown (not name — just the internal ID)
- Status update select with "Save" button
- Internal notes textarea (not visible to submitter)
- Assign to dropdown (list of admin users)
- Audit log timeline below

### API routes (Phase 2)

```
POST   /api/concerns                        → submit concern (no auth required — strip session)
GET    /api/concerns/:refId/status          → public status check (no auth)
GET    /api/admin/concerns                  → list all concerns (admin only)
GET    /api/admin/concerns/:id              → concern detail with audit log (admin only)
PATCH  /api/admin/concerns/:id              → update status/notes/assignee (admin only)
                                              body: { status?, adminNote?, assigneeId? }
```

### Anonymity rules (enforce in Phase 2)

- The `POST /api/concerns` route must NOT read `req.user` or attach any session identity to the concern row automatically
- The `submitterId` field is only populated if the user is logged in AND chooses to optionally self-identify (not in POC scope — leave the field nullable)
- No IP address stored anywhere
- The `referenceId` comes from the request body, not generated server-side

---

## Module 5 — Recognition (`app/(app)/recognition/page.tsx`)

### Data shapes

```typescript
type BadgeType = 'Excellence' | 'Innovation' | 'Teamwork' | 'Leadership' | 'AboveAndBeyond' | 'ProblemSolver'

type Recognition = {
  id: string
  sender: { id: string; name: string; avatarUrl: string | null }
  recipient: { id: string; name: string; avatarUrl: string | null; department: string }
  badge: BadgeType
  message: string
  attachmentUrl?: string
  likeCount: number
  likedByUser: boolean
  createdAt: string
  comments: RecognitionComment[]
}

type WallOfFameEntry = {
  rank: number
  employee: { id: string; name: string; avatarUrl: string | null; department: string }
  recognitionCount: number
  topBadge: BadgeType
  quote: string // the most recent recognition message received
  isEmployeeOfMonth: boolean
}
```

### Page layout

- Top: Wall of Fame carousel (full width)
- Below: "Give Recognition" button + recognition feed
- Right sidebar: recognition leaderboard (top 5)

### `GiveRecognitionModal` component

- Trigger: "Give Recognition" button → Framer Motion slide-up modal
- Step 1: Search and select recipient (typeahead input, shows name + department)
- Step 2: Select badge (6 visual badge cards with icon + label, click to select)
- Step 3: Write message (rich textarea, min 10 chars)
- Optional: attach file (image or PDF, max 10MB)
- Optional: tag additional colleagues (multi-select)
- Submit → POST `/api/recognitions`
- On success: toast notification, close modal, prepend to feed

### Badge definitions

```typescript
export const BADGES = {
  Excellence:      { emoji: '🏆', color: 'amber',  label: 'Excellence' },
  Innovation:      { emoji: '💡', color: 'blue',   label: 'Innovation' },
  Teamwork:        { emoji: '🤝', color: 'teal',   label: 'Teamwork' },
  Leadership:      { emoji: '⭐', color: 'purple', label: 'Leadership' },
  AboveAndBeyond:  { emoji: '💪', color: 'coral',  label: 'Above & Beyond' },
  ProblemSolver:   { emoji: '🎯', color: 'green',  label: 'Problem Solver' },
}
```

### `WallOfFame` component

- Auto-rotates every 3000ms using `setInterval` + Framer Motion `AnimatePresence`
- Pause rotation on mouse enter (`onMouseEnter` → clearInterval)
- Resume on mouse leave (`onMouseLeave` → restart interval)
- Manual prev/next arrow buttons
- Each slide: avatar, name, department, recognition count, badge icon, quote
- First slide: "Employee of the Month" — larger card with gold border
- Dot indicators at bottom showing current slide

### `RecognitionCard` component

- LinkedIn-style card: sender avatar + "recognized" + recipient name with badge
- Message content
- Attachment thumbnail if present
- Like button (toggle) + comment button
- Collapsed comment thread (click to expand)

### API routes (Phase 2)

```
GET    /api/recognitions              → paginated feed
POST   /api/recognitions              → give recognition (+5 sender, +10 recipient)
DELETE /api/recognitions/:id          → delete own recognition
POST   /api/recognitions/:id/like     → toggle like
POST   /api/recognitions/:id/comments → add comment
GET    /api/recognition/wall-of-fame  → top 10 by recognition count this month
```

---

## Module 6 — Konnect (`app/(app)/konnect/page.tsx`)

### Data shapes

```typescript
type PointsLogEntry = {
  id: string
  activity: string // e.g., "Completed Survey: Q3 Wellbeing Check"
  delta: number    // positive = earned, negative = spent
  balanceAfter: number
  createdAt: string
}

type RedemptionOption = {
  id: string
  label: string
  description: string
  cost: number
  durationMinutes: number
}

type RedemptionRequest = {
  id: string
  userId: string
  reward: RedemptionOption
  status: 'Pending' | 'Approved' | 'Declined'
  adminNote?: string
  createdAt: string
}
```

### Redemption options (hardcode these)

```typescript
export const REDEMPTION_OPTIONS: RedemptionOption[] = [
  { id: 'team_lead',    label: '1:1 with Team Lead',       description: '30-minute conversation', cost: 70,  durationMinutes: 30 },
  { id: 'manager',      label: 'Career Chat with Manager', description: '45-minute career discussion', cost: 100, durationMinutes: 45 },
  { id: 'mentorship',   label: 'Mentorship Session',       description: '1-hour mentorship',      cost: 200, durationMinutes: 60 },
  { id: 'cxo',          label: 'Meet with CXO',            description: '30-minute leadership chat', cost: 250, durationMinutes: 30 },
]
```

### Page layout

- Top row: large `PointsBalanceCard` + progress bar to next milestone
- Middle: `RedemptionCard` grid (2x2)
- Bottom: `PointsHistory` timeline + optional leaderboard

### `PointsBalanceCard` component

- Large points number (animated count-up on mount)
- Subtitle: "points available"
- Smaller text: "You've earned X points this month"
- Badge showing current streak (e.g., "🔥 3-day streak")

### `RedemptionCard` component

- Title, description, duration
- Cost badge (e.g., "70 pts")
- "Redeem" button: enabled only if `user.pointsBalance >= option.cost`
- Disabled state: grayed out with tooltip "You need X more points"
- Cooldown state: "Available in N days" if redeemed in last 30 days
- On click: opens confirmation modal → POST `/api/konnect/redeem`

### `PointsHistory` component

- Timeline list (newest first)
- Each entry: activity label, delta (green for +, red for −), balance after, date
- Max 20 entries shown, "Load more" button

### Points earning rules (implement in Phase 2 `lib/points.ts`)

```typescript
// Call these after the corresponding action succeeds

export const POINT_RULES = {
  SURVEY_COMPLETE:       2,
  RECOGNITION_SENT:      1,
  RECOGNITION_RECEIVED: 10,
  POST_CREATED:          5,
  POST_REACHED_10_LIKES: 7,  // one-time per post
  LOGIN_STREAK_7_DAYS:   7,  // one-time per streak completion
  FIRST_POST_OF_MONTH:  10,  // one-time per calendar month
}
```

### API routes (Phase 2)

```
GET    /api/konnect/balance    → { balance: number, thisMonth: number, streak: number }
GET    /api/konnect/history    → paginated points log
POST   /api/konnect/redeem     → body: { optionId: string }
                                  validation: sufficient balance + 30-day cooldown
GET    /api/admin/redemptions  → list all redemption requests (admin)
PATCH  /api/admin/redemptions/:id → body: { status: 'Approved'|'Declined', adminNote?: string }
```

---

## Module 7 — Dashboard (`app/(app)/dashboard/page.tsx`)

> Accessible to `hr` and `admin` roles only. Redirect `employee` to home.

### Chart library

Use `recharts` for all charts. Import only required chart types.

### `KpiCard` component

```typescript
type KpiCardProps = {
  label: string
  value: number | string
  trend?: number   // percentage change vs previous period
  icon: LucideIcon
  color: 'blue' | 'green' | 'amber' | 'red'
}
```

### Top KPI row (4 cards)

| Label | Source field | Icon |
|---|---|---|
| Active Surveys | `stats.surveys.active` | `ClipboardList` |
| Open Concerns | `stats.concerns.open` | `AlertTriangle` |
| Recognitions This Month | `stats.recognition.thisMonth` | `Award` |
| Total Points Distributed | `stats.konnect.totalPoints` | `Coins` |

### Survey analytics section

- **Response rate bar chart**: one bar per survey, % completion (Recharts `BarChart`)
- **Sentiment donut chart**: Positive / Neutral / Negative slices (Recharts `PieChart`)
- **Department participation**: horizontal bar chart (Recharts `BarChart` with `layout="vertical"`)

### Concern analytics section

- **Status matrix**: 4 metric cards (Total / Open / In Progress / Resolved)
- **Category distribution**: donut chart (Recharts `PieChart`)
- **Monthly trend**: area chart (Recharts `AreaChart`)

### Forum engagement section

- **Activity heatmap**: 7×N grid (7 days × weeks), each cell colored by post count
  - Build as a CSS grid with dynamic color intensity based on count
  - Tooltip on hover showing date + post count
- **Top hashtags**: horizontal bar chart

### Recognition section

- **Category radar chart**: Recharts `RadarChart` with 6 axes (one per badge type)
- **Trend line chart**: recognitions given per day over selected period

### Filters

- Date range toggle: "7d" | "30d" | "90d" buttons — active state highlighted
- Department select dropdown (populated from DB in Phase 2, hardcoded list in Phase 1)
- Filters passed as query params to `/api/dashboard/stats?days=30&department=Engineering`

### `AIInsightsPanel` component

- Card with "AI Insights" heading + sparkle icon
- In Phase 1: display 3 hardcoded insight strings
- In Phase 2: call `/api/dashboard/insights` which generates rule-based text server-side
- Each insight: icon (info / warning / success) + text + category tag
- Example insights to hardcode:
  - "Survey completion is 12% below average this month in Engineering."
  - "3 concerns have been unaddressed for more than 7 days."
  - "Recognition activity increased 24% compared to last month."

### API route (Phase 2)

```
GET /api/dashboard/stats?days=30&department=Engineering
→ returns aggregated JSON matching all chart data shapes above

GET /api/dashboard/insights?days=30
→ returns { insights: { type: 'info'|'warning'|'success', text: string, category: string }[] }
   generated server-side using pure SQL aggregations — no external AI service
```

---

## Phase 2 — Backend Implementation

### Database connection (`lib/db.ts`)

```typescript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'

const dbPath = process.env.DATABASE_PATH ?? './data/app.db'
const sqlite = new Database(path.resolve(dbPath))
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
export default db
```

### Auth helpers (`lib/auth.ts`)

```typescript
// Use the `jose` library (works in Next.js edge middleware)
// Functions to export:
// signJwt(payload: { id, email, role }) → Promise<string>
// verifyJwt(token: string) → Promise<JwtPayload | null>
// hashPassword(password: string) → Promise<string>   (use bcryptjs)
// comparePassword(password, hash) → Promise<boolean>
```

### JWT cookie name: `wb_token`
- httpOnly: true
- sameSite: 'lax'
- secure: true in production, false in development
- maxAge: 7 days

### Middleware (`middleware.ts`)

```typescript
// Protect these path patterns:
const PROTECTED = ['/api/surveys', '/api/posts', '/api/concerns', '/api/recognitions', '/api/konnect', '/api/dashboard', '/api/upload', '/api/admin']
const PUBLIC = ['/api/auth/login', '/api/auth/logout', '/api/concerns/:refId/status']

// For each protected route:
// 1. Read cookie wb_token
// 2. Verify JWT — if invalid/missing → return 401 JSON
// 3. Attach decoded user to request headers: x-user-id, x-user-role
// 4. Role check: if route starts with /api/admin and role !== 'admin' → 403

// Protect app pages too:
// /dashboard → redirect to / if role is 'employee'
// All (app) routes → redirect to /login if not authenticated
```

### Seed data (`lib/seed.ts`)

Create seed data for:
- 10 employees, 2 hr users, 1 admin (all with password: `Password123!`)
- 3 surveys (1 active, 1 completed, 1 expired) with 4 questions each
- 15 forum posts with hashtags
- 10 recognitions across various employees
- 5 concerns (mix of statuses)
- Points log entries for all users

Seed check: before inserting, check `SELECT COUNT(*) FROM users`. If > 0, skip (idempotent).

---

## Phase 3 — Docker

### `Dockerfile`

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/lib/seed.ts ./lib/
COPY --from=builder /app/lib/schema.ts ./lib/
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /app/data /app/public/uploads
EXPOSE 3000
CMD ["sh", "-c", "node lib/seed.js && pnpm start"]
```

### `docker-compose.yml`

```yaml
version: '3.9'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    volumes:
      - db_data:/app/data
      - uploads_data:/app/public/uploads
    restart: unless-stopped

volumes:
  db_data:
  uploads_data:
```

### `drizzle.config.ts`

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? './data/app.db',
  },
} satisfies Config
```

---

## Drizzle Schema (`lib/schema.ts`)

Define all tables using Drizzle ORM. Use `sqliteTable` from `drizzle-orm/sqlite-core`.

### Required tables and columns

```
users              id, name, email, password_hash, role, department, avatar_url, points_balance, login_dates (JSON text), created_at
surveys            id, title, description, deadline, status, created_by, questions (JSON text), created_at, updated_at
survey_responses   id, survey_id, user_id, answers (JSON text), submitted_at
                   UNIQUE(survey_id, user_id)
posts              id, author_id, content, image_url, is_pinned (integer default 0), created_at, updated_at
hashtags           id, name, post_count (integer default 0)
post_hashtags      post_id, hashtag_id  [composite PK]
post_likes         post_id, user_id     [composite PK]
comments           id, post_id, author_id, parent_id (nullable), content, created_at
concerns           id, reference_id (unique), category, severity, title, description, attachment_url, incident_date, status (default 'Open'), submitter_id (nullable), assignee_id (nullable), admin_notes, created_at, updated_at
concern_audit_log  id, concern_id, changed_by, old_status, new_status, note, changed_at
recognitions       id, sender_id, recipient_id, badge, message, attachment_url, created_at
recognition_likes  recognition_id, user_id  [composite PK]
recognition_comments id, recognition_id, author_id, content, created_at
points_log         id, user_id, activity, delta, balance_after, ref_id (nullable), created_at
redemption_requests id, user_id, reward_type, points_cost, status (default 'Pending'), admin_note, created_at
```

All `id` columns: `text('id').primaryKey().$defaultFn(() => crypto.randomUUID())`
All `created_at` columns: `text('created_at').notNull().$defaultFn(() => new Date().toISOString())`

---

## TypeScript Types (`types/index.ts`)

Export all shared types here. Every component and API route imports from this file — no inline type definitions allowed.

```typescript
export type Role = 'employee' | 'hr' | 'admin'
export type SurveyStatus = 'draft' | 'active' | 'completed' | 'expired'
export type ConcernStatus = 'Open' | 'In Progress' | 'Resolved' | 'Unaddressed'
export type ConcernCategory = 'Harassment' | 'Workload' | 'Management' | 'Environment' | 'Policy' | 'Other'
export type ConcernSeverity = 'Low' | 'Medium' | 'High' | 'Critical'
export type BadgeType = 'Excellence' | 'Innovation' | 'Teamwork' | 'Leadership' | 'AboveAndBeyond' | 'ProblemSolver'
export type RedemptionStatus = 'Pending' | 'Approved' | 'Declined'
export type QuestionType = 'radio' | 'checkbox' | 'rating' | 'short_text' | 'long_text' | 'yes_no'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  department: string
  avatarUrl: string | null
  pointsBalance: number
}

// ... (all other types defined per module section above)
```

---

## `package.json` — Required Dependencies

```json
{
  "dependencies": {
    "next": "14.2.x",
    "react": "^18",
    "react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3",
    "framer-motion": "^11",
    "drizzle-orm": "^0.30.x",
    "better-sqlite3": "^9.x",
    "jose": "^5.x",
    "bcryptjs": "^2.x",
    "recharts": "^2.x",
    "lucide-react": "^0.383.x",
    "next-themes": "^0.3.x",
    "@dnd-kit/core": "^6.x",
    "@dnd-kit/sortable": "^8.x",
    "uuid": "^9.x",
    "date-fns": "^3.x"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21.x",
    "@types/better-sqlite3": "^7.x",
    "@types/bcryptjs": "^2.x",
    "@types/uuid": "^9.x",
    "autoprefixer": "^10",
    "postcss": "^8"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:push": "drizzle-kit push:sqlite",
    "db:seed": "tsx lib/seed.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## Coding Conventions

These rules apply to every file generated.

| Rule | Detail |
|---|---|
| Language | TypeScript strict mode — no `any`, no `as unknown` |
| Components | Functional components only, named exports |
| Props | Always define a `type Props = {}` above the component |
| Imports | Path alias `@/` maps to project root |
| API response shape | Always `{ data: T }` for success, `{ error: string }` for failure |
| HTTP status codes | 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| Error handling | All API routes wrapped in try/catch, return 500 with `{ error: 'Internal server error' }` |
| File naming | Components: PascalCase.tsx — utilities/hooks: camelCase.ts — pages: page.tsx |
| No `console.log` | Use `console.error` only in catch blocks |
| Tailwind class order | Follow Prettier Tailwind plugin order |
| Framer Motion | All animation variants defined outside the component (not inline) |
| Forms | Controlled components with `useState` — no form libraries needed |
| Date formatting | Always use `date-fns` — no `new Date().toLocaleDateString()` |

---

## Accessibility Requirements

- All interactive elements keyboard-navigable (tab order correct)
- All images have `alt` attributes
- All form inputs have associated `<label>` elements
- Color is never the only indicator of state (always pair with text or icon)
- Focus rings visible on all interactive elements (`focus-visible:ring-2`)
- Modal focus trap: when modal opens, focus moves inside; Escape closes it

---

## README Template

The `README.md` must include these sections:

1. **Quick start** — `git clone` → `cp .env.example .env.local` → `docker-compose up --build`
2. **Without Docker** — `pnpm install` → `pnpm db:push` → `pnpm db:seed` → `pnpm dev`
3. **Default credentials**

   | Email | Password | Role |
   |---|---|---|
   | rahul@company.com | Password123! | employee |
   | hr@company.com | Password123! | hr |
   | admin@company.com | Password123! | admin |

4. **Environment variables** — description of each
5. **Project structure** — brief folder tree
6. **Phase status** — checkboxes for Phase 1 / 2 / 3

---

*End of specification. All sections above are binding for development.*
