import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

/**
 * Ensures a single IP can only submit 3 manuscripts per hour.
 * Protects the database from automated spam payloads.
 */
export const submissionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
  prefix: '@auibsal/cache:submissions',
});

/**
 * Ensures an IP can only attempt to log in or request OTPs 5 times per 15 minutes.
 * Protects Supabase Auth from brute-force credential stuffing.
 */
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: '@auibsal/cache:auth',
});

// Export the raw redis client just in case you need it for manual caching later
export { redis } from './redis';
