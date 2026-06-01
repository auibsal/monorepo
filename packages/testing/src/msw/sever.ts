import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Used in Vitest (Node environment)
export const server = setupServer(...handlers);

// Exported for Playwright/Storybook (Browser environment)
export { handlers };
