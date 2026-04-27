import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const certificateTemplateUrlRegex = /^https?:\/\//i;

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

const optionalTextSchema = z.preprocess(normalizeOptionalText, z.string().optional());

const certificateEnabledSchema = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "on" || normalized === "true" || normalized === "1";
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
}, z.boolean());

const certificateWorkloadHoursSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }

    const parsedNumber = Number(normalized);
    return Number.isFinite(parsedNumber) ? parsedNumber : value;
  }

  return value;
}, z.number({ invalid_type_error: "Carga horaria deve ser numerica." }).int({ message: "Carga horaria deve ser inteira." }).positive({
  message: "Carga horaria deve ser maior que zero.",
}).optional());

const coverImageUrlSchema = z.preprocess(
  normalizeOptionalText,
  z
    .string()
    .refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), {
      message: "Informe uma URL http(s) ou caminho local iniciado por /.",
    })
    .optional(),
);

const baseCourseSchema = z.object({
  slug: z
    .string({ required_error: "Slug e obrigatorio." })
    .trim()
    .min(1, { message: "Slug e obrigatorio." })
    .regex(slugRegex, { message: "Use apenas letras minusculas, numeros e hifens no slug." }),
  title: z
    .string({ required_error: "Titulo e obrigatorio." })
    .trim()
    .min(1, { message: "Titulo e obrigatorio." }),
  description: optionalTextSchema.transform((value) => value ?? null),
  coverImageUrl: coverImageUrlSchema,
  certificateEnabled: certificateEnabledSchema,
  certificateTemplateUrl: z
    .preprocess(
      normalizeOptionalText,
      z
        .string()
        .refine((value) => value.startsWith("/") || certificateTemplateUrlRegex.test(value), {
          message: "Informe uma URL http(s) ou caminho local iniciado por /.",
        })
        .optional(),
    )
    .optional(),
  certificateWorkloadHours: certificateWorkloadHoursSchema.optional(),
  certificateSignerName: optionalTextSchema.optional(),
  certificateSignerRole: optionalTextSchema.optional(),
});

function validateCertificateFields(
  input: {
    certificateEnabled: boolean;
    certificateTemplateUrl?: string;
    certificateWorkloadHours?: number;
    certificateSignerName?: string;
    certificateSignerRole?: string;
  },
  context: z.RefinementCtx,
) {
  if (!input.certificateEnabled) {
    return;
  }

  if (!input.certificateTemplateUrl) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["certificateTemplateUrl"],
      message: "Informe o template do certificado.",
    });
  }

  if (!input.certificateWorkloadHours) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["certificateWorkloadHours"],
      message: "Informe a carga horaria do certificado.",
    });
  }

  if (!input.certificateSignerName) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["certificateSignerName"],
      message: "Informe o nome de quem assina o certificado.",
    });
  }

  if (!input.certificateSignerRole) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["certificateSignerRole"],
      message: "Informe o cargo de quem assina o certificado.",
    });
  }
}

export const createCourseSchema = baseCourseSchema.superRefine((input, context) => {
  validateCertificateFields(input, context);
});

export const updateCourseSchema = baseCourseSchema
  .extend({
    courseId: z.string({ required_error: "Curso e obrigatorio." }).uuid({ message: "Curso invalido." }),
  })
  .superRefine((input, context) => {
    validateCertificateFields(input, context);
  });

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
