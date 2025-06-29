import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

// Define limits for different actions.
// These values can be tuned based on expected user behavior.
const limits = {
  createMessageThread: { limit: 10, windowInSeconds: 60 }, // 10 threads per minute
  requestPayment: { limit: 5, windowInSeconds: 60 * 5 },      // 5 payment requests per 5 minutes
  submitReview: { limit: 5, windowInSeconds: 60 * 10 },     // 5 reviews per 10 minutes
  reportItem: { limit: 10, windowInSeconds: 60 * 10 },    // 10 reports per 10 minutes
};

export type RateLimitAction = keyof typeof limits;

/**
 * Checks if a user has exceeded the rate limit for a specific action.
 * Uses Firestore to track request timestamps. This function should be called
 * in server-side environments (API routes, Server Actions) where adminDb is available.
 *
 * @param userId The ID of the user making the request.
 * @param action The action being performed (e.g., 'createMessageThread').
 * @returns {Promise<void>} Resolves if the user is within the limit, otherwise rejects with an error.
 */
export async function checkRateLimit(userId: string, action: RateLimitAction): Promise<void> {
  if (!adminDb) {
    // This might happen if Admin SDK is not configured. Log a warning but don't block.
    // In production, this should be considered a critical configuration error.
    console.warn('Rate Limiter: Firebase Admin DB not initialized. Bypassing rate limit check.');
    return;
  }

  const { limit, windowInSeconds } = limits[action];
  const now = Timestamp.now();
  const windowStart = new Timestamp(now.seconds - windowInSeconds, now.nanoseconds);

  const docId = `${userId}_${action}`;
  const rateLimitRef = adminDb.collection('rateLimits').doc(docId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);

      if (!doc.exists) {
        // First request for this user/action combination, create the document.
        transaction.create(rateLimitRef, {
          requests: [now],
        });
        return; // Allow the request
      }

      const data = doc.data();
      const requestTimestamps: Timestamp[] = data?.requests || [];

      // Filter out timestamps that are older than the current time window.
      const recentTimestamps = requestTimestamps.filter(
        (ts) => ts.seconds >= windowStart.seconds
      );

      if (recentTimestamps.length >= limit) {
        // The user has exceeded the limit.
        throw new Error(`Rate limit exceeded for action "${action}".`);
      }

      // The user is within the limit. Add the new timestamp and update the document.
      recentTimestamps.push(now);
      transaction.update(rateLimitRef, { requests: recentTimestamps });
    });
  } catch (error: any) {
    // Re-throw the specific "Rate limit exceeded" error to be caught by the calling API route/action.
    if (error.message.startsWith('Rate limit exceeded')) {
      throw error;
    }
    
    // For other transaction errors, log them and fail closed (reject the request) for security.
    console.error(`Rate Limiter: Firestore transaction failed for action "${action}" and user "${userId}".`, error);
    throw new Error('Could not verify rate limit status. Please try again.');
  }
}
