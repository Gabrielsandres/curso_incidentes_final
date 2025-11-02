import { z } from "zod";

const optionalString = z
  .string()
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
});

export type InstitutionalLeadInput = z.infer<typeof institutionalLeadSchema>;
