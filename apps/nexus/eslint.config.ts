import { nextConfig } from '@auibsal/config/eslint.config';
import type { Linter } from 'eslint';

const config: Linter.Config[] = [
  ...nextConfig,
];

export default config;
