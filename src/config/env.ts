import { z } from 'zod';

const envSchema = z.object({
  APP_BASE_PATH: z.string().default('/'),
  MOCK_API: z.string().optional()
});

export const env = envSchema.parse(process.env);
