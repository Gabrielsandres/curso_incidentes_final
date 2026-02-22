import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const coverImageUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  },
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
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  coverImageUrl: coverImageUrlSchema,
});

export const createCourseSchema = baseCourseSchema;

export const updateCourseSchema = baseCourseSchema.extend({
  courseId: z.string({ required_error: "Curso e obrigatorio." }).uuid({ message: "Curso invalido." }),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
