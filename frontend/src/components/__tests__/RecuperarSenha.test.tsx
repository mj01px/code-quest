import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FormularioRedefinirSenha } from "@/components/auth/FormularioRedefinirSenha";
import { FormularioSenhaEsquecida } from "@/components/auth/FormularioSenhaEsquecida";
import { ErroApi } from "@/lib/api";

const senhaEsquecida = jest.fn();
const redefinirSenha = jest.fn();
let parametros = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useSearchParams: () => parametros,
}));

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: {
      senhaEsquecida: (email: string) => senhaEsquecida(email),
      redefinirSenha: (dados: unknown) => redefinirSenha(dados),
    },
  };
});

const SENHA = "outra-trilha-de-java-7";

beforeEach(() => {
  jest.clearAllMocks();
  parametros = new URLSearchParams();
  senhaEsquecida.mockResolvedValue(undefined);
  redefinirSenha.mockResolvedValue(undefined);
});

describe("FormularioSenhaEsquecida", () => {
  it("pede o link e responde sem revelar se a conta existe", async () => {
    const usuario = userEvent.setup();
    render(<FormularioSenhaEsquecida />);

    await usuario.type(screen.getByLabelText("E-MAIL"), "alguem@exemplo.com");
    await usuario.click(screen.getByRole("button", { name: "ENVIAR LINK" }));

    await waitFor(() =>
      expect(senhaEsquecida).toHaveBeenCalledWith("alguem@exemplo.com"),
    );
    expect(
      await screen.findByText(/se houver uma conta com/i),
    ).toBeInTheDocument();
  });

  it("não chama a API com e-mail malformado", async () => {
    const usuario = userEvent.setup();
    render(<FormularioSenhaEsquecida />);

    await usuario.type(screen.getByLabelText("E-MAIL"), "nao-e-email");
    await usuario.click(screen.getByRole("button", { name: "ENVIAR LINK" }));

    expect(screen.getByText("E-mail inválido.")).toBeInTheDocument();
    expect(senhaEsquecida).not.toHaveBeenCalled();
  });

  it("avisa quando a API não responde", async () => {
    const usuario = userEvent.setup();
    senhaEsquecida.mockRejectedValue(new Error("offline"));
    render(<FormularioSenhaEsquecida />);

    await usuario.type(screen.getByLabelText("E-MAIL"), "alguem@exemplo.com");
    await usuario.click(screen.getByRole("button", { name: "ENVIAR LINK" }));

    expect(
      await screen.findByText(/não foi possível pedir agora/i),
    ).toBeInTheDocument();
  });
});

describe("FormularioRedefinirSenha", () => {
  async function preencher(usuario: ReturnType<typeof userEvent.setup>) {
    await usuario.type(screen.getByLabelText("NOVA SENHA"), SENHA);
    await usuario.type(screen.getByLabelText("CONFIRMAR SENHA"), SENHA);
    await usuario.click(screen.getByRole("button", { name: "TROCAR SENHA" }));
  }

  it("troca a senha mandando o token da URL", async () => {
    const usuario = userEvent.setup();
    parametros = new URLSearchParams("token=abc123");
    render(<FormularioRedefinirSenha />);

    await preencher(usuario);

    await waitFor(() =>
      expect(redefinirSenha).toHaveBeenCalledWith({
        token: "abc123",
        senha: SENHA,
        senha_confirmacao: SENHA,
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "SENHA TROCADA" }),
    ).toBeInTheDocument();
  });

  it("avisa que as outras sessões caíram", async () => {
    const usuario = userEvent.setup();
    parametros = new URLSearchParams("token=abc123");
    render(<FormularioRedefinirSenha />);

    await preencher(usuario);

    expect(
      await screen.findByText(/sessões foram encerradas por segurança/i),
    ).toBeInTheDocument();
  });

  it("sem token na URL, nem mostra o formulário", () => {
    render(<FormularioRedefinirSenha />);

    expect(
      screen.getByRole("heading", { name: "LINK INCOMPLETO" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("NOVA SENHA")).not.toBeInTheDocument();
  });

  it("recusa confirmação diferente antes de chamar a API", async () => {
    const usuario = userEvent.setup();
    parametros = new URLSearchParams("token=abc123");
    render(<FormularioRedefinirSenha />);

    await usuario.type(screen.getByLabelText("NOVA SENHA"), SENHA);
    await usuario.type(screen.getByLabelText("CONFIRMAR SENHA"), "outra-coisa-9");
    await usuario.click(screen.getByRole("button", { name: "TROCAR SENHA" }));

    expect(screen.getByText("As senhas não conferem.")).toBeInTheDocument();
    expect(redefinirSenha).not.toHaveBeenCalled();
  });

  it("token recusado vira aviso com atalho para pedir outro", async () => {
    const usuario = userEvent.setup();
    parametros = new URLSearchParams("token=expirado");
    redefinirSenha.mockRejectedValue(
      new ErroApi(400, "validacao", "Link inválido, expirado ou já usado.", [
        {
          field: "token",
          code: "token_invalido",
          message: "Link inválido, expirado ou já usado.",
        },
      ]),
    );
    render(<FormularioRedefinirSenha />);

    await preencher(usuario);

    expect(
      await screen.findByText("Link inválido, expirado ou já usado."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "PEDIR NOVO LINK" }),
    ).toHaveAttribute("href", "/recuperar-senha");
  });

  it("senha fraca recusada pelo servidor aparece no campo", async () => {
    const usuario = userEvent.setup();
    parametros = new URLSearchParams("token=abc123");
    redefinirSenha.mockRejectedValue(
      new ErroApi(400, "validacao", "Senha fraca.", [
        {
          field: "senha",
          code: "password_too_common",
          message: "Esta senha é muito comum.",
        },
      ]),
    );
    render(<FormularioRedefinirSenha />);

    await preencher(usuario);

    expect(
      await screen.findByText("Esta senha é muito comum."),
    ).toBeInTheDocument();
  });
});
