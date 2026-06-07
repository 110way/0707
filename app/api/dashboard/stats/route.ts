import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');

    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const department = url.searchParams.get('department') || 'All';

    // 1. Fetch KPI raw values
    // Active surveys count
    const activeSurveysRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.surveys)
      .where(eq(schema.surveys.status, 'active'))
      .get();
    const activeSurveys = activeSurveysRes?.count || 0;

    // Open concerns count
    const openConcernsRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.concerns)
      .where(eq(schema.concerns.status, 'Open'))
      .get();
    const openConcerns = openConcernsRes?.count || 0;

    // Total points distributed
    const totalPointsRes = await db
      .select({ total: sql<number>`sum(points_balance)` })
      .from(schema.users)
      .get();
    const totalPoints = totalPointsRes?.total || 0;

    // Recognitions this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthIso = startOfMonth.toISOString();

    const recognitionsThisMonthRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.recognitions)
      .where(sql`${schema.recognitions.createdAt} >= ${startOfMonthIso}`)
      .get();
    const recognitionsThisMonth = recognitionsThisMonthRes?.count || 0;

    // Total employees count
    const employeesCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(eq(schema.users.role, 'employee'))
      .get();
    const totalEmployees = Math.max(1, employeesCountRes?.count || 0);

    // 2. Survey response rates
    const surveys = await db.select().from(schema.surveys).all();
    const surveyResponses = await db.select().from(schema.surveyResponses).all();
    
    const surveyResponsesMap = new Map<string, number>();
    for (const r of surveyResponses) {
      surveyResponsesMap.set(r.surveyId, (surveyResponsesMap.get(r.surveyId) || 0) + 1);
    }

    const responseRates = surveys.map(s => {
      const respCount = surveyResponsesMap.get(s.id) || 0;
      const rate = Math.min(100, Math.round((respCount / totalEmployees) * 100));
      return {
        name: s.title.length > 20 ? s.title.slice(0, 20) + '...' : s.title,
        rate,
      };
    });

    // 3. Sentiment breakdown based on rating questions
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    let ratingCount = 0;

    for (const r of surveyResponses) {
      try {
        const answers = JSON.parse(r.answers);
        // answers can be key-value pair or array. Handle both.
        const answerValues = typeof answers === 'object' ? Object.values(answers) : [];
        for (const val of answerValues) {
          if (typeof val === 'number') {
            ratingCount++;
            if (val >= 4) positiveCount++;
            else if (val === 3) neutralCount++;
            else negativeCount++;
          }
        }
      } catch (e) {}
    }

    let sentiment = [
      { name: 'Positive', value: 65 },
      { name: 'Neutral', value: 25 },
      { name: 'Negative', value: 10 },
    ];

    if (ratingCount > 0) {
      sentiment = [
        { name: 'Positive', value: Math.round((positiveCount / ratingCount) * 100) },
        { name: 'Neutral', value: Math.round((neutralCount / ratingCount) * 100) },
        { name: 'Negative', value: Math.round((negativeCount / ratingCount) * 100) },
      ];
    }

    // 4. Concern category distribution
    const concerns = await db.select().from(schema.concerns).all();
    const concernCategoriesMap = new Map<string, number>();
    for (const c of concerns) {
      concernCategoriesMap.set(c.category, (concernCategoriesMap.get(c.category) || 0) + 1);
    }

    const categories = Array.from(concernCategoriesMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    // Ensure all standard categories exist in output
    const standardCategories = ['Harassment', 'Workload', 'Management', 'Environment', 'Policy', 'Other'];
    for (const cat of standardCategories) {
      if (!categories.some(c => c.name === cat)) {
        categories.push({ name: cat, value: 0 });
      }
    }

    // 5. Concern monthly trend (past 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        month: months[d.getMonth()],
        year: d.getFullYear(),
        monthNum: d.getMonth(),
        count: 0,
      };
    });

    for (const c of concerns) {
      const cDate = new Date(c.createdAt);
      for (const m of last6Months) {
        if (cDate.getMonth() === m.monthNum && cDate.getFullYear() === m.year) {
          m.count++;
        }
      }
    }

    const trend = last6Months.map(m => ({
      month: m.month,
      count: m.count,
    }));

    // 6. Recognition badge allocations
    const recognitions = await db.select().from(schema.recognitions).all();
    const badgeMap = new Map<string, number>();
    for (const r of recognitions) {
      badgeMap.set(r.badge, (badgeMap.get(r.badge) || 0) + 1);
    }

    const recognitionCategories = [
      { name: 'Excellence', value: badgeMap.get('Excellence') || 0 },
      { name: 'Innovation', value: badgeMap.get('Innovation') || 0 },
      { name: 'Teamwork', value: badgeMap.get('Teamwork') || 0 },
      { name: 'Leadership', value: badgeMap.get('Leadership') || 0 },
      { name: 'Above & Beyond', value: badgeMap.get('AboveAndBeyond') || 0 },
      { name: 'Problem Solver', value: badgeMap.get('ProblemSolver') || 0 },
    ];

    // 7. Dynamic Rule-based Insights
    // Check unaddressed concerns older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();

    const oldUnaddressedConcerns = concerns.filter(
      c => c.status === 'Open' && c.createdAt < sevenDaysAgoIso
    ).length;

    // Compare this month recognition activity vs last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfLastMonthIso = startOfLastMonth.toISOString();
    const startOfThisMonthIso = startOfMonthIso;

    const recognitionsLastMonth = recognitions.filter(
      r => r.createdAt >= startOfLastMonthIso && r.createdAt < startOfThisMonthIso
    ).length;

    let recChangePercent = 0;
    if (recognitionsLastMonth > 0) {
      recChangePercent = Math.round(
        ((recognitionsThisMonth - recognitionsLastMonth) / recognitionsLastMonth) * 100
      );
    } else if (recognitionsThisMonth > 0) {
      recChangePercent = 100;
    }

    const insights = [];
    
    // Insight 1: survey response rate check
    const lowestSurvey = surveys
      .filter(s => s.status === 'active')
      .map(s => {
        const respCount = surveyResponsesMap.get(s.id) || 0;
        const rate = Math.min(100, Math.round((respCount / totalEmployees) * 100));
        return { title: s.title, rate };
      })
      .sort((a, b) => a.rate - b.rate)[0];

    if (lowestSurvey && lowestSurvey.rate < 60) {
      insights.push({
        type: 'warning',
        text: `Survey completion for "${lowestSurvey.title}" is currently low at ${lowestSurvey.rate}%.`,
        category: 'Surveys',
      });
    } else {
      insights.push({
        type: 'success',
        text: 'Workplace wellbeing survey completion rates are stable and above average.',
        category: 'Surveys',
      });
    }

    // Insight 2: Unaddressed concerns
    if (oldUnaddressedConcerns > 0) {
      insights.push({
        type: 'error',
        text: `${oldUnaddressedConcerns} anonymous concern${oldUnaddressedConcerns > 1 ? 's have' : ' has'} been unaddressed for more than 7 days.`,
        category: 'Concerns',
      });
    } else {
      insights.push({
        type: 'success',
        text: 'All anonymous concerns received within the past week have been acknowledged.',
        category: 'Concerns',
      });
    }

    // Insight 3: Recognition growth
    if (recChangePercent > 0) {
      insights.push({
        type: 'success',
        text: `Peer recognition kudos increased by ${recChangePercent}% compared to last month. Keep it up!`,
        category: 'Recognition',
      });
    } else if (recChangePercent < 0) {
      insights.push({
        type: 'warning',
        text: `Peer recognition kudos dropped by ${Math.abs(recChangePercent)}% compared to last month.`,
        category: 'Recognition',
      });
    } else {
      insights.push({
        type: 'info',
        text: 'Peer recognition kudos count is steady compared to last month.',
        category: 'Recognition',
      });
    }

    const payload = {
      surveys: {
        active: activeSurveys,
        completed: surveys.filter(s => s.status === 'completed' || s.status === 'expired').length, // total resolved surveys
        responseRates,
        sentiment,
      },
      concerns: {
        open: openConcerns,
        inProgress: concerns.filter(c => c.status === 'In Progress').length,
        resolved: concerns.filter(c => c.status === 'Resolved').length,
        unaddressed: concerns.filter(c => c.status === 'Unaddressed').length,
        categories,
        trend,
      },
      recognition: {
        thisMonth: recognitionsThisMonth,
        categories: recognitionCategories,
      },
      konnect: {
        totalPoints,
      },
      insights,
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    console.error('Error in GET /api/dashboard/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
