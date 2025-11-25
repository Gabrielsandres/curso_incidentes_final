import { z } from "zod";

/* -------------------------------------------------------
   SCHEMA DO CLIENTE (somente o ESSENCIAL é obrigatório)
-------------------------------------------------------- */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL válida.",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: "NEXT_PUBLIC_SUPABASE_ANON_KEY não pode estar vazia.",
  }),

  // Pode ser opcional, com fallback automático
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),

  // Como você ainda NÃO configurou checkouts, NÃO validar como URL
  NEXT_PUBLIC_CHECKOUT_URL_ESSENCIAL: z.string().optional(),
  NEXT_PUBLIC_CHECKOUT_URL_PRO: z.string().optional(),
  NEXT_PUBLIC_CHECKOUT_URL_INSTITUCIONAL: z.string().optional(),
});

/* -------------------------------------------------------
   SCHEMA DO SERVIDOR (nada obrigatório no dev)
-------------------------------------------------------- */

const serverSchema = clientSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

/* -------------------------------------------------------
   CACHE DE ENV
-------------------------------------------------------- */

type ServerSchema = z.infer<typeof serverSchema>;
let cachedEnv: ServerSchema | null = null;

/* -------------------------------------------------------
   ENV DO SERVIDOR
-------------------------------------------------------- */

export function getEnv(): ServerSchema {
  if (cachedEnv) return cachedEnv;

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Erro nas variáveis de ambiente (server):",
      parsed.error.flatten().fieldErrors
    );
    throw new Error(
      "Missing or invalid environment variables. Check your .env configuration."
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/* -------------------------------------------------------
   ENV DO CLIENTE (usado pelo Supabase Browser Client)
-------------------------------------------------------- */

export function getClientEnv() {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CHECKOUT_URL_ESSENCIAL:
      process.env.NEXT_PUBLIC_CHECKOUT_URL_ESSENCIAL,
    NEXT_PUBLIC_CHECKOUT_URL_PRO: process.env.NEXT_PUBLIC_CHECKOUT_URL_PRO,
    NEXT_PUBLIC_CHECKOUT_URL_INSTITUCIONAL:
      process.env.NEXT_PUBLIC_CHECKOUT_URL_INSTITUCIONAL,
  });

  if (!parsed.success) {
    console.error(
      "❌ Erro nas variáveis de ambiente (client):",
      parsed.error.flatten().fieldErrors
    );
    throw new Error(
      "Client environment variables are missing or invalid. Check NEXT_PUBLIC_SUPABASE_* values."
    );
  }

  return parsed.data;
}

/* -------------------------------------------------------
   Função para reset do cache
-------------------------------------------------------- */

export function resetEnvCache() {
  cachedEnv = null;
}
