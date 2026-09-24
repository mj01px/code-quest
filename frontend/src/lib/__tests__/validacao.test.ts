import {
  EMAIL_MAX,
  SENHA_MAX,
  validarEmail,
  validarSenha,
} from "@/lib/validacao";

describe("validarSenha — política de complexidade", () => {
  const forte = "Trilha-de-python-8";

  it("aceita uma senha com maiúscula, minúscula, número e especial", () => {
    expect(validarSenha(forte)).toBeNull();
  });

  it("cobra letra maiúscula", () => {
    expect(validarSenha("trilha-de-python-8")).toBe(
      "Inclua ao menos uma letra maiúscula.",
    );
  });

  it("cobra letra minúscula", () => {
    expect(validarSenha("TRILHA-DE-PYTHON-8")).toBe(
      "Inclua ao menos uma letra minúscula.",
    );
  });

  it("cobra número", () => {
    expect(validarSenha("Trilha-de-python!")).toBe(
      "Inclua ao menos um número.",
    );
  });

  it("cobra caractere especial", () => {
    expect(validarSenha("Trilhadepython8")).toBe(
      "Inclua ao menos um caractere especial.",
    );
  });

  it("recusa abaixo do mínimo antes de checar composição", () => {
    expect(validarSenha("Aa1!")).toBe("Use pelo menos 8 caracteres.");
  });

  it("recusa acima do teto", () => {
    const gigante = "Aa1!" + "x".repeat(SENHA_MAX);
    expect(validarSenha(gigante)).toBe(`Use no máximo ${SENHA_MAX} caracteres.`);
  });

  it("ainda barra a senha que contém o e-mail/nick", () => {
    expect(validarSenha("Kiuev-python-9", ["kiuev@x.com"])).toBe(
      "A senha não pode conter seu e-mail ou nickname.",
    );
  });
});

describe("validarEmail — teto de tamanho", () => {
  it("aceita um e-mail normal", () => {
    expect(validarEmail("alguem@exemplo.com")).toBeNull();
  });

  it("recusa e-mail acima do teto", () => {
    const local = "a".repeat(EMAIL_MAX);
    expect(validarEmail(`${local}@x.com`)).toBe(
      `Use no máximo ${EMAIL_MAX} caracteres.`,
    );
  });
});
