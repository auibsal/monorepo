import { Client } from '@upstash/qstash';
import { env } from '@auibsal/env';

export const qstashClient = new Client({
  token: env.QSTASH_TOKEN,
});
