import { db } from './db';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

export const POINT_RULES = {
  SURVEY_COMPLETE: 20, // Adjusted from 2 to 20 to match the survey description points
  RECOGNITION_SENT: 5,
  RECOGNITION_RECEIVED: 10,
  POST_CREATED: 5,
  POST_REACHED_10_LIKES: 7, // one-time per post
  LOGIN_STREAK_7_DAYS: 7, // one-time per streak completion
  FIRST_POST_OF_MONTH: 10, // one-time per calendar month
};

export async function awardPoints(
  userId: string,
  delta: number,
  activity: string,
  refId?: string
) {
  return db.transaction(async (tx) => {
    // 1. Get current balance
    const user = await tx
      .select({ pointsBalance: schema.users.pointsBalance })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const newBalance = user.pointsBalance + delta;

    // 2. Update user's balance
    await tx
      .update(schema.users)
      .set({ pointsBalance: newBalance })
      .where(eq(schema.users.id, userId))
      .run();

    // 3. Log the points history entry
    await tx
      .insert(schema.pointsLog)
      .values({
        userId,
        activity,
        delta,
        balanceAfter: newBalance,
        refId,
      })
      .run();

    return newBalance;
  });
}
