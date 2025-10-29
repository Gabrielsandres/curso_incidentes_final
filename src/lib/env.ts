import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
});

const serverSchema = clientSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

type ServerSchema = z.infer<typeof serverSchema>;

let cachedEnv: ServerSchema | null = null;

export function getEnv(): ServerSchema {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
    throw new Error("Missing or invalid environment variables. Check your .env configuration.");
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getClientEnv() {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    throw new Error("Client environment variables are missing or invalid. Check NEXT_PUBLIC_SUPABASE_* values.");
  }

  return parsed.data;
}

export function resetEnvCache() {
  cachedEnv = null;
}
