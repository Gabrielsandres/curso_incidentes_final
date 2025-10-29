"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginActionState = {
  error?: string;
};

export async function loginAction(prevState: LoginActionState | undefined, formData: FormData): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Dados invalidos. Verifique email e senha informados." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: "Nao foi possivel entrar. Confirme suas credenciais e tente novamente.",
    };
  }

  const redirectToRaw = formData.get("redirectTo");
  const redirectTo =
    typeof redirectToRaw === "string" && redirectToRaw.startsWith("/") && !redirectToRaw.startsWith("//")
      ? redirectToRaw
      : "/dashboard";

  redirect(redirectTo);
}
