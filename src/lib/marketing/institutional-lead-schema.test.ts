import { describe, expect, it } from "vitest";

import { institutionalLeadSchema } from "./institutional-lead-schema";

describe("institutionalLeadSchema", () => {
  it("valida dado completo com campos opcionais", () => {
    const result = institutionalLeadSchema.safeParse({
      organization: "Escola Modelo",
      contactName: "Ana Souza",
      email: "ana@escola.com",
      phone: "(61) 99999-0000",
      headcount: "500",
      message: "Precisamos de apoio para plano de evacuação.",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.headcount).toBe(500);
    }
  });

  it("permite campos opcionais vazios", () => {
    const result = institutionalLeadSchema.safeParse({
      organization: "Rede Segura",
      contactName: "Marcos Oliveira",
      email: "contato@redesegura.com",
      phone: "",
      headcount: "",
      message: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeNull();
      expect(result.data.headcount).toBeNull();
      expect(result.data.message).toBeNull();
    }
  });

  it("retorna erro para email invalido", () => {
    const result = institutionalLeadSchema.safeParse({
      organization: "Escola Horizonte",
      contactName: "Paula Prado",
      email: "email-invalido",
      phone: null,
      headcount: "",
      message: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it("retorna erro para headcount invalido", () => {
    const result = institutionalLeadSchema.safeParse({
      organization: "Escola Horizonte",
      contactName: "Paula Prado",
      email: "contato@escola.com",
      phone: null,
      headcount: "invalid",
      message: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.headcount).toBeDefined();
    }
  });
});
