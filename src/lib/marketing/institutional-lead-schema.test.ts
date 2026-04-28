import { describe, expect, it } from "vitest";

import { institutionalLeadSchema } from "./institutional-lead-schema";

const baseValid = {
  organization: "Escola Nova",
  contactName: "Maria Silva",
  email: "maria@escola.edu.br",
};

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

describe("institutionalLeadSchema — UTM fields", () => {
  it("aceita todos os 3 campos UTM presentes", () => {
    const result = institutionalLeadSchema.safeParse({
      ...baseValid,
      utmSource: "linkedin",
      utmMedium: "post",
      utmCampaign: "mdhe-q2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.utmSource).toBe("linkedin");
      expect(result.data.utmMedium).toBe("post");
      expect(result.data.utmCampaign).toBe("mdhe-q2");
    }
  });

  it("aceita objeto sem campos UTM — campos ficam null", () => {
    const result = institutionalLeadSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.utmSource).toBeNull();
      expect(result.data.utmMedium).toBeNull();
      expect(result.data.utmCampaign).toBeNull();
    }
  });

  it("rejeita utmSource com mais de 255 caracteres", () => {
    const result = institutionalLeadSchema.safeParse({
      ...baseValid,
      utmSource: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejeita utmMedium com mais de 255 caracteres", () => {
    const result = institutionalLeadSchema.safeParse({
      ...baseValid,
      utmMedium: "b".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejeita utmCampaign com mais de 255 caracteres", () => {
    const result = institutionalLeadSchema.safeParse({
      ...baseValid,
      utmCampaign: "c".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("transforma utmSource string vazia em null", () => {
    const result = institutionalLeadSchema.safeParse({
      ...baseValid,
      utmSource: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.utmSource).toBeNull();
    }
  });

  it("mantém validação dos campos existentes (regressão)", () => {
    const result = institutionalLeadSchema.safeParse({ organization: "X", email: "invalid" });
    expect(result.success).toBe(false);
  });
});
