import { z } from "zod";

const passwordMinLength = 6;

export const createAdminUserSchema = z.object({
  fullName: z
    .string({ required_error: "Nome completo e obrigatorio." })
    .trim()
    .min(1, { message: "Nome completo e obrigatorio." }),
  email: z
    .string({ required_error: "Email e obrigatorio." })
    .trim()
    .min(1, { message: "Email e obrigatorio." })
    .email({ message: "Informe um email valido." }),
  password: z
    .string({ required_error: "Senha e obrigatoria." })
    .min(passwordMinLength, { message: `Senha deve ter pelo menos ${passwordMinLength} caracteres.` }),
  role: z.enum(["student", "admin"], { required_error: "Role e obrigatoria." }),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
