import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Used in Vitest (Node environment)
/**
 * server
 *
 * @description Standardized execution for server.
 */
export const server = setupServer(...handlers);

// Exported for Playwright/Storybook (Browser environment)
export { handlers };
