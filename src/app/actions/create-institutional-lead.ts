"use server";

import { captureException } from "@sentry/nextjs";

import { logger } from "@/lib/logger";
import { institutionalLeadSchema } from "@/lib/marketing/institutional-lead-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type InstitutionalLeadFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialInstitutionalLeadState: InstitutionalLeadFormState = {
  success: false,
  message: "",
};

export async function submitInstitutionalLead(
  _prevState: InstitutionalLeadFormState,
  formData: FormData,
): Promise<InstitutionalLeadFormState> {
  const rawInput = {
    organization: formData.get("organization"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    headcount: formData.get("headcount"),
    message: formData.get("message"),
  };

  const parsed = institutionalLeadSchema.safeParse(rawInput);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Revise os dados informados antes de enviar.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("institutional_leads").insert({
      organization: parsed.data.organization,
      contact_name: parsed.data.contactName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      headcount: parsed.data.headcount,
      message: parsed.data.message,
    });

    if (error) {
      logger.error("Falha ao registrar lead institucional", error.message);
      captureException(new Error("Supabase insert error (institutional_leads)"), {
        extra: { message: error.message, code: error.code },
      });
      return {
        success: false,
        message: "N\u00e3o foi poss\u00edvel enviar suas informa\u00e7\u00f5es. Tente novamente.",
      };
    }

    logger.info("Lead institucional registrado", {
      organization: parsed.data.organization,
      email: parsed.data.email,
    });

    return {
      success: true,
      message: "Recebemos suas informa\u00e7\u00f5es! Em at\u00e9 24h \u00fateis entraremos em contato.",
    };
  } catch (error) {
    logger.error(
      "Erro inesperado ao registrar lead institucional",
      error instanceof Error ? error.message : String(error),
    );
    captureException(error);

    return {
      success: false,
      message: "Ocorreu um erro inesperado. Por favor, tente novamente em instantes.",
    };
  }
}
