/**
 * A standardized logging abstraction.
 * If you eventually scale to use Datadog, Axiom, or Sentry, you only 
 * need to update the logic inside this single file.
 */
export const logger = {
  /**
   * Use for standard operational events (e.g., "Manuscript accepted").
   */
  // biome-ignore lint/suspicious/noExplicitAny: Meta data can be any JSON-serializable object
  info: (message: string, meta?: Record<string, any>) => {
    console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  },

  /**
   * Use for system warnings that don't break the application (e.g., "Rate limit approaching").
   */
  // biome-ignore lint/suspicious/noExplicitAny: Meta data can be any JSON-serializable object
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
  },

  /**
   * Use for critical failures (e.g., "Database connection dropped").
   */
  // biome-ignore lint/suspicious/noExplicitAny: Error objects vary wildly in shape
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? error : '');
    // Future expansion: await sentry.captureException(error);
  },

  /**
   * Use for behavioral business tracking (e.g., "User started dominoes match").
   */
  // biome-ignore lint/suspicious/noExplicitAny: Properties can be any flat JSON object
  track: (eventName: string, properties?: Record<string, any>) => {
    console.log(`[TRACK] Event: ${eventName}`, properties ? JSON.stringify(properties) : '');
    // Future expansion: await posthog.capture({ event: eventName, properties });
  },
};
