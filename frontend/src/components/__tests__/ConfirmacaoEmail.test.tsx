import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PaginaVerificarEmail from "@/app/verificar-email/page";
import { AvisoVerificacao } from "@/components/auth/AvisoVerificacao";
import { ConfirmacaoEmail } from "@/components/auth/ConfirmacaoEmail";
import { ErroApi } from "@/lib/api";

const verificarEmail = jest.fn();
const reenviarVerificacao = jest.fn();
let parametros = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useSearchParams: () => parametros,
}));

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: {
      verificarEmail: (token: string) => verificarEmail(token),
      reenviarVerificacao: (email: string) => reenviarVerificacao(email),
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  parametros = new URLSearchParams();
  reenviarVerificacao.mockResolvedValue(undefined);
});

describe("ConfirmacaoEmail", () => {
  it("troca o token da URL pela confirmação", async () => {
    parametros = new URLSearchParams("token=abc123");
    verificarEmail.mockResolvedValue({});

    render(<ConfirmacaoEmail />);

    expect(
      await screen.findByRole("heading", { name: "E-MAIL CONFIRMADO" }),
    ).toBeInTheDocument();
    expect(verificarEmail).toHaveBeenCalledWith("abc123");
  });

  it("leva para o login depois de confirmar", async () => {
    parametros = new URLSearchParams("token=abc123");
    verificarEmail.mockResolvedValue({});

    render(<ConfirmacaoEmail />);

    const link = await screen.findByRole("link", { name: "INICIAR SESSÃO" });
    expect(link).toHaveAttribute("href", "/entrar");
  });

  it("oferece novo link quando o token foi recusado", async () => {
    parametros = new URLSearchParams("token=expirado");
    verificarEmail.mockRejectedValue(
      new ErroApi(400, "validacao", "Link inválido ou expirado.", [
        { field: "token", code: "token_invalido", message: "Link inválido." },
      ]),
    );

    render(<ConfirmacaoEmail />);

    expect(
      await screen.findByRole("heading", { name: "LINK INVÁLIDO" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("E-MAIL")).toBeInTheDocument();
  });

  it("sem token na URL, nem chama a API", () => {
    render(<ConfirmacaoEmail />);

    expect(verificarEmail).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "CONFIRMAR E-MAIL" }),
    ).toBeInTheDocument();
  });

  it("recusa e-mail malformado antes de pedir novo link", async () => {
    const usuario = userEvent.setup();
    render(<ConfirmacaoEmail />);

    await usuario.type(screen.getByLabelText("E-MAIL"), "nao-e-email");
    await usuario.click(screen.getByRole("button", { name: "ENVIAR NOVO LINK" }));

    expect(screen.getByText("E-mail inválido.")).toBeInTheDocument();
    expect(reenviarVerificacao).not.toHaveBeenCalled();
  });
});

describe("AvisoVerificacao", () => {
  it("mostra o endereço para onde o link foi", () => {
    render(<AvisoVerificacao email="novato@exemplo.com" />);

    expect(screen.getByText("novato@exemplo.com")).toBeInTheDocument();
  });

  it("reenvia sem revelar se a conta existe", async () => {
    const usuario = userEvent.setup();
    render(<AvisoVerificacao email="novato@exemplo.com" />);

    await usuario.click(screen.getByRole("button", { name: "REENVIAR E-MAIL" }));

    await waitFor(() =>
      expect(reenviarVerificacao).toHaveBeenCalledWith("novato@exemplo.com"),
    );
    expect(
      screen.getByText(/se houver uma conta pendente com esse endereço/i),
    ).toBeInTheDocument();
  });

  it("trava o botão depois de reenviar", async () => {
    const usuario = userEvent.setup();
    render(<AvisoVerificacao email="novato@exemplo.com" />);

    await usuario.click(screen.getByRole("button", { name: "REENVIAR E-MAIL" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "REENVIAR E-MAIL" }),
      ).toBeDisabled(),
    );
  });

  it("avisa quando o envio do cadastro falhou", () => {
    render(<AvisoVerificacao email="novato@exemplo.com" falhaNoEnvio />);

    expect(
      screen.getByText(/não conseguimos enviar o e-mail agora/i),
    ).toBeInTheDocument();
  });
});

describe("Página de confirmação", () => {
  it("não tem coluna lateral: a info ocupa o card inteiro", async () => {
    parametros = new URLSearchParams("token=abc123");
    verificarEmail.mockResolvedValue({});

    render(<PaginaVerificarEmail />);

    await screen.findByRole("heading", { name: "E-MAIL CONFIRMADO" });
    expect(
      screen.queryByAltText("Ovo do CodeQuest rachando"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Quase lá")).not.toBeInTheDocument();
    expect(screen.queryByText("JÁ CONFIRMOU?")).not.toBeInTheDocument();
  });

  it("ainda leva ao login depois de confirmar", async () => {
    parametros = new URLSearchParams("token=abc123");
    verificarEmail.mockResolvedValue({});

    render(<PaginaVerificarEmail />);

    expect(
      await screen.findByRole("link", { name: "INICIAR SESSÃO" }),
    ).toHaveAttribute("href", "/entrar");
  });
});
