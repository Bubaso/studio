
import { z } from 'zod';

const clientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional().default(''),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_APP_URL: z.string().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
});

const serverSchema = z.object({
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional().default(''),
  PAYTECH_API_KEY: z.string().optional().default(''),
  PAYTECH_API_SECRET: z.string().optional().default(''),
  GOOGLE_API_KEY: z.string().optional(),
});

const isServer = typeof window === 'undefined';

// On the server, we validate both server and client variables.
// On the client, we only validate client variables.
const envSchema = isServer ? clientSchema.merge(serverSchema) : clientSchema;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
  );
  throw new Error('Invalid environment variables. Please check your .env file.');
}

export const env = parsed.data;
