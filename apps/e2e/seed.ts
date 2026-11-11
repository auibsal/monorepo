import globalSetup from "./global-setup";

/**
 * Seeds the journeys' data before the app is built (CI). The build caches
 * what it reads, and the seeded rows bypass the publish path that would
 * revalidate it, so data seeded only after the build would miss a page
 * the build already read (the Events page's current month, for one).
 * global-setup seeds again, idempotently, when the journeys start.
 */
await globalSetup();
