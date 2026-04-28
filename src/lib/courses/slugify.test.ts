import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("converte texto ASCII simples para slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("remove diacriticos pt-BR", () => {
    expect(slugify("Gestão de Incidentes")).toBe("gestao-de-incidentes");
  });

  it("remove caracteres especiais e normaliza espacos multiplos", () => {
    expect(slugify("  Curso   de  NR-35  ")).toBe("curso-de-nr-35");
  });

  it("remove caracteres nao alfanumericos mantendo hifens internos validos", () => {
    expect(slugify("Ação & Reação! (2024)")).toBe("acao-reacao-2024");
  });

  it("retorna string vazia para input vazio", () => {
    expect(slugify("")).toBe("");
  });

  it("retorna string vazia quando input contem apenas caracteres especiais", () => {
    expect(slugify("---")).toBe("");
  });

  it("retorna unico caractere valido", () => {
    expect(slugify("a")).toBe("a");
  });
});
