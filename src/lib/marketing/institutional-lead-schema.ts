import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  });

const utmString = z
  .string()
  .max(255, "Par\u00e2metro UTM n\u00e3o pode exceder 255 caracteres.")
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  });

export const institutionalLeadSchema = z.object({
  organization: z.string().min(2, "Informe o nome da escola ou rede."),
  contactName: z.string().min(2, "Informe o nome do contato."),
  email: z.string().email("Informe um e-mail v\u00e1lido."),
  phone: optionalString,
  headcount: optionalString
    .transform((value) => (value ? Number(value) : null))
    .refine((value) => value === null || Number.isFinite(value), "Informe apenas n\u00fameros."),
  message: optionalString,
  utmSource: utmString,
  utmMedium: utmString,
  utmCampaign: utmString,
});

export type InstitutionalLeadInput = z.infer<typeof institutionalLeadSchema>;
