import { baseConfig } from '@auibsal/config/eslint.config';
import type { Linter } from 'eslint';

const config: Linter.Config[] = [
  ...baseConfig,
];

export default config;
