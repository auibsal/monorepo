import sharedConfig from '@auibsal/config/eslint.config';
import type { Linter } from 'eslint';

const config: Linter.Config[] = [
  ...sharedConfig,
  // You can safely inject web-specific or nexus-specific overrides below
];

export default config;
