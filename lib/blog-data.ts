export interface BlogArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: string;
  author: string;
  publishedAt: string;
}

export const MOCK_BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'blog-1',
    title: '5 Practical Tips to Prevent Workplace Burnout',
    category: 'Mental Health',
    readTime: '4 min read',
    author: 'People & Culture Team',
    publishedAt: '2026-05-15T09:00:00.000Z',
    excerpt: 'Learn actionable strategies to set healthy boundaries, manage workloads, and recharge effectively during busy sprint cycles.',
    content: `
## Why Burnout Happens

Workplace burnout is more than just feeling tired; it is a state of physical and emotional exhaustion caused by prolonged work-related stress. In fast-paced roles, high delivery speed can trigger burnout if not managed with careful work-life balance routines.

Here are 5 practical ways to prevent burnout and keep your energy levels high:

### 1. Set Clear Boundaries
Establish clear starting and ending times for your workday, especially when working hybrid or remote. Avoid reading or replying to notifications outside of these core working hours. Let your team know when you are offline.

### 2. Take Micro-Breaks (The 90-Minute Rule)
Our brains can focus intensely for about 90 to 120 minutes before needing a break. Step away from your computer for 5–10 minutes after each sprint of work. Grab a glass of water, do a light stretch, or rest your eyes.

### 3. Prioritize with the Eisenhower Matrix
When everything feels urgent, nothing is. Group your tasks into:
- **Urgent & Important**: Do it now.
- **Important but Not Urgent**: Schedule a time to do it.
- **Urgent but Not Important**: Delegate or automate.
- **Neither**: Drop it.

### 4. Have Candid Conversations About Capacity
If your sprint commitment feels overwhelming, discuss it during planning or check-ins with your team lead. Adjusting goals early is much better than struggling in silence and missing deadlines.

### 5. Utilize Peer Recognition and Wellness Checkups
Take time to share positive feedback and appreciate your colleagues using our Kudos and Recognition portal. Feeling connected and appreciated is a key buffer against professional stress. Don't forget to complete the regular Wellbeing surveys to voice your workspace concerns!
    `
  },
  {
    id: 'blog-2',
    title: 'Desktop Ergonomics: Setup Guide for Remote & Office Workspaces',
    category: 'Physical Health',
    readTime: '3 min read',
    author: 'Facilities & Health Safety',
    publishedAt: '2026-05-20T10:30:00.000Z',
    excerpt: 'Optimize your remote or office workstation layout to reduce back strain, eye fatigue, and repetitive strain injuries.',
    content: `
## Your Physical Workspace Matters

Sitting at a desk for several hours a day can take a serious toll on your body if your workstation is poorly configured. Proper ergonomics help prevent repetitive strain injuries (RSI), neck pain, and chronic lower back strain.

Follow this step-by-step checklist to optimize your workspace layout:

### 1. Chair Adjustment
Adjust your chair height so that your feet rest flat on the floor, and your knees are at a 90-degree angle (or slightly lower than your hips). Ensure your lower back is fully supported by the chair's lumbar support.

### 2. Monitor Distance & Screen Height
Place your monitor directly in front of you, about an arm's length away. The top third of your screen should be at eye level. This prevents you from tilting your head up or slouching forward to read text.

### 3. Keyboard & Mouse Position
Keep your keyboard and mouse close enough so that your elbows stay bent at about a 90-degree angle, tucked close to your torso. Your wrists should remain straight and neutral, not bent upward or downward.

### 4. Optimize Lighting to Reduce Eye Strain
Avoid high-contrast glare on your screen. Adjust monitor brightness to match ambient room light, and position your desk relative to windows so that light comes from the side rather than directly in front of or behind the screen.

### 5. Follow the 20-20-20 Rule
To prevent digital eye strain, look away from your screen every 20 minutes at an object 20 feet away for at least 20 seconds. This relaxes the focusing muscles inside your eyes.
    `
  },
  {
    id: 'blog-3',
    title: 'Introduction to Mindfulness and Breathwork at Your Desk',
    category: 'Mental Health',
    readTime: '3 min read',
    author: 'Marcus Chen (Wellness Lead)',
    publishedAt: '2026-06-01T08:15:00.000Z',
    excerpt: 'A beginner-friendly guide to practicing quick mindfulness and deep breathing exercises during the workday to reduce stress.',
    content: `
## Resetting Your Nervous System

When work pressure mounts, our bodies can shift into a low-grade "fight-or-flight" stress state. This increases heart rate, shallow breathing, and mental clutter. Mindfulness and breathing exercises are fast, scientifically-backed ways to trigger the parasympathetic nervous system and restore focus.

Try these simple exercises right at your desk:

### 1. Box Breathing (The 4-Second Reset)
This technique is used by athletes and high-stress professionals to calm their minds rapidly:
1. Exhale all air from your lungs.
2. Inhale slowly through your nose for **4 seconds**.
3. Hold your breath gently for **4 seconds**.
4. Exhale smoothly through your mouth for **4 seconds**.
5. Hold your lungs empty for **4 seconds**.
*Repeat this cycle 4 times to immediately lower heart rate and restore mental clarity.*

### 2. The 5-4-3-2-1 Grounding Method
If you feel overwhelmed or distracted, bring your awareness back to the present moment by naming:
- **5** things you can see around you.
- **4** things you can physically feel (e.g. chair back, feet on floor).
- **3** things you can hear.
- **2** things you can smell.
- **1** thing you can taste.

### 3. Mindful Transitions
Instead of rushing immediately from one meeting or task directly to the next, take **one minute** to sit in silence. Take three deep, slow breaths and consciously release any tension in your shoulders and jaw before opening the next tab.
    `
  },
  {
    id: 'blog-4',
    title: 'How to Maximize and Redeem Your Wellness Points',
    category: 'Company Culture',
    readTime: '3 min read',
    author: 'Amina Diop (Operations)',
    publishedAt: '2026-06-03T14:00:00.000Z',
    excerpt: 'Discover how our point reward system works, how to earn points through surveys and peer kudos, and what you can redeem.',
    content: `
## Earning Wellbeing Rewards

The Employee Wellbeing Platform includes a point reward system called **Konnect Points**. This system encourages healthy behaviors, collaborative support, and active engagement with company wellbeing.

Here is the ultimate guide to earning and using your points:

### How to Earn Points
Every day, there are opportunities to build up your points balance:
- **Complete Surveys (+20 pts)**: Make your voice heard by completing active workplace wellbeing surveys.
- **Submit Forum Post (+5 pts)**: Start healthy discussions, share tips, or start topics in the Open Forum.
- **First Post of the Month Bonus (+10 pts)**: Earn an extra bonus for your first forum post in a calendar month.
- **Post Reaches 10 Likes (+7 pts)**: Write insightful community posts that resonate with colleagues.
- **Send Peer Recognition Kudos (+5 pts)**: Appreciate a teammate by sending a kudos badge.
- **Receive Peer Recognition Kudos (+10 pts)**: Earn points when your colleagues nominate you for a badge (Teamwork, Problem Solver, Excellence).

### What You Can Redeem
Head over to the **Konnect** tab to see available redemption items. These include:
- **Coffee with a Team Lead / Manager (70 pts)**: Connect over coffee to discuss career paths or get advice.
- **Wellness Amazon Gift Card $25 (150 pts)**: Redeem points for shopping credits.
- **1:1 Executive Mentorship Session (200 pts)**: Get direct mentorship time with a CXO or department director.
- **Wellness Day Off (400 pts)**: Redeem points for a fully paid additional wellness day off.

### Important Cooldown Rules
To ensure fairness, redemptions are subject to a **30-day cooldown** limit per user. Make sure to plan your points redemptions accordingly!
    `
  }
];
