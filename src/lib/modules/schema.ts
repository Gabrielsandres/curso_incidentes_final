import { z } from "zod";

export const createModuleSchema = z.object({
  courseId: z
    .string({ required_error: "Curso é obrigatório." })
    .uuid({ message: "Curso inválido." }),
  title: z
    .string({ required_error: "Nome do módulo é obrigatório." })
    .trim()
    .min(1, { message: "Nome do módulo é obrigatório." }),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  position: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") {
        return undefined;
      }

      if (typeof value === "number") {
        return value;
      }

      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    },
    z
      .number({ invalid_type_error: "Ordem deve ser um número válido." })
      .int({ message: "Ordem deve ser um número inteiro." })
      .min(1, { message: "Ordem mínima é 1." })
      .optional(),
  ),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
