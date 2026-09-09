import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PainelLogin } from "@/components/auth/PainelLogin";
import { ErroApi } from "@/lib/api";

const login = jest.fn();
const minhasCriaturas = jest.fn();
const reenviarVerificacao = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/api", () => {
  const real = jest.requireActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ErroApi: real.ErroApi,
    api: {
      login: (dados: unknown) => login(dados),
      minhasCriaturas: () => minhasCriaturas(),
      reenviarVerificacao: (email: string) => reenviarVerificacao(email),
    },
  };
});

const SENHA = "trilha-de-python-8";
const OVO = "Ovo do CodeQuest rachando";

beforeEach(() => {
  jest.clearAllMocks();
  reenviarVerificacao.mockResolvedValue(undefined);
  login.mockRejectedValue(
    new ErroApi(400, "validacao", "Confirme seu e-mail antes de entrar.", [
      {
        field: "email",
        code: "email_nao_verificado",
        message: "Confirme seu e-mail antes de entrar.",
      },
    ]),
  );
});

async function tentarEntrar(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText("E-MAIL"), "pendente@exemplo.com");
  await usuario.type(screen.getByLabelText("SENHA"), SENHA);
  await usuario.click(screen.getByRole("button", { name: "INICIAR SESSÃO" }));
}

describe("PainelLogin", () => {
  it("começa com o painel de boas-vindas completo", () => {
    render(<PainelLogin />);

    expect(screen.getByText("Bem-vindo de volta")).toBeInTheDocument();
    expect(screen.getByText("AINDA NÃO TEM CONTA?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CRIAR CONTA" })).toBeInTheDocument();
    expect(screen.getByAltText(OVO)).toBeInTheDocument();
  });

  it("troca o formulário pelo aviso quando o e-mail está pendente", async () => {
    const usuario = userEvent.setup();
    render(<PainelLogin />);

    await tentarEntrar(usuario);

    expect(
      await screen.findByRole("heading", { name: "CONFIRME SEU E-MAIL" }),
    ).toBeInTheDocument();
    expect(screen.getByText("pendente@exemplo.com")).toBeInTheDocument();
    expect(screen.queryByLabelText("SENHA")).not.toBeInTheDocument();
  });

  it("o aviso ocupa o card inteiro: nada da coluna lateral sobra", async () => {
    const usuario = userEvent.setup();
    render(<PainelLogin />);

    await tentarEntrar(usuario);
    await screen.findByRole("heading", { name: "CONFIRME SEU E-MAIL" });

    expect(screen.queryByText("Bem-vindo de volta")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Entre para retomar de onde parou."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("AINDA NÃO TEM CONTA?")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "CRIAR CONTA" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByAltText(OVO)).not.toBeInTheDocument();
  });

  it("reenvia o link direto do login", async () => {
    const usuario = userEvent.setup();
    render(<PainelLogin />);

    await tentarEntrar(usuario);
    await usuario.click(
      await screen.findByRole("button", { name: "REENVIAR E-MAIL" }),
    );

    await waitFor(() =>
      expect(reenviarVerificacao).toHaveBeenCalledWith("pendente@exemplo.com"),
    );
  });

  it("credencial errada não mexe no painel", async () => {
    const usuario = userEvent.setup();
    login.mockRejectedValue(
      new ErroApi(401, "credencial_invalida", "E-mail ou senha incorretos. Se errou várias vezes, espere alguns minutos ou redefina sua senha."),
    );
    render(<PainelLogin />);

    await tentarEntrar(usuario);

    expect(await screen.findByText("E-mail ou senha incorretos. Se errou várias vezes, espere alguns minutos ou redefina sua senha.")).toBeInTheDocument();
    expect(screen.getByText("Bem-vindo de volta")).toBeInTheDocument();
  });
});
