import type { Linter } from 'eslint';

import { nextConfig } from '@auibsal/config/eslint.config';

const config: Linter.Config[] = [...nextConfig];

export default config;
